/**
 * TasteWheelCanvas — the taste wheel's wedges painted as watercolor with Skia. Each wedge,
 * clipped to its organic outline, gets a light wash of its colour, then a dark wash shown only
 * where its texture holds pigment (the texture turns with the wedge), then a darker tide line
 * along its edge. When one wedge is selected it grows and the others fade; under Reduce Motion
 * the change is drawn without motion. It only paints: taps are handled above it.
 */
import { useEffect, useRef } from "react";
import { Canvas, Fill, Group, Image, Path, Rect, useImage, vec, type SkImage } from "@shopify/react-native-skia";
import { Easing, useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";
import { TASTE_WEDGE_WASHES } from "@/shared/profileArt";
import { TIDE_OPACITY, tideWidth, wedgeLook, wedgeOutline, type WheelWedge } from "./tasteWheelGeometry";
import { darkWash, lightWash } from "./tasteWheelPalette";

const SELECT_MS = 220;

export interface TasteWheelCanvasProps {
  size: number;
  wedges: WheelWedge[];
  /** One colour per wedge, in the same order. */
  colors: string[];
  selectedValue: string | null;
  reduceMotion: boolean;
}

export function TasteWheelCanvas({ size, wedges, colors, selectedValue, reduceMotion }: TasteWheelCanvasProps) {
  const washes = [useImage(TASTE_WEDGE_WASHES[0]), useImage(TASTE_WEDGE_WASHES[1]), useImage(TASTE_WEDGE_WASHES[2])];
  return (
    <Canvas testID="taste-wheel-canvas" pointerEvents="none" style={{ width: size, height: size }}>
      {wedges.map((wedge, index) => (
        <WashWedge
          key={shapeKey(wedge)}
          wedge={wedge}
          color={colors[index]!}
          wash={washes[wedge.variant - 1] ?? null}
          selected={selectedValue === wedge.slice.value}
          anySelected={selectedValue !== null}
          reduceMotion={reduceMotion}
        />
      ))}
    </Canvas>
  );
}

/**
 * On iOS and Android a derived value ignores its dependencies and keeps the shape it first saw,
 * so a wedge whose shape changes (wheel size, score) is mounted again instead.
 */
function shapeKey({ key, shape }: WheelWedge): string {
  return `${key}:${shape.size}:${shape.inner.toFixed(2)}:${shape.outer.toFixed(2)}`;
}

interface WashWedgeProps {
  wedge: WheelWedge;
  color: string;
  wash: SkImage | null;
  selected: boolean;
  anySelected: boolean;
  reduceMotion: boolean;
}

function WashWedge({ wedge, color, wash, selected, anySelected, reduceMotion }: WashWedgeProps) {
  const look = wedgeLook(selected, anySelected);
  const opacity = useSharedValue(look.opacity);
  const grow = useSharedValue(look.grow);
  const shown = useRef(look);

  useEffect(() => {
    const was = shown.current;
    if (was.opacity === look.opacity && was.grow === look.grow) return;
    shown.current = look;
    if (reduceMotion) {
      opacity.value = look.opacity;
      grow.value = look.grow;
      return;
    }
    const timing = { duration: SELECT_MS, easing: Easing.out(Easing.cubic) };
    opacity.value = withTiming(look.opacity, timing);
    grow.value = withTiming(look.grow, timing);
  }, [look, opacity, grow, reduceMotion]);

  const { shape, texture, mid } = wedge;
  const outline = useDerivedValue(() => wedgeOutline(shape, grow.value));
  const light = lightWash(color);
  const dark = darkWash(color);

  return (
    <Group opacity={opacity}>
      <Group clip={outline}>
        <Fill color={light} />
        <Group layer>
          <Group transform={[{ rotate: mid }]} origin={vec(shape.center, shape.center)}>
            <Image image={wash} {...texture} fit="fill" />
          </Group>
          <Rect x={0} y={0} width={shape.size} height={shape.size} color={dark} blendMode="srcIn" />
        </Group>
        <Path path={outline} style="stroke" strokeWidth={tideWidth(shape.size)} color={dark} opacity={TIDE_OPACITY} />
      </Group>
    </Group>
  );
}

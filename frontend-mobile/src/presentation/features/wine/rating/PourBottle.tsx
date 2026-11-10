/**
 * The bottle of the pour control: the empty glass, the wine still in it (cut at a level surface,
 * so it empties as the glasses fill), and the uncorking of the AI profile scene.
 */
import { Circle, Group, Image, Paint, Shadow, Skia, useImage } from "@shopify/react-native-skia";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { UNCORK_ART, type BottleArt } from "./ratingArt";
import { corkBox, uncorkScene, wineSurfaceY, type PourLayout } from "./pourGeometry";

/** Where the bottle is drawn: centre on the canvas and angle in degrees. */
export interface BottlePlace {
  x: number;
  y: number;
  rotate: number;
}

/** Foam at the lip of a sparkling bottle: offset from the centre and size, in stage units. */
const FOAM = [[-4, 7], [3.5, 8], [0, 10], [-2.5, 6.5], [4.5, 6], [1, 7.5]] as const;
/** Width of the cork on the AI scene stage, which the uncorking motion is measured in. */
const STAGE_CORK_WIDTH = { still: 12, sparkling: 16 } as const;
/** The corkscrew is painted at this share of its pixels on that stage, its tip 110 px from its left. */
const SCREW_SCALE = 0.17;
const SCREW_TIP = 110;
const WISP_SCALE = 0.2;

interface PourBottleProps {
  layout: PourLayout;
  bottle: BottleArt;
  place: SharedValue<BottlePlace>;
  /** 1 while the bottle stands beside the glasses, 0 while it is held over them. */
  stand: SharedValue<number>;
  /** 0 corked, 1 open: the progress of the uncorking. */
  uncork: SharedValue<number>;
  /** The score poured so far, 0..5; the bottle holds what is left. */
  level: SharedValue<number>;
  /** Casts its shadow on the card; off for the see-through demo bottle, where it reads as haze. */
  shadow?: boolean;
}

export function PourBottle({ layout, bottle, place, stand, uncork, level, shadow = true }: PourBottleProps) {
  const fullImage = useImage(bottle.source);
  const emptyImage = useImage(bottle.empty);
  const corkImage = useImage(bottle.cork.source);
  const screwImage = useImage(UNCORK_ART.corkscrew.source);
  const cageImage = useImage(UNCORK_ART.cage.source);
  const wispImage = useImage(UNCORK_ART.wisp.source);

  const kind = bottle.cork.kind;
  const cork = corkBox(layout, bottle);
  const scale = cork.width / STAGE_CORK_WIDTH[kind];
  const lipX = cork.x + cork.width / 2;
  const lipY = (bottle.lip[1] / bottle.height - 0.5) * layout.bottleHeight;
  const corkMidY = cork.y + cork.height / 2;
  const screw = {
    width: UNCORK_ART.corkscrew.width * SCREW_SCALE * scale,
    height: UNCORK_ART.corkscrew.height * SCREW_SCALE * scale,
  };
  const cage = {
    width: (cork.width * UNCORK_ART.cage.width) / bottle.cork.width,
    height: (cork.width * UNCORK_ART.cage.height) / bottle.cork.width,
  };
  const wisp = { width: UNCORK_ART.wisp.width * WISP_SCALE * scale, height: UNCORK_ART.wisp.height * WISP_SCALE * scale };
  // Whatever is below the lip is inside the neck.
  const aboveLip = Skia.XYWHRect(-layout.width, lipY - layout.height * 2, layout.width * 2, layout.height * 2);

  const transform = useDerivedValue(() => [
    { translateX: place.value.x },
    { translateY: place.value.y },
    { rotate: (place.value.rotate * Math.PI) / 180 },
  ]);
  const wineClip = useDerivedValue(() => {
    const p = place.value;
    const y = wineSurfaceY(p.x, p.y, p.rotate, 1 - level.value / 5, layout, bottle);
    return Skia.XYWHRect(-layout.width, y, layout.width * 3, layout.height * 2);
  });
  // Standing, the bottle casts a short contact shadow; lifted, a longer, softer one.
  const shadowDy = useDerivedValue(() => 1.5 + 6.5 * (1 - stand.value));
  const shadowBlur = useDerivedValue(() => 2 + 8 * (1 - stand.value));

  const scene = useDerivedValue(() => uncorkScene(uncork.value, kind, scale));
  const corkTransform = useDerivedValue(() => {
    const c = scene.value.cork;
    return [
      { translateX: lipX + c.dx }, { translateY: corkMidY + c.dy }, { rotate: (c.rotate * Math.PI) / 180 },
      { translateX: -lipX }, { translateY: -corkMidY },
    ];
  });
  const corkOpacity = useDerivedValue(() => scene.value.cork.opacity);
  const screwTransform = useDerivedValue(() => {
    const s = scene.value.screw;
    return [{ translateX: lipX }, { translateY: s.dy }, { scaleX: s.scaleX }, { translateX: -lipX }];
  });
  const screwOpacity = useDerivedValue(() => scene.value.screw.opacity);
  const cageMidY = cork.y - scale + cage.height / 2;
  const cageTransform = useDerivedValue(() => {
    const c = scene.value.cage;
    return [
      { translateX: lipX + c.dx }, { translateY: cageMidY + c.dy }, { rotate: (c.rotate * Math.PI) / 180 },
      { translateX: -lipX }, { translateY: -cageMidY },
    ];
  });
  const cageOpacity = useDerivedValue(() => scene.value.cage.opacity);
  const wispTransform = useDerivedValue(() => [{ translateY: scene.value.wisp.dy }]);
  const wispOpacity = useDerivedValue(() => scene.value.wisp.opacity);
  const foamY = useDerivedValue(() => lipY + scene.value.foam.dy);
  const foamOpacity = useDerivedValue(() => scene.value.foam.opacity);

  if (!fullImage || !emptyImage || !corkImage || !screwImage || !cageImage || !wispImage) return null;
  const box = { x: -layout.bottleWidth / 2, y: -layout.bottleHeight / 2, width: layout.bottleWidth, height: layout.bottleHeight };
  return (
    <Group layer={shadow ? <Paint><Shadow dx={0} dy={shadowDy} blur={shadowBlur} color="rgba(0,0,0,0.28)" /></Paint> : undefined}>
      <Group transform={transform}>
        <Image image={emptyImage} {...box} fit="fill" />
      </Group>
      <Group clip={wineClip}>
        <Group transform={transform}>
          <Image image={fullImage} {...box} fit="fill" />
        </Group>
      </Group>
      <Group transform={transform}>
        {kind === "still" && (
          <Group transform={wispTransform} opacity={wispOpacity}>
            <Image image={wispImage} x={lipX - wisp.width / 2} y={lipY - 26 * scale} width={wisp.width} height={wisp.height} fit="fill" />
          </Group>
        )}
        <Group clip={aboveLip}>
          <Group transform={corkTransform} opacity={corkOpacity}>
            <Image image={corkImage} x={cork.x} y={cork.y} width={cork.width} height={cork.height} fit="fill" />
          </Group>
          {kind === "still" && (
            <Group transform={screwTransform} opacity={screwOpacity}>
              <Image image={screwImage} x={lipX - SCREW_TIP * SCREW_SCALE * scale} y={cork.y - 2 * scale - screw.height}
                width={screw.width} height={screw.height} fit="fill" />
            </Group>
          )}
        </Group>
        {kind === "sparkling" && (
          <>
            <Group transform={cageTransform} opacity={cageOpacity}>
              <Image image={cageImage} x={lipX - cage.width / 2} y={cork.y - scale} width={cage.width} height={cage.height} fit="fill" />
            </Group>
            {FOAM.map(([dx, size]) => (
              <FoamBubble key={dx} x={lipX + dx * scale} y={foamY} size={size * scale} scene={scene} opacity={foamOpacity} />
            ))}
          </>
        )}
      </Group>
    </Group>
  );
}

function FoamBubble({ x, y, size, scene, opacity }: {
  x: number;
  y: SharedValue<number>;
  size: number;
  scene: SharedValue<ReturnType<typeof uncorkScene>>;
  opacity: SharedValue<number>;
}) {
  const r = useDerivedValue(() => (size / 2) * scene.value.foam.scaleX);
  return <Circle cx={x} cy={y} r={r} color="rgba(255,253,240,0.92)" opacity={opacity} />;
}

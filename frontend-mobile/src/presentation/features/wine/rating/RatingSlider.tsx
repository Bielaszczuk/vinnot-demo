/**
 * The slider bar under the pour control: the same watercolor glass as the five above slides along
 * a pill-shaped track and fills or empties with the score, the track filling behind it in a
 * gradient of the wine's colour. It sets the score with the same moves as the bottle and follows
 * the bottle, so either one drives the other. During the drag demo a see-through glass glides
 * along it too. Screen readers use the pour control, so the bar is hidden from them.
 */
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Canvas, Group, Image, LinearGradient, RoundedRect, Skia, vec, type SkImage } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { snapRating } from "@/domain/wine/ratingGlasses";
import { lightTokens } from "@/shared/theme/tokens";
import type { GlassArt } from "./ratingArt";
import { ratingFromSliderX, sliderX, wineBoxes, type SliderLayout } from "./pourGeometry";

/** Same strength as the demo's faint glasses. */
const GHOST_OPACITY = 0.38;

interface RatingSliderProps {
  /** Live score, shared with the bottle above. */
  score: SharedValue<number>;
  /** Level the drag demo has poured, 0..5. */
  ghostLevel: SharedValue<number>;
  demo: boolean;
  slider: SliderLayout;
  glass: GlassArt;
  /** Deepest hue and rim of the wine, left to right. */
  gradient: readonly [string, string];
  glassImage: SkImage | null;
  wineImage: SkImage | null;
  disabled: boolean;
  /** Any touch on the bar counts as touching the control. */
  onTouch: () => void;
  /** Worklet that moves the bottle and glasses to a snapped score. */
  onMove: (next: number) => void;
  /** Called with the score when the finger lifts or on a tap. */
  onCommit: (next: number) => void;
}

/** The wine of a glass drawn at `left`/`top`, uncovered up to `fill` (0..1), with a lit surface. */
export function GlassWine({ left, top, width, height, glass, wine, fill }: {
  left: number;
  top: number;
  width: number;
  height: number;
  glass: GlassArt;
  wine: SkImage;
  fill: SharedValue<number>;
}) {
  const box = glass.box;
  const boxes = useDerivedValue(() => wineBoxes(left, top, width, height, box, fill.value));
  const wineClip = useDerivedValue(() => {
    const { x, y, width: w, height: h } = boxes.value.wine;
    return Skia.XYWHRect(x, y, w, h);
  });
  const surfaceClip = useDerivedValue(() => {
    const { x, y, width: w, height: h } = boxes.value.surface;
    return Skia.XYWHRect(x, y, w, h);
  });
  return (
    <>
      <Group clip={wineClip}>
        <Image image={wine} x={left} y={top} width={width} height={height} fit="fill" />
      </Group>
      <Group clip={surfaceClip}>
        <Image image={wine} x={left} y={top} width={width} height={height} fit="fill" blendMode="screen" opacity={0.75} />
      </Group>
    </>
  );
}

/** The glass on the bar, centred on `x` and filled by `fill` (0..1), drawn like the glasses above. */
export function SliderThumb({ x, fill, slider, glass, glassImage, wineImage }: {
  x: SharedValue<number>;
  fill: SharedValue<number>;
  slider: SliderLayout;
  glass: GlassArt;
  glassImage: SkImage;
  wineImage: SkImage;
}) {
  const { glassWidth: width, glassHeight: height, glassTop: top } = slider;
  const transform = useDerivedValue(() => [{ translateX: x.value - width / 2 }]);
  return (
    <Group transform={transform}>
      <Image image={glassImage} x={0} y={top} width={width} height={height} fit="fill" />
      <GlassWine left={0} top={top} width={width} height={height} glass={glass} wine={wineImage} fill={fill} />
    </Group>
  );
}

/** Filled part of the track, from its start to the glass; nothing while unrated. */
function TrackFill({ x, score, slider, gradient }: {
  x: SharedValue<number>;
  score: SharedValue<number>;
  slider: SliderLayout;
  gradient: readonly [string, string];
}) {
  const width = useDerivedValue(() => (score.value > 0 ? x.value - slider.start : 0));
  const end = useDerivedValue(() => vec(slider.start + Math.max(1, width.value), 0));
  return (
    <RoundedRect x={slider.start} y={slider.trackY} width={width} height={slider.trackHeight} r={slider.trackHeight / 2}>
      <LinearGradient start={vec(slider.start, 0)} end={end} colors={[...gradient]} />
    </RoundedRect>
  );
}

/** The drag demo on the bar: a see-through glass and track fill following the demo's pour. */
export function SliderGhost({ level, slider, glass, gradient, glassImage, wineImage }: {
  level: SharedValue<number>;
  slider: SliderLayout;
  glass: GlassArt;
  gradient: readonly [string, string];
  glassImage: SkImage | null;
  wineImage: SkImage | null;
}) {
  const x = useDerivedValue(() => sliderX(level.value, slider));
  const fill = useDerivedValue(() => Math.min(1, Math.max(0, level.value / 5)));
  return (
    <Group opacity={GHOST_OPACITY}>
      <TrackFill x={x} score={level} slider={slider} gradient={gradient} />
      {glassImage && wineImage && (
        <SliderThumb x={x} fill={fill} slider={slider} glass={glass} glassImage={glassImage} wineImage={wineImage} />
      )}
    </Group>
  );
}

export function RatingSlider({
  score, ghostLevel, demo, slider, glass, gradient, glassImage, wineImage, disabled, onTouch, onMove, onCommit,
}: RatingSliderProps) {
  const x = useDerivedValue(() => sliderX(score.value, slider));
  const fill = useDerivedValue(() => Math.min(1, Math.max(0, score.value / 5)));

  const gesture = useMemo(() => {
    const fromX = (at: number) => {
      "worklet";
      return snapRating(ratingFromSliderX(at, slider));
    };
    const pan = Gesture.Pan()
      .enabled(!disabled)
      .activeOffsetX([-4, 4])
      .failOffsetY([-14, 14])
      .onBegin(() => scheduleOnRN(onTouch))
      .onStart((event) => onMove(fromX(event.x)))
      .onUpdate((event) => onMove(fromX(event.x)))
      .onEnd(() => scheduleOnRN(onCommit, score.value))
      .withTestId("rating-slider-pan");
    const tap = Gesture.Tap()
      .enabled(!disabled)
      .onBegin(() => scheduleOnRN(onTouch))
      .onEnd((event) => {
        onMove(fromX(event.x));
        scheduleOnRN(onCommit, score.value);
      })
      .withTestId("rating-slider-tap");
    return Gesture.Race(pan, tap);
    // The callbacks read refs and shared values, so the gesture only changes with the bar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, slider]);

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[{ width: slider.width, height: slider.height }, disabled && styles.disabled]}
        testID="rating-slider"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Canvas style={{ width: slider.width, height: slider.height }} pointerEvents="none">
          <RoundedRect x={slider.start} y={slider.trackY} width={slider.end - slider.start} height={slider.trackHeight}
            r={slider.trackHeight / 2} color={lightTokens.borderSoft} />
          {demo && (
            <SliderGhost level={ghostLevel} slider={slider} glass={glass} gradient={gradient}
              glassImage={glassImage} wineImage={wineImage} />
          )}
          <TrackFill x={x} score={score} slider={slider} gradient={gradient} />
          {glassImage && wineImage && (
            <SliderThumb x={x} fill={fill} slider={slider} glass={glass} glassImage={glassImage} wineImage={wineImage} />
          )}
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.55 },
});

/**
 * The pour control (S8): a bottle over five glasses follows the finger. Opening unrated, it
 * stands corked beside the glasses and uncorks by itself as the AI profile scene does, so the
 * first rating only lifts it and pours in step with the finger (a touch during the uncorking
 * ends it at once). While the score rises it tilts and pours a curved stream of the wine's colour
 * into the glass being filled, and the bottle empties; while it falls it lifts, the glasses empty
 * and the bottle fills again. At 5.0 it is back on its stand, open and empty. 0.1–5.0 in steps
 * of 0.1. Under the glasses a slider bar, its thumb a small glass that fills as the score rises,
 * sets the same score and follows the bottle: either one drives the other; the score reads right
 * below its end. Until the control is touched a line under the bar explains the drag. On a device
 * that has rated fewer than three times, once the bottle is open a see-through bottle also glides
 * over the glasses (and a see-through glass along the bar) twice each time the control opens
 * unrated, or until it is touched.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View, type AccessibilityActionEvent, type LayoutChangeEvent } from "react-native";
import { useTranslation } from "react-i18next";
import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Image,
  Path,
  Skia,
  useImage,
  type SkImage,
} from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { snapRating, stepRating } from "@/domain/wine/ratingGlasses";
import type { WineType } from "@/domain/wine/wine.types";
import { useHaptics } from "@/presentation/hooks/ui";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";
import { lightTokens } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { ratingArt, type GlassArt } from "./ratingArt";
import { PourBottle, type BottlePlace } from "./PourBottle";
import { GhostBottle } from "./GhostBottle";
import { GlassWine, RatingSlider } from "./RatingSlider";
import { useRatingGestureCoach } from "./useRatingGestureCoach";
import {
  bottleStage, ghostFrame, GHOST_CYCLE_MS, glassLeft, POUR_ANGLE, POUR_GLASS_HEIGHT, pourFrame, pourLayout, ratingFromX, REST_ANGLE,
  sliderLayout, LIFT_MS, UNCORK_MS,
  type BottleStage, type PourLayout, type PourSize,
} from "./pourGeometry";

const TILT_EASING = Easing.bezier(0.3, 0.7, 0.3, 1);
const POUR_HOLD_MS = 260;
/** Back on the stand after the last pour. */
const SETTLE_MS = 420;
/** The demo plays this many times each time the control opens unrated. */
const GHOST_LOOPS = 2;
/** How strongly the demo pours: a preview, never mistaken for a rating. */
const GHOST_OPACITY = 0.38;

interface RatingPourControlProps {
  /** Current rating; 0 means not rated yet. */
  value: number;
  /** Called with the snapped value when the finger lifts, on a tap and on each screen-reader step. */
  onChange: (value: number) => void;
  wineType?: WineType | null;
  disabled?: boolean;
  /** `lg` for the review form, `md` (default) for sheets. */
  size?: PourSize;
  /** Marks the visible label with "*", for forms that note their required fields. */
  required?: boolean;
  testID?: string;
}

function GlassFill({ index, layout, glass, wine, level, bubbles, clock }: {
  index: number;
  layout: PourLayout;
  glass: GlassArt;
  wine: SkImage;
  level: SharedValue<number>;
  bubbles: boolean;
  clock: SharedValue<number>;
}) {
  const left = glassLeft(index, layout);
  const { top, glassWidth: width, glassHeight: height } = layout;
  const fill = useDerivedValue(() => Math.min(1, Math.max(0, level.value - index)));
  const [boxX, boxY, boxW, boxH] = glass.box;
  return (
    <>
      <GlassWine left={left} top={top} width={width} height={height} glass={glass} wine={wine} fill={fill} />
      {bubbles && [0, 1, 2, 3].map((k) => (
        <PourBubble key={k} k={k} clock={clock} fill={fill}
          x={left + (boxX + boxW * (0.25 + k * 0.17)) * width}
          y={top + (boxY + boxH * 0.95) * height}
          rise={height * boxH * 0.8} />
      ))}
    </>
  );
}

function PourBubble({ k, clock, fill, x, y, rise }: {
  k: number; clock: SharedValue<number>; fill: SharedValue<number>; x: number; y: number; rise: number;
}) {
  const progress = useDerivedValue(() => {
    const t = clock.value - k * 0.45;
    return t < 0 ? 0 : (t % 1.8) / 1.8;
  });
  const cy = useDerivedValue(() => y - rise * progress.value * progress.value);
  const opacity = useDerivedValue(() => {
    if (fill.value <= 0.15) return 0;
    const p = progress.value;
    return p < 0.2 ? p * 4.5 : 0.9 * (1 - (p - 0.2) / 0.8);
  });
  return <Circle cx={x} cy={cy} r={1.5} color="rgba(255,255,240,0.9)" opacity={opacity} />;
}

/**
 * The live score under the end of the bar. It follows the drag on its own, so a fast pour re-renders
 * only this text and never the Skia canvas; the committed `value` resets it from outside.
 */
function PourScore({ score, value, format }: {
  score: SharedValue<number>;
  value: number;
  format: (rating: number) => string;
}) {
  const [shown, setShown] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  if (syncedValue !== value) {
    setSyncedValue(value);
    setShown(value);
  }
  useAnimatedReaction(
    () => Math.round(score.value * 10),
    (tenths, previous) => {
      if (tenths !== previous) scheduleOnRN(setShown, tenths / 10);
    },
  );
  return (
    <View style={styles.score}>
      <Text style={styles.scoreValue} testID="rating-pour-value">{format(shown)}</Text>
      <Text style={styles.scoreMax}>/ 5</Text>
    </View>
  );
}

export function RatingPourControl({
  value, onChange, wineType, disabled = false, size = "md", required = false, testID,
}: RatingPourControlProps) {
  const { t } = useTranslation();
  const { formatRating } = useFormatters();
  const haptics = useHaptics();
  const reduceMotion = useReducedMotion();
  const art = ratingArt(wineType);
  const glassImage = useImage(art.glass.source);
  const wineImage = useImage(art.wine);
  // The glasses spread over the width the control gets, so the card has no empty sides.
  const [available, setAvailable] = useState<number>();
  const layout = useMemo(
    () => pourLayout(POUR_GLASS_HEIGHT[size], art.glass, art.bottle, available),
    [size, art.glass, art.bottle, available],
  );
  const slider = useMemo(() => sliderLayout(layout, art.glass), [layout, art.glass]);
  const measure = (event: LayoutChangeEvent) => setAvailable(Math.floor(event.nativeEvent.layout.width));

  const geometry = useSharedValue<PourLayout | null>(null);
  useEffect(() => {
    geometry.value = layout;
  }, [geometry, layout]);
  const current = useSharedValue(value);
  const level = useSharedValue(value);
  const angle = useSharedValue(REST_ANGLE);
  const stream = useSharedValue(0);
  const clock = useSharedValue(0);
  const startStage = bottleStage(value);
  /** 1 while the bottle stands upright beside the glasses, 0 while it is held over them. */
  const stand = useSharedValue(startStage === "pouring" ? 0 : 1);
  /** Opening unrated, the bottle uncorks by itself; with reduced motion it is open from the start. */
  const opensUnrated = useRef(startStage === "corked");
  const uncork = useSharedValue(startStage === "corked" && (disabled || !reduceMotion) ? 0 : 1);
  /** True once this opening's uncorking has started, so the first rating does not wait for it. */
  const opened = useSharedValue(startStage === "corked" && !disabled && reduceMotion);
  /** The demo waits until the bottle stands open. */
  const [open, setOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** When the lifted bottle reaches the glasses; pouring waits until then. */
  const pourAt = useSharedValue(0);
  const coach = useRatingGestureCoach();
  // The demo plays when the control opens unrated; it stops after its loops or at the first touch.
  const [touched, setTouched] = useState(false);
  const [played, setPlayed] = useState(false);
  const demo = open && !coach.learned && !touched && !played && value <= 0 && !disabled && !reduceMotion;
  /** Each opening counts once towards learning the gesture. */
  const counted = useRef(false);
  const ghost = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(ghost);
    ghost.value = 0;
    if (!demo) return;
    ghost.value = withRepeat(withTiming(1, { duration: GHOST_CYCLE_MS, easing: Easing.linear }), GHOST_LOOPS, false);
    // A timer ends the demo, so it stops the same way on every platform.
    // eslint-disable-next-line no-restricted-syntax
    const timer = setTimeout(() => setPlayed(true), GHOST_LOOPS * GHOST_CYCLE_MS);
    return () => {
      clearTimeout(timer);
      cancelAnimation(ghost);
    };
  }, [demo, ghost]);
  // Uncorks once per opening, as soon as the control is usable.
  useEffect(() => {
    if (!opensUnrated.current || opened.value || disabled || current.value > 0) return;
    opened.value = true;
    if (reduceMotion) {
      uncork.value = 1;
      return;
    }
    uncork.value = withTiming(1, { duration: UNCORK_MS, easing: Easing.linear });
    // A timer starts the demo, so it waits the same way on every platform.
    // eslint-disable-next-line no-restricted-syntax
    openTimer.current = setTimeout(() => setOpen(true), UNCORK_MS);
  }, [current, disabled, opened, reduceMotion, uncork]);
  useEffect(() => () => clearTimeout(openTimer.current), []);
  const latest = useRef({ onChange, haptics, recordRating: coach.recordRating });
  latest.current = { onChange, haptics, recordRating: coach.recordRating };

  /** Moves the bottle between its stand and the glasses; returns how long until it can pour. */
  const toStage = (from: BottleStage, to: BottleStage) => {
    "worklet";
    if (from === to) return 0;
    if (reduceMotion) {
      stand.value = to === "pouring" ? 0 : 1;
      uncork.value = to === "corked" ? 0 : 1;
      return 0;
    }
    if (to === "pouring") {
      // Uncorked (or uncorking) by itself: finish at once and pour in step; otherwise uncork first.
      const waitUncork = from === "corked" && !opened.value;
      if (from === "corked" && opened.value && uncork.value < 1) {
        cancelAnimation(uncork);
        uncork.value = 1;
      }
      const delay = waitUncork ? UNCORK_MS : 0;
      if (waitUncork) uncork.value = withTiming(1, { duration: UNCORK_MS, easing: Easing.linear });
      stand.value = withDelay(delay, withTiming(0, { duration: LIFT_MS, easing: TILT_EASING }));
      // Already open: the glasses fill in step with the finger while the bottle lifts.
      return from === "corked" && !waitUncork ? 0 : delay + LIFT_MS;
    }
    // Back on the stand: after the last pour at 5.0, or corked again when the form resets.
    const hold = to === "finished" ? POUR_HOLD_MS + 180 : 0;
    stand.value = withDelay(hold, withTiming(1, { duration: SETTLE_MS, easing: TILT_EASING }));
    if (to === "corked") {
      opened.value = false;
      uncork.value = withDelay(SETTLE_MS, withTiming(0, { duration: 0 }));
    }
    return 0;
  };

  // A new value from outside (an edit loads, the form resets) moves the bottle without pouring.
  useEffect(() => {
    if (Math.abs(current.value - value) < 1e-6) return;
    toStage(bottleStage(current.value), bottleStage(value));
    current.value = value;
    level.value = reduceMotion ? value : withTiming(value, { duration: 220 });
    // toStage only touches shared values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, level, reduceMotion, value]);

  useEffect(() => {
    if (!art.bubbles || reduceMotion) return;
    clock.value = withRepeat(withTiming(3600, { duration: 3_600_000, easing: Easing.linear }), -1, false);
  }, [art.bubbles, clock, reduceMotion]);

  const tick = () => latest.current.haptics.selection();
  const touch = () => {
    setTouched(true);
    // A touch during the uncorking ends it at once.
    if (opened.value && uncork.value < 1) {
      cancelAnimation(uncork);
      uncork.value = 1;
    }
  };
  const commit = (next: number) => {
    if (next > 0 && !counted.current) {
      counted.current = true;
      latest.current.recordRating();
    }
    latest.current.onChange(next);
  };

  const move = (next: number) => {
    "worklet";
    const previous = current.value;
    if (Math.abs(next - previous) < 1e-6) return;
    if (Math.floor(next + 1e-6) !== Math.floor(previous + 1e-6)) scheduleOnRN(tick);
    current.value = next;
    const lift = toStage(bottleStage(previous), bottleStage(next));
    const now = Date.now();
    if (lift > 0) pourAt.value = now + lift;
    const wait = Math.max(0, pourAt.value - now);
    level.value = reduceMotion ? next : withDelay(wait, withTiming(next, { duration: 110, easing: Easing.linear }));
    if (next > previous && !reduceMotion) {
      angle.value = withDelay(wait, withSequence(
        withTiming(POUR_ANGLE, { duration: 350, easing: TILT_EASING }),
        withDelay(POUR_HOLD_MS, withTiming(REST_ANGLE, { duration: 350, easing: TILT_EASING })),
      ));
      stream.value = withDelay(wait, withSequence(
        withTiming(1, { duration: 180 }),
        withDelay(POUR_HOLD_MS, withTiming(0, { duration: 180 })),
      ));
    } else {
      angle.value = withTiming(REST_ANGLE, { duration: 350, easing: TILT_EASING });
      stream.value = withTiming(0, { duration: 180 });
    }
  };

  const gesture = useMemo(() => {
    const fromX = (x: number) => {
      "worklet";
      const shape = geometry.value;
      return shape ? snapRating(ratingFromX(x, shape)) : current.value;
    };
    const pan = Gesture.Pan()
      .enabled(!disabled)
      .activeOffsetX([-4, 4])
      .failOffsetY([-14, 14])
      .onBegin(() => scheduleOnRN(touch))
      .onStart((event) => move(fromX(event.x)))
      .onUpdate((event) => move(fromX(event.x)))
      .onEnd(() => scheduleOnRN(commit, current.value))
      .withTestId("rating-pour-pan");
    const tap = Gesture.Tap()
      .enabled(!disabled)
      .onBegin(() => scheduleOnRN(touch))
      .onEnd((event) => {
        move(fromX(event.x));
        scheduleOnRN(commit, current.value);
      })
      .withTestId("rating-pour-tap");
    return Gesture.Race(pan, tap);
    // move/commit read refs and shared values, so the gesture only changes with `disabled`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  const step = (event: AccessibilityActionEvent) => {
    if (disabled) return;
    const direction = event.nativeEvent.actionName === "increment" ? 1 : event.nativeEvent.actionName === "decrement" ? -1 : 0;
    if (!direction) return;
    const next = stepRating(current.value, direction);
    if (Math.abs(next - current.value) < 1e-6) return;
    setTouched(true);
    move(next);
    commit(next);
  };

  const frame = useDerivedValue(
    () => pourFrame(Math.max(0.0001, level.value), layout, art.glass, art.bottle),
  );
  const streamPath = useDerivedValue(() => {
    const f = frame.value;
    if (!f) return Skia.Path.Make();
    return Skia.PathBuilder.Make()
      .moveTo(f.lipX, f.lipY)
      .quadTo(f.controlX, f.controlY, f.targetX, f.targetY)
      .detach();
  });
  // No wine in the air while the bottle is carried to the next glass or lifted from its stand.
  const streamOpacity = useDerivedValue(() => stream.value * (frame.value?.ready ?? 0) * (1 - stand.value));
  const flowPhase = useDerivedValue(() => -((clock.value * 1000) / 350) * 12);
  // Between its stand and the glasses the bottle travels on a small arc and turns upright.
  const place = useDerivedValue<BottlePlace>(() => {
    const f = frame.value;
    const held = 1 - stand.value;
    const x = f ? f.bottleCenterX : layout.standX;
    const y = f ? f.bottleCenterY : layout.standY;
    return {
      x: layout.standX + (x - layout.standX) * held,
      y: layout.standY + (y - layout.standY) * held - Math.sin(Math.PI * held) * layout.glassHeight * 0.25,
      rotate: angle.value * held,
    };
  });

  const ghostLevel = useDerivedValue(() => ghostFrame(ghost.value).level);

  const valueText = value > 0 ? t("reviews.form.pourValue", { value: formatRating(value) }) : t("reviews.form.pourEmpty");

  return (
    <View style={styles.wrapper} testID={testID} onLayout={measure}>
      <View style={{ width: layout.width }}>
        <Text style={styles.readoutLabel}>{t(required ? "reviews.form.ratingLabel" : "reviews.form.pourLabel")}</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          style={[{ width: layout.width, height: layout.height }, disabled && styles.disabled]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t("reviews.form.pourLabel")}
          accessibilityHint={t("reviews.form.pourHint")}
          accessibilityState={{ disabled }}
          accessibilityValue={{ min: 0, max: 5, now: value, text: valueText }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={step}
        >
          {glassImage && wineImage && (
            <Canvas style={{ width: layout.width, height: layout.height }} pointerEvents="none">
              {[0, 1, 2, 3, 4].map((index) => (
                <Group key={index}>
                  <Image image={glassImage} x={glassLeft(index, layout)} y={layout.top}
                    width={layout.glassWidth} height={layout.glassHeight} fit="fill" />
                  <GlassFill index={index} layout={layout} glass={art.glass} wine={wineImage} level={level}
                    bubbles={art.bubbles && !reduceMotion} clock={clock} />
                </Group>
              ))}
              {demo && (
                <Group opacity={GHOST_OPACITY}>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <GlassFill key={index} index={index} layout={layout} glass={art.glass} wine={wineImage}
                      level={ghostLevel} bubbles={false} clock={clock} />
                  ))}
                </Group>
              )}
              <Path path={streamPath} style="stroke" strokeWidth={3.2} strokeCap="round" color={art.pourColor} opacity={streamOpacity} />
              <Path path={streamPath} style="stroke" strokeWidth={1.4} strokeCap="round" color="rgba(255,255,255,0.55)" opacity={streamOpacity}>
                <DashPathEffect intervals={[3, 9]} phase={flowPhase} />
              </Path>
              <PourBottle layout={layout} bottle={art.bottle} place={place} stand={stand} uncork={uncork} level={level} />
              {demo && <GhostBottle ghost={ghost} layout={layout} glass={art.glass} bottle={art.bottle} />}
            </Canvas>
          )}
        </View>
      </GestureDetector>
      <RatingSlider score={current} ghostLevel={ghostLevel} demo={demo} slider={slider} glass={art.glass}
        gradient={art.trackGradient} glassImage={glassImage} wineImage={wineImage} disabled={disabled}
        onTouch={touch} onMove={move} onCommit={commit} />
      {/* Right-aligned with the end of the track. */}
      <View style={[styles.scoreRow, { width: layout.width, paddingRight: layout.width - slider.end }]} testID="rating-score-row">
        <PourScore score={current} value={value} format={formatRating} />
      </View>
      {value <= 0 && !disabled && !touched && (
        <Text style={[styles.guide, { width: layout.width }]}>{t("reviews.form.pourGuide")}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  readoutLabel: { ...textStyles.overline, color: lightTokens.textTertiary },
  scoreRow: { alignItems: "flex-end" },
  score: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  scoreValue: { ...textStyles.titleLarge, color: lightTokens.textPrimary, fontVariant: ["tabular-nums"] },
  scoreMax: { ...textStyles.caption, color: lightTokens.textTertiary },
  disabled: { opacity: 0.55 },
  guide: { ...textStyles.caption, color: lightTokens.textTertiary, textAlign: "center" },
});

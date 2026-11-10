/**
 * A watercolor brushstroke in the wine's color: the core hue across the body and the rim tone toward the tail,
 * painted left to right when it appears. The stroke is an alpha mask over a horizontal gradient; its brush follows
 * the depth and age the color line names (watery for a pale wine, loaded for a deep one, dry for an evolved one). When the color
 * line names reflections ("rojo rubí con reflejos violáceos y matices teja"), a soft wash of the reflection's hue
 * runs along the lower edge of the stroke from left to right, tinting the paint the way the wine's edge takes on
 * that tone in a tilted glass. Each pass shows the next named tone.
 */
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Blend, Canvas, Group, Image, LinearGradient, Mask, Rect, rect, useImage, vec } from "@shopify/react-native-skia";
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import type { WineColorIntensity, WineColorTone } from "@/domain/wine/wine.color-tone";
import {
  reflectionWashes,
  strokeFor,
  swatchColors,
  WINE_COLOR_STROKE_RATIO,
  WINE_STROKE_MASKS,
} from "@/shared/wineColorPalette";

const PAINT_MS = 900;
/** One wash runs along the lower edge per reflection tone. */
const REFLECTION_MS = 4200;
const SWATCH_WIDTH = 220;
/** The wash covers the lower part of the stroke, fading in from this height down to the edge. */
const WASH_TOP = 0.36;
/** Half the width of the wash band, as a share of the stroke width (same band as the web). */
const WASH_HALF = 0.57;
/** Where the wash rests when motion is reduced, as a share of the sweep. */
const STILL_SWEEP = 0.55;

interface WineColorSwatchProps {
  tone?: WineColorTone | null;
  rim?: WineColorTone | null;
  /** How deep the color line says the wine is; it picks a watery, base or loaded stroke. */
  intensity?: WineColorIntensity | null;
  /** Every reflection tone the color line names, in order. */
  reflections?: readonly WineColorTone[];
  /** The color line names a play of light (reflections, glints, brightness), even without another tone. */
  highlights?: boolean;
  label: string;
}

export function WineColorSwatch({ tone, rim, intensity, reflections = [], highlights = false, label }: WineColorSwatchProps) {
  const stroke = useImage(WINE_STROKE_MASKS[tone ? strokeFor(tone, intensity) : "medium"]);
  const reduceMotion = useReducedMotion();
  const painted = useSharedValue(reduceMotion ? 1 : 0);
  const sweep = useSharedValue(reduceMotion ? STILL_SWEEP : 0);
  const [step, setStep] = useState(0);
  const nextReflection = useCallback(() => setStep((current) => current + 1), []);
  const washes = tone ? reflectionWashes(tone, reflections, highlights) : [];
  const reflects = washes.length > 0;
  const width = SWATCH_WIDTH;
  const height = SWATCH_WIDTH / WINE_COLOR_STROKE_RATIO;

  useEffect(() => {
    if (reduceMotion || !stroke) return;
    painted.value = 0;
    painted.value = withTiming(1, { duration: PAINT_MS, easing: Easing.bezier(0.3, 0.7, 0.3, 1) });
  }, [painted, reduceMotion, stroke, tone, rim]);

  useEffect(() => {
    if (reduceMotion || !stroke || !reflects) return;
    const delay = step === 0 ? PAINT_MS : 0;
    sweep.value = 0;
    sweep.value = withDelay(
      delay,
      withTiming(1, { duration: REFLECTION_MS, easing: Easing.bezier(0.45, 0, 0.4, 1) }),
    );
    const next = setTimeout(nextReflection, delay + REFLECTION_MS);
    return () => {
      clearTimeout(next);
      cancelAnimation(sweep);
    };
  }, [sweep, reduceMotion, stroke, reflects, step, nextReflection]);

  const clip = useDerivedValue(() => rect(0, 0, width * painted.value, height));
  const washOpacity = useDerivedValue(() =>
    reduceMotion ? 1 : Math.min(1, Math.sin(Math.PI * sweep.value) * 1.6),
  );
  const washStart = useDerivedValue(() => vec(width * (-0.3 + 1.6 * sweep.value - WASH_HALF), 0));
  const washEnd = useDerivedValue(() => vec(width * (-0.3 + 1.6 * sweep.value + WASH_HALF), 0));

  if (!tone) return null;
  const colors = swatchColors(tone, reflects ? null : rim);
  const current = washes[step % Math.max(washes.length, 1)];
  const wash = current?.color ?? colors.rim;
  const blendMode = current?.blend === "soft-light" ? "softLight" : "color";
  const washY = height * WASH_TOP;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      testID={`wine-color-swatch-${tone}`}
      style={{ width, height }}
    >
      <Canvas style={{ width, height }}>
        <Group clip={clip}>
          <Mask
            mode="alpha"
            mask={<Image image={stroke} x={0} y={0} width={width} height={height} fit="fill" />}
          >
            <Rect x={0} y={0} width={width} height={height}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(width, 0)}
                colors={[colors.core, colors.core, colors.rim]}
                positions={[0, 0.4, 1]}
              />
            </Rect>
            {reflects && (
              <Group opacity={washOpacity}>
                <Rect x={0} y={washY} width={width} height={height - washY} blendMode={blendMode}>
                  <Blend mode="dstIn">
                    <LinearGradient
                      start={washStart}
                      end={washEnd}
                      colors={[`${wash}00`, wash, wash, `${wash}00`]}
                      positions={[0, 0.41, 0.59, 1]}
                    />
                    <LinearGradient
                      start={vec(0, washY)}
                      end={vec(0, height)}
                      colors={[`${wash}00`, wash, wash]}
                      positions={[0, 0.6, 1]}
                    />
                  </Blend>
                </Rect>
              </Group>
            )}
          </Mask>
        </Group>
      </Canvas>
    </View>
  );
}

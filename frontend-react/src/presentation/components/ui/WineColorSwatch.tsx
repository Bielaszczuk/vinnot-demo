import { useEffect, useState, type CSSProperties } from "react";
import type { WineColorIntensity, WineColorTone } from "@domain/wine/wine.color-tone";
import { useReducedMotion } from "@hooks/useReducedMotion";
import { reflectionWashes, strokeFor, swatchColors, WINE_STROKE_MASKS } from "@shared/wineColorPalette";

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

/** Paint-on time, then one wash along the lower edge per reflection tone. Keep in sync with globals.css. */
const SWATCH_PAINT_MS = 900;
const SWATCH_REFLECTION_MS = 4200;

function strokeMask(url: string): CSSProperties {
  return {
    maskImage: `url(${url})`,
    WebkitMaskImage: `url(${url})`,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  };
}

/**
 * A watercolor brushstroke in the wine's color: the core hue across the body and the rim tone toward the tail,
 * painted left to right when it appears. The brush follows the depth and age the color line names: watery for a
 * pale wine, loaded for a deep one, dry for an evolved one. When the color line names reflections ("rojo rubí con
 * reflejos violáceos y matices teja"), a soft wash of the reflection's hue runs along the lower edge of the stroke
 * from left to right, tinting the paint the way the wine's edge takes on that tone in a tilted glass. Each pass
 * shows the next named tone.
 * Renders nothing when the color line names no hue.
 */
export function WineColorSwatch({ tone, rim, intensity, reflections = [], highlights = false, label }: WineColorSwatchProps) {
  const reduced = useReducedMotion();
  const washes = tone ? reflectionWashes(tone, reflections, highlights) : [];
  const [step, setStep] = useState(0);
  const cycles = !reduced && washes.length > 1;

  useEffect(() => {
    if (!cycles) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setStep((current) => current + 1);
      interval = setInterval(() => setStep((current) => current + 1), SWATCH_REFLECTION_MS);
    }, SWATCH_PAINT_MS + SWATCH_REFLECTION_MS);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [cycles]);

  if (!tone) return null;
  const wash = washes[step % Math.max(washes.length, 1)];
  const reflects = Boolean(wash);
  const colors = swatchColors(tone, reflects ? null : rim);
  const brush = strokeFor(tone, intensity);
  const stroke: CSSProperties = {
    backgroundImage: `linear-gradient(90deg, ${colors.core} 0%, ${colors.core} 40%, ${colors.rim} 100%)`,
    ...strokeMask(WINE_STROKE_MASKS[brush]),
  };
  const tint = wash?.color ?? colors.rim;
  const sheen: CSSProperties = {
    backgroundImage: `linear-gradient(90deg, ${tint}00 28%, ${tint} 46%, ${tint} 54%, ${tint}00 72%)`,
    mixBlendMode: wash?.blend ?? "color",
    animationDuration: `${SWATCH_REFLECTION_MS}ms`,
    animationDelay: `${SWATCH_PAINT_MS}ms`,
  };
  return (
    <div
      role="img"
      aria-label={label}
      data-tone={tone}
      data-rim={rim ?? undefined}
      data-stroke={brush}
      data-reflections={reflects ? reflections.join(" ") || "light" : undefined}
      style={stroke}
      data-testid="wine-swatch-stroke"
      className="wine-swatch-paint relative aspect-[720/208] w-60 max-w-full flex-shrink-0"
    >
      {reflects && (
        <span aria-hidden="true" data-testid="wine-swatch-sheen" style={sheen} className="wine-swatch-sheen absolute" />
      )}
    </div>
  );
}

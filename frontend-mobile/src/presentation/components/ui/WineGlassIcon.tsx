import { useId } from "react";
import Svg, { ClipPath, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from "react-native-svg";

/** A full, half or empty icon glass. Rating displays use `RatingGlasses` with fractional fills. */
export type GlassFill = 0 | 0.5 | 1;

/**
 * Colours taken from the app illustrations: sepia ink outlines, a warm
 * parchment glass and a ruby wine that darkens towards the bottom.
 */
const INK = "#5B3A29";
const GLASS = "#FBF3E6";
const WINE_TOP = "#A8324F";
const WINE_BOTTOM = "#4E0F25";
const MENISCUS = "#C2506C";

/** Tulip bowl in a 24x30 viewBox. */
const BOWL = "M5 3C4.6 8.6 5 12.3 6.6 14.6C7.9 16.5 9.8 17.4 12 17.4C14.2 17.4 16.1 16.5 17.4 14.6C19 12.3 19.4 8.6 19 3Z";
/** Top of the wine for a full and a half glass. */
const LEVEL: Record<Exclude<GlassFill, 0>, number> = { 1: 6.6, 0.5: 11.4 };

interface WineGlassIconProps {
  fill: GlassFill;
  /** Width in points; the glass is a little taller than wide. */
  size?: number;
  /**
   * One flat colour for the whole glass, for places that tint icons (a
   * selected chip). Without it the glass uses the illustrated palette.
   */
  color?: string;
}

/** One rating glass: wine fills it from the bottom, full, half or empty. */
export function WineGlassIcon({ fill, size = 14, color }: WineGlassIconProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clipId = `glass-bowl-${id}`;
  const wineId = `glass-wine-${id}`;
  const ink = color ?? INK;
  const empty = fill === 0;
  const level = empty ? null : LEVEL[fill];

  return (
    <Svg width={size} height={size * (30 / 24)} viewBox="0 0 24 30" testID={`wine-glass-${fill}`}>
      <Defs>
        <ClipPath id={clipId}>
          <Path d={BOWL} />
        </ClipPath>
        <LinearGradient id={wineId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color ?? WINE_TOP} />
          <Stop offset="1" stopColor={color ?? WINE_BOTTOM} />
        </LinearGradient>
      </Defs>

      <Path d={BOWL} fill={color ? "none" : GLASS} />
      {level !== null && (
        <>
          <Rect
            x={0}
            y={level}
            width={24}
            height={18 - level}
            fill={`url(#${wineId})`}
            clipPath={`url(#${clipId})`}
          />
          {!color && (
            <Ellipse
              cx={12}
              cy={level}
              rx={fill === 1 ? 6.9 : 6.2}
              ry={0.9}
              fill={MENISCUS}
              clipPath={`url(#${clipId})`}
            />
          )}
        </>
      )}
      {!color && (
        <Path
          d="M7.4 5.6C7.3 8.6 7.7 11 8.7 12.8"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.75}
          strokeWidth={1.1}
          strokeLinecap="round"
        />
      )}
      <Path
        d={BOWL}
        fill="none"
        stroke={ink}
        strokeOpacity={empty && !color ? 0.55 : 1}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <Path
        d="M12 17.4V25"
        fill="none"
        stroke={ink}
        strokeOpacity={empty && !color ? 0.55 : 1}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <Ellipse
        cx={12}
        cy={25.9}
        rx={4.8}
        ry={1.3}
        fill={color ? "none" : GLASS}
        stroke={ink}
        strokeOpacity={empty && !color ? 0.55 : 1}
        strokeWidth={1.2}
      />
    </Svg>
  );
}

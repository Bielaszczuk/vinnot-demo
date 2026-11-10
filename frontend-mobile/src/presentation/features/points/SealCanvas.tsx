/**
 * Draws one wax seal with Skia: the tier art plus its light layers. Every layer that
 * lights the wax is blended onto the art and then clipped by the seal's own alpha
 * (`dstIn`), so reflections never leave the seal; since `dstIn` only reaches the art's
 * own rect, the light layers are also clipped to that rect. Halos, rays and sparkles live
 * around it. All clocks are Reanimated shared values read on the UI thread.
 */
import { useMemo } from "react";
import {
  Blend,
  BlurMask,
  Canvas,
  Circle,
  Group,
  Image,
  LinearGradient,
  Mask,
  Paint,
  Path,
  Points,
  RadialGradient,
  Rect,
  Shadow,
  Skia,
  SweepGradient,
  useImage,
} from "@shopify/react-native-skia";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { badgeTierSlug, type BadgeTier } from "@/domain/points/badgeTiers";
import { SEAL_ART } from "./sealArt";
import { HOLO_COLORS, SEAL_EFFECTS, sealBleed, type GlowSpec, type HaloSpec, type HoloSpec, type SparkSpec, type SweepSpec } from "./sealEffects";
import {
  breatheScale,
  dewOpacity,
  glitterStep,
  haloFrame,
  haloSpinOpacity,
  knifeFrame,
  layerPhase,
  LIST_DELAY_FACTOR,
  pulseOpacity,
  riseFrame,
  ripenOpacity,
  STILL_SHEEN,
  swayDegrees,
  sweepLine,
  sweepPosition,
  twinkleFrame,
} from "./sealMotion";

/** Shared clocks of one seal. `clock` keeps growing; list bursts measure from `burstStart`. */
export interface SealTiming {
  clock: SharedValue<number>;
  burstStart: SharedValue<number>;
  loop: boolean;
  still: boolean;
}

/** Finger position over the seal (0..1) while it touches it. */
export interface SealPointer {
  x: number;
  y: number;
  active: boolean;
}

interface Box {
  left: number;
  top: number;
  size: number;
}

interface LayerProps {
  box: Box;
  timing: SealTiming;
}

const CLEAR = "rgba(255,255,255,0)";
/**
 * The `dstIn` draw of the art is antialiased on its own rect edge, where it only partly
 * clears what lies below; light kept 1 pt inside that edge leaves no faint box around the seal.
 */
const CLIP_INSET = 1;
const TAU = Math.PI * 2;

function phaseOf(timing: SealTiming, duration: number, delay = 0) {
  "worklet";
  return layerPhase(timing.clock.value - timing.burstStart.value, duration, delay, timing.loop);
}

function SweepLayer({ spec, box, timing, pointer }: LayerProps & { spec: SweepSpec; pointer: SharedValue<SealPointer> }) {
  const line = useDerivedValue(() => {
    let sx = 1;
    if (timing.still) sx = STILL_SHEEN;
    else {
      const phase = phaseOf(timing, spec.duration);
      if (phase.active) sx = sweepPosition(phase.p, spec.motion);
    }
    const angle = spec.followPointer && pointer.value.active ? 90 + (pointer.value.x - 0.5) * 80 : spec.angle;
    return sweepLine(sx, spec.scale, angle, box.left, box.top, box.size);
  });
  const start = useDerivedValue(() => ({ x: line.value.x0, y: line.value.y0 }));
  const end = useDerivedValue(() => ({ x: line.value.x1, y: line.value.y1 }));
  return (
    <Rect x={box.left} y={box.top} width={box.size} height={box.size} blendMode={spec.blend} opacity={spec.opacity}>
      <LinearGradient start={start} end={end} colors={spec.colors} positions={spec.positions} />
    </Rect>
  );
}

function GlowLayer({ spec, box, timing }: LayerProps & { spec: GlowSpec }) {
  const opacity = useDerivedValue(() => {
    if (timing.still) return spec.rest;
    const phase = phaseOf(timing, spec.duration);
    if (!phase.active) return spec.rest;
    if (spec.keyframe === "pulse") return pulseOpacity(phase.p);
    return spec.keyframe === "dew" ? dewOpacity(phase.p) : ripenOpacity(phase.p);
  });
  const c = { x: box.left + spec.cx * box.size, y: box.top + spec.cy * box.size };
  return (
    <Rect x={box.left} y={box.top} width={box.size} height={box.size} blendMode={spec.blend} opacity={opacity}>
      <RadialGradient c={c} r={spec.rx * box.size} colors={spec.colors} positions={spec.positions}
        transform={[{ scaleY: spec.ry / spec.rx }]} origin={c} />
    </Rect>
  );
}

function HaloLayer({ spec, box, timing }: LayerProps & { spec: HaloSpec }) {
  const frame = useDerivedValue(() => {
    if (timing.still) return { opacity: 0, scale: 1 };
    const phase = phaseOf(timing, spec.duration);
    if (!phase.active) return { opacity: 0, scale: 1 };
    return spec.rainbow ? { opacity: haloSpinOpacity(phase.p), scale: 1 } : haloFrame(phase.p);
  });
  const opacity = useDerivedValue(() => frame.value.opacity);
  const transform = useDerivedValue(() => [{ scale: frame.value.scale }]);
  const spin = useDerivedValue(() => [{ rotate: (timing.clock.value / spec.duration) * TAU }]);
  const c = { x: box.left + box.size / 2, y: box.top + box.size / 2 };
  const r = box.size * (0.5 + spec.inset);
  return (
    <Group opacity={opacity} transform={transform} origin={c}>
      <Circle c={c} r={r} opacity={spec.rainbow ? 0.6 : 1}>
        {spec.rainbow ? (
          <Blend mode="modulate">
            <RadialGradient c={c} r={r} colors={["#ffffff", "#ffffff", CLEAR]} positions={[0, 0.45, 1]} />
            <SweepGradient c={c} colors={spec.colors.concat(spec.colors[0] ?? CLEAR)} transform={spin} origin={c} />
          </Blend>
        ) : (
          <RadialGradient c={c} r={r} colors={spec.colors} positions={spec.positions} />
        )}
        <BlurMask blur={box.size * (spec.rainbow ? 0.06 : 0.05)} style="normal" />
      </Circle>
    </Group>
  );
}

/** Gran Reserva: slow golden rays in a ring around the seal. */
const RAY_PERIODS = 16;
const RAY_COLORS: string[] = [];
const RAY_POSITIONS: number[] = [];
for (let i = 0; i < RAY_PERIODS; i++) {
  const base = i / RAY_PERIODS;
  const step = 1 / RAY_PERIODS;
  for (const [offset, color] of [[0, "rgba(255,206,110,0)"], [9 / 22, "rgba(255,206,110,0)"], [12 / 22, "rgba(255,214,130,0.45)"], [15 / 22, "rgba(255,206,110,0)"], [1, "rgba(255,206,110,0)"]] as const) {
    RAY_COLORS.push(color);
    RAY_POSITIONS.push(Math.min(1, base + offset * step));
  }
}

function RaysLayer({ box, timing, duration }: LayerProps & { duration: number }) {
  const c = { x: box.left + box.size / 2, y: box.top + box.size / 2 };
  const r = box.size * (0.5 + 0.34);
  const spin = useDerivedValue(() => [{ rotate: timing.still ? 0 : (timing.clock.value / duration) * TAU }]);
  return (
    <Group opacity={0.5}>
      <Mask mask={
        <Circle c={c} r={r}>
          <RadialGradient c={c} r={r} colors={["rgba(0,0,0,0)", "rgba(0,0,0,0)", "#000000", "rgba(0,0,0,0)"]} positions={[0, 0.55, 0.64, 0.88]} />
        </Circle>
      }>
        <Group transform={spin} origin={c}>
          <Circle c={c} r={r}>
            <SweepGradient c={c} colors={RAY_COLORS} positions={RAY_POSITIONS} />
            <BlurMask blur={1.5} style="normal" />
          </Circle>
        </Group>
      </Mask>
    </Group>
  );
}

function HoloLayer({ spec, box, timing, pointer }: LayerProps & { spec: HoloSpec; pointer: SharedValue<SealPointer> }) {
  const c = useDerivedValue(() => {
    const follow = spec.followPointer && pointer.value.active;
    return {
      x: box.left + (follow ? pointer.value.x : spec.cx) * box.size,
      y: box.top + (follow ? pointer.value.y : spec.cy) * box.size,
    };
  });
  const spin = useDerivedValue(() => [{ rotate: timing.still ? 0 : (timing.clock.value / spec.duration) * TAU }]);
  return (
    <Rect x={box.left} y={box.top} width={box.size} height={box.size} blendMode={spec.blend} opacity={spec.opacity}>
      <SweepGradient c={c} colors={spec.colors} transform={spin} origin={c} />
    </Rect>
  );
}

function KnifeLayer({ box, timing, duration }: LayerProps & { duration: number }) {
  const frame = useDerivedValue(() => {
    if (timing.still) return { opacity: 0, travel: 0 };
    const phase = phaseOf(timing, duration);
    return phase.active ? knifeFrame(phase.p) : { opacity: 0, travel: 0 };
  });
  const opacity = useDerivedValue(() => frame.value.opacity);
  const line = useDerivedValue(() => {
    const base = sweepLine(0, 1, 120, box.left, box.top, box.size);
    const shift = frame.value.travel * 0.18 * box.size;
    const dx = Math.sin((120 * Math.PI) / 180) * shift;
    const dy = -Math.cos((120 * Math.PI) / 180) * shift;
    return { x0: base.x0 + dx, y0: base.y0 + dy, x1: base.x1 + dx, y1: base.y1 + dy };
  });
  const start = useDerivedValue(() => ({ x: line.value.x0, y: line.value.y0 }));
  const end = useDerivedValue(() => ({ x: line.value.x1, y: line.value.y1 }));
  const spot = { x: box.left + 0.68 * box.size, y: box.top + 0.42 * box.size };
  return (
    <Rect x={box.left} y={box.top} width={box.size} height={box.size} blendMode="screen" opacity={opacity}>
      <Blend mode="modulate">
        <RadialGradient c={spot} r={0.18 * box.size} colors={["#ffffff", "#ffffff", CLEAR]} positions={[0, 0.4, 1]}
          transform={[{ scaleY: 34 / 18 }]} origin={spot} />
        <LinearGradient start={start} end={end} colors={[CLEAR, "rgba(255,250,230,0.95)", CLEAR]} positions={[0.44, 0.5, 0.56]} />
      </Blend>
    </Rect>
  );
}

/** Vinnot glitter: three tiled dot patterns that jump four times per cycle. */
const GLITTER_TILES = [
  { w: 9, h: 11, cx: 0.2, cy: 0.3, from: [0, 0], to: [2, 1] },
  { w: 13, h: 7, cx: 0.7, cy: 0.6, from: [3, 4], to: [1, 6] },
  { w: 17, h: 13, cx: 0.4, cy: 0.8, from: [5, 1], to: [3, 3] },
] as const;

function GlitterTile({ tile, box, shift }: { tile: (typeof GLITTER_TILES)[number]; box: Box; shift: SharedValue<number> }) {
  const points = useMemo(() => {
    // Only dots over the seal's box: `dstIn` clears transparent pixels inside the art's
    // rect, never outside it, so anything drawn beyond the box would stay visible.
    const right = box.left + box.size;
    const bottom = box.top + box.size;
    const list: { x: number; y: number }[] = [];
    for (let x = box.left; x < right; x += tile.w) {
      for (let y = box.top; y < bottom; y += tile.h) {
        const dot = { x: x + tile.cx * tile.w + tile.from[0], y: y + tile.cy * tile.h + tile.from[1] };
        if (dot.x <= right && dot.y <= bottom) list.push(dot);
      }
    }
    return list;
  }, [box.left, box.top, box.size, tile]);
  const transform = useDerivedValue(() => [
    { translateX: (tile.to[0] - tile.from[0]) * shift.value },
    { translateY: (tile.to[1] - tile.from[1]) * shift.value },
  ]);
  return <Points points={points} mode="points" color="#ffffff" strokeWidth={1.3} strokeCap="round" transform={transform} />;
}

function GlitterLayer({ box, timing, duration }: LayerProps & { duration: number }) {
  const frame = useDerivedValue(() => {
    if (timing.still) return { opacity: 0.35, shift: 0 };
    const phase = phaseOf(timing, duration);
    return phase.active ? glitterStep(phase.p) : { opacity: 0.35, shift: 0 };
  });
  const opacity = useDerivedValue(() => 0.9 * frame.value.opacity);
  const shift = useDerivedValue(() => frame.value.shift);
  return (
    <Group blendMode="overlay" opacity={opacity}>
      {GLITTER_TILES.map((tile) => <GlitterTile key={`${tile.w}x${tile.h}`} tile={tile} box={box} shift={shift} />)}
    </Group>
  );
}

function starPath(size: number) {
  const half = size / 2;
  const notch = size * 0.08;
  return Skia.PathBuilder.Make()
    .moveTo(0, -half)
    .lineTo(notch, -notch)
    .lineTo(half, 0)
    .lineTo(notch, notch)
    .lineTo(0, half)
    .lineTo(-notch, notch)
    .lineTo(-half, 0)
    .lineTo(-notch, -notch)
    .close()
    .detach();
}

function Sparkle({ spec, color, duration, fx, timing }: { spec: SparkSpec; color: string; duration: number; fx: Box; timing: SealTiming }) {
  const [x, y, z, delay] = spec;
  const size = (z / 100) * fx.size;
  const cx = fx.left + (x / 100) * fx.size;
  const cy = fx.top + (y / 100) * fx.size;
  const path = useMemo(() => starPath(size), [size]);
  const frame = useDerivedValue(() => {
    if (timing.still) return { opacity: 0, scale: 0.2, rotate: 0 };
    const phase = phaseOf(timing, duration, timing.loop ? delay : delay * LIST_DELAY_FACTOR);
    return phase.active ? twinkleFrame(phase.p) : { opacity: 0, scale: 0.2, rotate: 0 };
  });
  const opacity = useDerivedValue(() => frame.value.opacity);
  const transform = useDerivedValue(() => [
    { translateX: cx },
    { translateY: cy },
    { rotate: (frame.value.rotate * Math.PI) / 180 },
    { scale: frame.value.scale },
  ]);
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={path} color={color} opacity={0.9}>
        <BlurMask blur={3} style="normal" />
      </Path>
      <Path path={path}>
        <RadialGradient c={{ x: 0, y: 0 }} r={size * 0.707} colors={["#ffffff", "#ffffff", color, CLEAR]} positions={[0, 0.18, 0.3, 0.7]} />
      </Path>
    </Group>
  );
}

/** Stable pseudo-random numbers, so particles do not jump between renders. */
function seeded(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function Particle({ index, fx, size, timing }: { index: number; fx: Box; size: number; timing: SealTiming }) {
  const color = HOLO_COLORS[index % HOLO_COLORS.length]!;
  const cx = fx.left + ((22 + seeded(index, 1) * 56) / 100) * fx.size;
  const cy = fx.top + ((70 + seeded(index, 2) * 18) / 100) * fx.size;
  const r = (((2.5 + seeded(index, 3) * 2.5) / 100) * fx.size) / 2;
  const duration = 2.8 + seeded(index, 4) * 1.6;
  const rise = size * (0.45 + seeded(index, 5) * 0.35);
  const drift = (seeded(index, 6) - 0.5) * size * 0.25;
  const delay = index * 0.45;
  const frame = useDerivedValue(() => {
    if (timing.still) return { opacity: 0, travel: 0 };
    const phase = phaseOf(timing, duration, timing.loop ? delay : delay * LIST_DELAY_FACTOR);
    return phase.active ? riseFrame(phase.p) : { opacity: 0, travel: 0 };
  });
  const opacity = useDerivedValue(() => frame.value.opacity);
  const transform = useDerivedValue(() => [
    { translateX: cx + drift * frame.value.travel },
    { translateY: cy - rise * frame.value.travel },
  ]);
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={0} cy={0} r={r * 1.4} color={color} opacity={0.8}>
        <BlurMask blur={4} style="normal" />
      </Circle>
      <Circle cx={0} cy={0} r={r}>
        <RadialGradient c={{ x: 0, y: 0 }} r={r} colors={["#ffffff", "#ffffff", color, CLEAR]} positions={[0, 0.3, 0.6, 0.72]} />
      </Circle>
    </Group>
  );
}

interface SealCanvasProps {
  tier: BadgeTier;
  size: number;
  timing: SealTiming;
  pointer: SharedValue<SealPointer>;
  /** Sparkles, glitter and particles; skipped at list sizes. */
  sparkles: boolean;
}

export function SealCanvas({ tier, size, timing, pointer, sparkles }: SealCanvasProps) {
  const effect = SEAL_EFFECTS[tier];
  const image = useImage(SEAL_ART[badgeTierSlug(tier)]);
  const pad = size * sealBleed(effect);
  const total = size + pad * 2;
  const box: Box = { left: pad, top: pad, size };
  const fx: Box = { left: pad - size * 0.14, top: pad - size * 0.14, size: size * 1.28 };
  const pivot = { x: pad + size * 0.5, y: pad + size * 0.88 };
  const body = useDerivedValue(() => {
    let rotate = 0;
    let scale = 1;
    if (!timing.still) {
      if (effect.sway) {
        const phase = phaseOf(timing, effect.sway);
        if (phase.active) rotate = (swayDegrees(phase.p) * Math.PI) / 180;
      }
      if (effect.breathe) {
        const phase = phaseOf(timing, effect.breathe);
        if (phase.active) scale = breatheScale(phase.p);
      }
    }
    return [{ rotate }, { scale }];
  });
  const clip = useMemo(() => Skia.XYWHRect(pad + CLIP_INSET, pad + CLIP_INSET, size - CLIP_INSET * 2, size - CLIP_INSET * 2), [pad, size]);
  const art = { image, x: box.left, y: box.top, width: size, height: size, fit: "contain" as const };
  const sparkSet = effect.sparks;

  return (
    <Canvas pointerEvents="none" style={{ position: "absolute", left: -pad, top: -pad, width: total, height: total }}>
      {effect.rays && <RaysLayer box={box} timing={timing} duration={effect.rays.duration} />}
      {effect.halo && <HaloLayer spec={effect.halo} box={box} timing={timing} />}
      {image && (
        <Group transform={body} origin={pivot}>
          <Group layer={<Paint><Shadow dx={0} dy={size * 0.04} blur={size * 0.05} color="rgba(0,0,0,0.45)" /></Paint>}>
            <Image {...art} />
            {/* Light layers stay inside the art's rect (inset), the only area the final dstIn fully masks. */}
            <Group clip={clip}>
              {effect.tint && (effect.tint.kind === "glow"
                ? <GlowLayer spec={effect.tint} box={box} timing={timing} />
                : <SweepLayer spec={effect.tint} box={box} timing={timing} pointer={pointer} />)}
              {effect.holo && <HoloLayer spec={effect.holo} box={box} timing={timing} pointer={pointer} />}
              {effect.glitter && sparkles && <GlitterLayer box={box} timing={timing} duration={effect.glitter.duration} />}
              {effect.sheen && (effect.sheen.kind === "glow"
                ? <GlowLayer spec={effect.sheen} box={box} timing={timing} />
                : <SweepLayer spec={effect.sheen} box={box} timing={timing} pointer={pointer} />)}
              {effect.knife && <KnifeLayer box={box} timing={timing} duration={effect.knife.duration} />}
            </Group>
            <Image {...art} blendMode="dstIn" />
          </Group>
        </Group>
      )}
      {sparkles && sparkSet?.items.map((spec, index) => (
        <Sparkle key={`spark-${index}`} spec={spec} color={sparkSet.colors[index % sparkSet.colors.length]!}
          duration={sparkSet.durations(index)} fx={fx} timing={timing} />
      ))}
      {sparkles && effect.particles && Array.from({ length: 9 }, (_, index) => (
        <Particle key={`particle-${index}`} index={index} fx={fx} size={size} timing={timing} />
      ))}
    </Canvas>
  );
}

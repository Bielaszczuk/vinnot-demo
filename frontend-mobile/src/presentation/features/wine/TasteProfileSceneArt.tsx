/**
 * The taste quiz finish told in four watercolor scenes on the loading engine: a fountain pen
 * draws the member's own picks into a tasting journal, they float into a glass that fills
 * with wine, a brush mixes colours on a palette, and paints the taste wheel petal by petal
 * around a glass of red wine seen from above. `progress` runs from 0, the opening pose, to 1,
 * the finished one; the wheel goes on to REPLAY_FADE_END to fade before it is painted again.
 */
import { Image, StyleSheet } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import brushImage from "../../../../assets/images/loading/brush.webp";
import glassTopGarnetImage from "../../../../assets/images/loading/glass-top-garnet.webp";
import glassTopImage from "../../../../assets/images/loading/glass-top.webp";
import handwritingImage from "../../../../assets/images/loading/handwriting.webp";
import journalFlatImage from "../../../../assets/images/loading/journal-flat.webp";
import paletteImage from "../../../../assets/images/loading/palette.webp";
import petalAmber from "../../../../assets/images/loading/petal-amber.webp";
import petalGold from "../../../../assets/images/loading/petal-gold.webp";
import petalRose from "../../../../assets/images/loading/petal-rose.webp";
import petalRuby from "../../../../assets/images/loading/petal-ruby.webp";
import petalSage from "../../../../assets/images/loading/petal-sage.webp";
import petalViolet from "../../../../assets/images/loading/petal-violet.webp";
import penImage from "../../../../assets/images/loading/pen.webp";
import type { TasteQuizOptionKey } from "@/domain/tasteQuiz/tasteQuiz.types";
import { TASTE_QUIZ_ART } from "@/shared/profileArt";
import type { TasteProfileScene, WineProcessScene } from "./WineProcessJourney";
import {
  FilledGlass,
  REPLAY_FADE_END,
  SCENE_ART_SIZE,
  Sprite,
  glasses,
  Wisp,
  handwritingLines,
  phase,
  wisps,
  type Art,
  type Progress,
} from "./WineProcessSceneArt";
import { wineSceneLook } from "./wineSceneLook";

/** The quiz options the member picked, in question order. */
export type TasteScenePicks = readonly TasteQuizOptionKey[];

const CENTER = SCENE_ART_SIZE / 2;

const art = {
  journalFlat: { source: journalFlatImage, w: 360, h: 258 },
  pen: { source: penImage, w: 137, h: 150 },
  handwriting: { source: handwritingImage, w: 200, h: 128 },
  glassTop: { source: glassTopImage, w: 240, h: 243 },
  glassTopGarnet: { source: glassTopGarnetImage, w: 240, h: 243 },
  palette: { source: paletteImage, w: 275, h: 280 },
  brush: { source: brushImage, w: 271, h: 280 },
  petalRuby: { source: petalRuby, w: 213, h: 280 },
  petalRose: { source: petalRose, w: 215, h: 280 },
  petalGold: { source: petalGold, w: 217, h: 280 },
  petalSage: { source: petalSage, w: 213, h: 280 },
  petalViolet: { source: petalViolet, w: 216, h: 280 },
  petalAmber: { source: petalAmber, w: 215, h: 280 },
} satisfies Record<string, Art>;


/** Where the brush's tip is in its layer, as fractions: the bristles point down to the left. */
export const BRUSH_TIP = { x: 0.022, y: 0.986 } as const;

const TASTE_PROFILE_SCENES: ReadonlySet<WineProcessScene> = new Set<WineProcessScene>([
  "quizPicks",
  "quizGlass",
  "quizBlend",
  "quizWheel",
]);

export function isTasteProfileScene(scene: WineProcessScene): scene is TasteProfileScene {
  return TASTE_PROFILE_SCENES.has(scene);
}

type Point = { x: number; y: number };

function lerp(from: Point, to: Point, t: number): Point {
  "worklet";
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/* ------------------------------------------------------------------ 1. Picks drawn into the journal */

/**
 * The open journal seen from above. At this size both pages stay inside the round stage;
 * only the leather corners meet its edge.
 */
const JOURNAL_SCALE = 0.36;
/** The middle of the two pages, in journal pixels: the journal is placed so it sits at the stage centre. */
const PAGES_CENTER_Y = 112;
/** Sketch side and the note lines beside it, in journal pixels. */
const SKETCH_PX = 44;
const NOTE_GAP_PX = 7;
const NOTE_PX = 66;
/**
 * One entry per pick, laid out like a tasting journal: three on the left page, two on the
 * right, each sketch's top-left corner in journal pixels with a slight page-aligned tilt.
 */
const JOURNAL_ENTRIES = [
  { x: 40, y: 30, tilt: -1.5 },
  { x: 40, y: 90, tilt: 1 },
  { x: 40, y: 150, tilt: -1 },
  { x: 199, y: 60, tilt: 1.5 },
  { x: 199, y: 120, tilt: -1 },
] as const;
/** The handwriting lines each entry's note uses, skipping the title line. */
const NOTE_LINES = [
  [1, 2],
  [3, 4],
  [5, 1],
  [2, 3],
  [4, 5],
] as const;
/** The handwriting layer's scale, so a note line sits small beside its sketch. */
const NOTE_INK_SCALE = 0.15;
/** Watercolour on paper: the sketch multiplies into the page and lets its grain through. */
const SKETCH_INK_OPACITY = 0.86;
const PEN_SCALE = 0.2;
/** Where the fountain pen's nib is in its layer, as fractions: it points down to the left. */
export const PEN_NIB = { x: 0.06, y: 0.99 } as const;
/** The entries are drawn up to here; then the pen lifts off the page and leaves. */
const DRAW_END = 0.88;
/** Shares of an entry's time: drawing the sketch, writing its two note lines, then reaching the next one. */
const SKETCH_SHARE = 0.55;
const NOTE_SHARE = 0.35;
/** Where the pen goes when it leaves, in stage points: off the lower right of the page. */
const PEN_EXIT = { x: 150, y: 132 } as const;

interface NoteLine {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Top of this line in the handwriting layer, in points. */
  offset: number;
  start: number;
  end: number;
}

interface JournalEntry {
  x: number;
  y: number;
  size: number;
  tilt: number;
  start: number;
  drawn: number;
  lines: readonly [NoteLine, NoteLine];
}

/** Where each pick is drawn and when, given how many picks there are. */
function journalEntries(count: number, journalX: number, journalY: number): JournalEntry[] {
  const used = Math.min(count, JOURNAL_ENTRIES.length);
  const span = used > 0 ? DRAW_END / used : 0;
  const inkHeight = art.handwriting.h * NOTE_INK_SCALE;
  return JOURNAL_ENTRIES.slice(0, used).map((entry, index) => {
    const x = journalX + entry.x * JOURNAL_SCALE;
    const y = journalY + entry.y * JOURNAL_SCALE;
    const size = SKETCH_PX * JOURNAL_SCALE;
    const start = index * span;
    const drawn = start + SKETCH_SHARE * span;
    const lineTime = (NOTE_SHARE * span) / 2;
    const line = (handwritingLine: number, row: number): NoteLine => {
      const [top, bottom] = handwritingLines[handwritingLine]!;
      const height = (bottom - top) * inkHeight;
      return {
        x: x + size + NOTE_GAP_PX * JOURNAL_SCALE,
        // Two lines centred on the sketch, like notes written beside it.
        y: y + size / 2 - height - 0.6 + row * (height + 1.2),
        width: Math.min(NOTE_PX * JOURNAL_SCALE, art.handwriting.w * NOTE_INK_SCALE),
        height,
        offset: top * inkHeight,
        start: drawn + row * lineTime,
        end: drawn + (row + 1) * lineTime,
      };
    };
    const [first, second] = NOTE_LINES[index]!;
    return { x, y, size, tilt: entry.tilt, start, drawn, lines: [line(first, 0), line(second, 1)] };
  });
}

/** Where the nib is while it draws a sketch: it hatches up and down as it moves across. */
function hatching(entry: JournalEntry, t: number): Point {
  "worklet";
  return { x: entry.x + entry.size * t, y: entry.y + entry.size * (0.5 + 0.36 * Math.sin(t * Math.PI * 6)) };
}

/** Where the nib is while it writes a note line, with the slight wobble of handwriting. */
function writing(line: NoteLine, t: number): Point {
  "worklet";
  return { x: line.x + line.width * t, y: line.y + line.height / 2 + 0.4 * Math.sin(t * Math.PI * 8) };
}

/**
 * The fountain pen draws each pick on the journal's pages and writes a short note beside it;
 * every stroke appears exactly where the nib passes, and the pen leaves once the page is done.
 */
function PicksScene({ progress, picks }: { progress: Progress; picks: TasteScenePicks }) {
  const x = (SCENE_ART_SIZE - art.journalFlat.w * JOURNAL_SCALE) / 2;
  const y = CENTER - PAGES_CENTER_Y * JOURNAL_SCALE;
  const entries = journalEntries(picks.length, x, y);
  const nibX = PEN_NIB.x * art.pen.w * PEN_SCALE;
  const nibY = PEN_NIB.y * art.pen.h * PEN_SCALE;

  const pen = useAnimatedStyle(() => {
    const p = progress.value;
    const count = entries.length;
    if (count === 0) return { opacity: 0 };
    const index = Math.min(Math.floor((p * count) / DRAW_END), count - 1);
    const entry = entries[index]!;
    const [first, second] = entry.lines;
    let nib: Point;
    let opacity = 1;
    if (p <= entry.drawn) {
      nib = hatching(entry, phase(p, entry.start, entry.drawn));
    } else if (p <= first.end) {
      nib = writing(first, phase(p, first.start, first.end));
    } else if (p <= second.end) {
      nib = writing(second, phase(p, second.start, second.end));
    } else {
      const from = writing(second, 1);
      const next = entries[index + 1];
      if (next) {
        nib = lerp(from, hatching(next, 0), phase(p, second.end, next.start));
      } else {
        const away = phase(p, second.end, 1);
        nib = lerp(from, PEN_EXIT, away);
        opacity = 1 - away;
      }
    }
    return { opacity, transform: [{ translateX: nib.x - nibX }, { translateY: nib.y - nibY }] };
  });

  return (
    <>
      <Sprite testID="scene-picks-journal" item={art.journalFlat} scale={JOURNAL_SCALE} x={x} y={y} />
      {entries.map((entry, index) => (
        <JournalSketch key={index} progress={progress} pick={picks[index]!} entry={entry} />
      ))}
      <Sprite testID="scene-picks-pen" item={art.pen} scale={PEN_SCALE} x={0} y={0} style={pen} />
    </>
  );
}

interface JournalSketchProps {
  progress: Progress;
  pick: TasteQuizOptionKey;
  entry: JournalEntry;
}

/** One pick drawn on the page, uncovered from left to right as the nib passes, and its note. */
function JournalSketch({ progress, pick, entry }: JournalSketchProps) {
  const { x, y, size, tilt, start, drawn, lines } = entry;
  const reveal = useAnimatedStyle(() => ({ width: size * phase(progress.value, start, drawn) }));
  return (
    <>
      <Animated.View
        testID="scene-picks-sketch"
        pointerEvents="none"
        style={[
          styles.clip,
          styles.sketch,
          { left: x, top: y, height: size, transform: [{ rotate: `${tilt}deg` }] },
          reveal,
        ]}
      >
        <Image source={TASTE_QUIZ_ART[pick]} style={{ width: size, height: size }} />
      </Animated.View>
      {lines.map((line) => (
        <NoteLineInk key={line.start} progress={progress} line={line} />
      ))}
    </>
  );
}

/** One handwritten line of a note, written from left to right as the pen passes. */
function NoteLineInk({ progress, line }: { progress: Progress; line: NoteLine }) {
  const written = useAnimatedStyle(() => ({ width: line.width * phase(progress.value, line.start, line.end) }));
  return (
    <Animated.View
      testID="scene-picks-note"
      pointerEvents="none"
      style={[styles.clip, styles.ink, { left: line.x, top: line.y, height: line.height }, written]}
    >
      <Image
        source={art.handwriting.source}
        style={{
          position: "absolute",
          top: -line.offset,
          width: art.handwriting.w * NOTE_INK_SCALE,
          height: art.handwriting.h * NOTE_INK_SCALE,
        }}
      />
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ 2. Filling the glass */

const GLASS_SCALE = 0.28;
const RED = wineSceneLook("red");
/** The glass fills first, then its aromas rise. */
const FILL_START = 0.06;
const FILL_END = 0.6;
const WISP_SCALE = 0.19;

/** An empty glass fills with red wine and its aromas rise: the picks became this glass. */
function GlassScene({ progress }: { progress: Progress }) {
  const { glass } = glasses[RED.glass];
  const width = glass.w * GLASS_SCALE;
  const height = glass.h * GLASS_SCALE;
  const x = (SCENE_ART_SIZE - width) / 2;
  const y = SCENE_ART_SIZE - height - 4;
  const rim = y + 0.12 * height;

  return (
    <>
      <FilledGlass
        testID="scene-glass-glass"
        progress={progress}
        look={RED}
        scale={GLASS_SCALE}
        x={x}
        y={y}
        from={0}
        to={1}
        start={FILL_START}
        end={FILL_END}
      />
      {wisps.map((wisp, index) => (
        <Wisp
          key={index}
          testID="scene-glass-wisp"
          progress={progress}
          item={wisp}
          scale={WISP_SCALE}
          x={SCENE_ART_SIZE / 2 - (wisp.w * WISP_SCALE) / 2 + (index - 1) * 13}
          y={rim - wisp.h * WISP_SCALE}
          start={0.5 + index * 0.1}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ 3. Blending on the palette */

const PALETTE_SCALE = 0.4;
const BLEND_BRUSH_SCALE = 0.26;
/** Centres of the wells the brush dips into, and of the mixing well, in palette pixels. */
const WELLS = {
  ruby: { x: 97, y: 62 },
  gold: { x: 217, y: 136 },
  violet: { x: 91, y: 205 },
  mix: { x: 137.5, y: 140 },
} as const;
/** The three colours that meet in the middle: ruby, gold and violet, as painted in the wells. */
const SWIRL_COLORS = ["#A3263D", "#E2A52C", "#7B4697"] as const;
const SWIRL_SIZE = 18;
const SWIRL_START = 0.72;
const SWIRL_END = 0.96;

/** The brush dips into three wells, then swirls the colours together in the mixing well. */
function BlendScene({ progress }: { progress: Progress }) {
  const width = art.palette.w * PALETTE_SCALE;
  const height = art.palette.h * PALETTE_SCALE;
  const x = (SCENE_ART_SIZE - width) / 2;
  const y = (SCENE_ART_SIZE - height) / 2;
  const at = (well: Point): Point => ({ x: x + well.x * PALETTE_SCALE, y: y + well.y * PALETTE_SCALE });
  const ruby = at(WELLS.ruby);
  const gold = at(WELLS.gold);
  const violet = at(WELLS.violet);
  const mix = at(WELLS.mix);
  const rest = { x: x + width - 4, y: y + 22 };
  const tipX = BRUSH_TIP.x * art.brush.w * BLEND_BRUSH_SCALE;
  const tipY = BRUSH_TIP.y * art.brush.h * BLEND_BRUSH_SCALE;

  const brush = useAnimatedStyle(() => {
    const p = progress.value;
    // Rest → ruby, dip → gold, dip → violet, dip → the mixing well, then swirl to a stop.
    let tip = lerp(rest, ruby, phase(p, 0, 0.1));
    if (p > 0.2) tip = lerp(ruby, gold, phase(p, 0.2, 0.32));
    if (p > 0.42) tip = lerp(gold, violet, phase(p, 0.42, 0.54));
    if (p > 0.64) tip = lerp(violet, mix, phase(p, 0.64, SWIRL_START));
    const dip =
      2.5 * (Math.sin(phase(p, 0.1, 0.2) * Math.PI) + Math.sin(phase(p, 0.32, 0.42) * Math.PI) + Math.sin(phase(p, 0.54, 0.64) * Math.PI));
    const turn = phase(p, SWIRL_START, SWIRL_END) * 4 * Math.PI;
    const radius = 9 * (1 - phase(p, 0.86, SWIRL_END)) * (p > SWIRL_START ? 1 : 0);
    return {
      transform: [
        { translateX: tip.x + radius * Math.cos(turn) - tipX },
        { translateY: tip.y + dip + radius * Math.sin(turn) - tipY },
      ],
    };
  });

  return (
    <>
      <Sprite testID="scene-blend-palette" item={art.palette} scale={PALETTE_SCALE} x={x} y={y} />
      {SWIRL_COLORS.map((color, index) => (
        <SwirlBlob key={color} progress={progress} center={mix} color={color} offset={(index * 2 * Math.PI) / 3} />
      ))}
      <Sprite testID="scene-blend-brush" item={art.brush} scale={BLEND_BRUSH_SCALE} x={0} y={0} style={brush} />
    </>
  );
}

interface SwirlBlobProps {
  progress: Progress;
  center: Point;
  color: string;
  offset: number;
}

/** One colour turning around the mixing well; the three draw closer and blend as the brush slows. */
function SwirlBlob({ progress, center, color, offset }: SwirlBlobProps) {
  const swirl = useAnimatedStyle(() => {
    const t = phase(progress.value, SWIRL_START, SWIRL_END);
    const angle = offset + t * 4 * Math.PI;
    const radius = 7 * (1 - 0.6 * t);
    return {
      opacity: 0.5 * phase(progress.value, SWIRL_START - 0.04, SWIRL_START + 0.08),
      transform: [{ translateX: radius * Math.cos(angle) }, { translateY: radius * Math.sin(angle) }],
    };
  });
  return (
    <Animated.View
      testID="scene-blend-swirl"
      pointerEvents="none"
      style={[
        styles.blob,
        { left: center.x - SWIRL_SIZE / 2, top: center.y - SWIRL_SIZE / 2, backgroundColor: color },
        swirl,
      ]}
    />
  );
}

/* ------------------------------------------------------------------ 4. Painting the wheel */

const PETALS = [art.petalRuby, art.petalRose, art.petalGold, art.petalSage, art.petalViolet, art.petalAmber];
const PETAL_HEIGHT = 37;
/** The glass of red wine at the centre, seen from above, and the gap between its rim and the petals' points. */
const GLASS_TOP_SIZE = 36;
const RIM_GAP = 5;
/** How far from the centre each petal's point sits: just outside the glass. */
const PETAL_INNER = GLASS_TOP_SIZE / 2 + RIM_GAP;
/** The wine swirls once in the glass while the wheel is painted, and is still again by the end. */
const SWIRL_TURN = 28;
const WHEEL_BRUSH_SCALE = 0.22;
/** The brush strokes over the wide part of each petal. */
const STROKE_RADIUS = PETAL_INNER + PETAL_HEIGHT * 0.62;
/** The brush reaches the wheel, sweeps once around it, and lifts away. */
const SWEEP_START = 0.1;
const SWEEP_END = 0.86;
const SWEEP_FROM = -30;
const SWEEP_TO = 330;
/** A petal appears while the brush passes this many degrees either side of it. */
const PETAL_REACH = 25;

/** Angle of the brush around the wheel, in degrees clockwise from the top. */
function sweepAngle(value: number) {
  "worklet";
  return interpolate(value, [SWEEP_START, SWEEP_END], [SWEEP_FROM, SWEEP_TO], Extrapolation.CLAMP);
}

function onWheel(degrees: number, radius: number): Point {
  "worklet";
  const radians = (degrees * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(radians), y: CENTER - radius * Math.cos(radians) };
}

/** The brush paints the six petals one by one around a glass of red wine seen from above. */
function WheelScene({ progress }: { progress: Progress }) {
  const tipX = BRUSH_TIP.x * art.brush.w * WHEEL_BRUSH_SCALE;
  const tipY = BRUSH_TIP.y * art.brush.h * WHEEL_BRUSH_SCALE;
  const rest = { x: 104, y: 26 };
  const glassScale = GLASS_TOP_SIZE / art.glassTop.w;
  const glassX = CENTER - (art.glassTop.w * glassScale) / 2;
  const glassY = CENTER - (art.glassTop.h * glassScale) / 2;

  const brush = useAnimatedStyle(() => {
    const p = progress.value;
    const angle = sweepAngle(p);
    // A small in-and-out along each petal, like a brushstroke.
    const stroke = onWheel(angle, STROKE_RADIUS + 3 * Math.sin((angle * Math.PI) / 30));
    let tip = lerp(rest, onWheel(SWEEP_FROM, STROKE_RADIUS), phase(p, 0, SWEEP_START));
    if (p > SWEEP_START) tip = stroke;
    if (p > SWEEP_END) tip = lerp(stroke, rest, phase(p, SWEEP_END, 1));
    return { transform: [{ translateX: tip.x - tipX }, { translateY: tip.y - tipY }] };
  });
  // The swirled wine fades in and out over the plain one as the brush goes round.
  const swirl = useAnimatedStyle(() => {
    const t = phase(progress.value, SWEEP_START, 1);
    return { opacity: 0.85 * Math.sin(t * Math.PI), transform: [{ rotate: `${SWIRL_TURN * t}deg` }] };
  });

  return (
    <>
      {PETALS.map((petal, index) => (
        <Petal key={index} progress={progress} item={petal} angle={index * 60} />
      ))}
      <Sprite testID="scene-wheel-glass" item={art.glassTop} scale={glassScale} x={glassX} y={glassY} />
      <Sprite
        testID="scene-wheel-swirl"
        item={art.glassTopGarnet}
        scale={glassScale}
        x={glassX}
        y={glassY}
        style={swirl}
      />
      <Sprite testID="scene-wheel-brush" item={art.brush} scale={WHEEL_BRUSH_SCALE} x={0} y={0} style={brush} />
    </>
  );
}

interface PetalProps {
  progress: Progress;
  item: Art;
  /** Degrees clockwise from the top. */
  angle: number;
}

/**
 * One petal, painted pointing down: placed out from the centre along its angle and turned
 * by the same angle, so its point faces the glass.
 */
function Petal({ progress, item, angle }: PetalProps) {
  const scale = PETAL_HEIGHT / item.h;
  const width = item.w * scale;
  const centre = onWheel(angle, PETAL_INNER + PETAL_HEIGHT / 2);
  const paint = useAnimatedStyle(() => {
    const p = progress.value;
    const painted = Math.min(Math.max((sweepAngle(p) - (angle - PETAL_REACH)) / (2 * PETAL_REACH), 0), 1);
    return {
      opacity: painted * (1 - phase(p, 1, REPLAY_FADE_END)),
      transform: [{ rotate: `${angle}deg` }, { scale: 0.55 + 0.45 * painted }],
    };
  });
  return (
    <Sprite
      testID="scene-wheel-petal"
      item={item}
      scale={scale}
      x={centre.x - width / 2}
      y={centre.y - PETAL_HEIGHT / 2}
      style={paint}
    />
  );
}

/* ------------------------------------------------------------------ */

interface TasteProfileSceneArtProps {
  scene: TasteProfileScene;
  progress: Progress;
  picks: TasteScenePicks;
}

/** The drawing of a taste quiz finish step. */
export function TasteProfileSceneArt({ scene, progress, picks }: TasteProfileSceneArtProps) {
  switch (scene) {
    case "quizPicks":
      return <PicksScene progress={progress} picks={picks} />;
    case "quizGlass":
      return <GlassScene progress={progress} />;
    case "quizBlend":
      return <BlendScene progress={progress} />;
    case "quizWheel":
      return <WheelScene progress={progress} />;
  }
}

const styles = StyleSheet.create({
  clip: { position: "absolute", overflow: "hidden" },
  /** Painted into the paper: multiplied with the page, no shadow, a touch translucent. */
  sketch: { opacity: SKETCH_INK_OPACITY, mixBlendMode: "multiply" },
  ink: { opacity: 0.9, mixBlendMode: "multiply" },
  blob: {
    position: "absolute",
    width: SWIRL_SIZE,
    height: SWIRL_SIZE,
    borderRadius: SWIRL_SIZE / 2,
  },
});

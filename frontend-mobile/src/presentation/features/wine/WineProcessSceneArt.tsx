import { useEffect, type ComponentProps, type ReactNode } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import balanceBeam from "../../../../assets/images/loading/balance-beam.webp";
import balancePan from "../../../../assets/images/loading/balance-pan.webp";
import balanceStand from "../../../../assets/images/loading/balance-stand.webp";
import bottleOpen from "../../../../assets/images/loading/bottle.webp";
import bottleClearAmber from "../../../../assets/images/loading/bottle-clear-amber.webp";
import bottleClearRose from "../../../../assets/images/loading/bottle-clear-rose.webp";
import bottleClearWhite from "../../../../assets/images/loading/bottle-clear-white.webp";
import bottleSparkling from "../../../../assets/images/loading/bottle-sparkling.webp";
import cageImage from "../../../../assets/images/loading/cage.webp";
import corkImage from "../../../../assets/images/loading/cork.webp";
import corkSparklingImage from "../../../../assets/images/loading/cork-sparkling.webp";
import corkscrewImage from "../../../../assets/images/loading/corkscrew.webp";
import glassFlute from "../../../../assets/images/loading/glass-flute.webp";
import glassRed from "../../../../assets/images/loading/glass-red.webp";
import glassRose from "../../../../assets/images/loading/glass-rose.webp";
import glassTulip from "../../../../assets/images/loading/glass-tulip.webp";
import grapesRed from "../../../../assets/images/loading/grapes-red.webp";
import grapesWhite from "../../../../assets/images/loading/grapes-white.webp";
import handwritingImage from "../../../../assets/images/loading/handwriting.webp";
import magnifierImage from "../../../../assets/images/loading/magnifier.webp";
import paperImage from "../../../../assets/images/loading/paper.webp";
import penImage from "../../../../assets/images/loading/pen.webp";
import wineAmber from "../../../../assets/images/loading/wine-amber.webp";
import wineRed from "../../../../assets/images/loading/wine-red.webp";
import wineRose from "../../../../assets/images/loading/wine-rose.webp";
import wineRuby from "../../../../assets/images/loading/wine-ruby.webp";
import wineSparkling from "../../../../assets/images/loading/wine-sparkling.webp";
import wineWhite from "../../../../assets/images/loading/wine-white.webp";
import wispOne from "../../../../assets/images/loading/wisp-1.webp";
import wispTwo from "../../../../assets/images/loading/wisp-2.webp";
import wispThree from "../../../../assets/images/loading/wisp-3.webp";
import type { WineProcessScene, WineScene } from "./WineProcessJourney";
import {
  POUR_COLORS,
  type SceneGlass,
  type SceneWine,
  type WineSceneLook,
  type WineSceneLooks,
} from "./wineSceneLook";

/** Side of the square stage, in points; the scenes are laid out on it. */
export const SCENE_ART_SIZE = 128;
const CENTER = SCENE_ART_SIZE / 2;

export type Progress = SharedValue<number>;
type LayerStyle = ComponentProps<typeof Animated.View>["style"];

export interface Art {
  source: ImageSourcePropType;
  /** Pixel size of the prepared watercolor layer. */
  w: number;
  h: number;
}

const art = {
  bottle: { source: bottleOpen, w: 239, h: 297 },
  bottleClearWhite: { source: bottleClearWhite, w: 242, h: 306 },
  bottleClearRose: { source: bottleClearRose, w: 242, h: 306 },
  bottleClearAmber: { source: bottleClearAmber, w: 242, h: 306 },
  bottleSparkling: { source: bottleSparkling, w: 237, h: 296 },
  cork: { source: corkImage, w: 76, h: 172 },
  corkSparkling: { source: corkSparklingImage, w: 113, h: 160 },
  cage: { source: cageImage, w: 135, h: 149 },
  corkscrew: { source: corkscrewImage, w: 224, h: 273 },
  glassRed: { source: glassRed, w: 298, h: 331 },
  wineRed: { source: wineRed, w: 298, h: 331 },
  wineRuby: { source: wineRuby, w: 298, h: 331 },
  glassRose: { source: glassRose, w: 299, h: 334 },
  wineRose: { source: wineRose, w: 299, h: 334 },
  glassTulip: { source: glassTulip, w: 298, h: 339 },
  wineWhite: { source: wineWhite, w: 298, h: 339 },
  wineAmber: { source: wineAmber, w: 298, h: 339 },
  glassFlute: { source: glassFlute, w: 300, h: 339 },
  wineSparkling: { source: wineSparkling, w: 300, h: 339 },
  wispOne: { source: wispOne, w: 50, h: 150 },
  wispTwo: { source: wispTwo, w: 45, h: 150 },
  wispThree: { source: wispThree, w: 52, h: 150 },
  paper: { source: paperImage, w: 236, h: 330 },
  handwriting: { source: handwritingImage, w: 200, h: 128 },
  pen: { source: penImage, w: 137, h: 150 },
  stand: { source: balanceStand, w: 132, h: 236 },
  beam: { source: balanceBeam, w: 247, h: 76 },
  pan: { source: balancePan, w: 145, h: 184 },
  grapesRed: { source: grapesRed, w: 132, h: 150 },
  grapesWhite: { source: grapesWhite, w: 143, h: 150 },
  magnifier: { source: magnifierImage, w: 202, h: 220 },
} satisfies Record<string, Art>;

export const wisps = [art.wispOne, art.wispTwo, art.wispThree];
const grapes = { red: art.grapesRed, white: art.grapesWhite } as const;

type Box = readonly [x: number, y: number, width: number, height: number];

interface GlassArt {
  glass: Art;
  /** Where the wine sits inside the glass layer, as fractions of the layer. */
  wineBox: Box;
}

export const glasses: Record<SceneGlass, GlassArt> = {
  bordeaux: { glass: art.glassRed, wineBox: [0.292, 0.349, 0.423, 0.235] },
  rose: { glass: art.glassRose, wineBox: [0.284, 0.347, 0.433, 0.23] },
  tulip: { glass: art.glassTulip, wineBox: [0.323, 0.347, 0.356, 0.152] },
  flute: { glass: art.glassFlute, wineBox: [0.381, 0.263, 0.235, 0.245] },
};

/** The wine layer of each colour, drawn on the canvas of the glass it is served in. */
const wines: Record<SceneWine, Art> = {
  red: art.wineRed,
  ruby: art.wineRuby,
  rose: art.wineRose,
  white: art.wineWhite,
  amber: art.wineAmber,
  sparkling: art.wineSparkling,
};

/** The bottle opened in the first profile step; clear bottles show the wine inside. */
function bottleArt(look: WineSceneLook): Art {
  if (look.bottle === "dark") return art.bottle;
  if (look.bottle === "sparkling") return art.bottleSparkling;
  if (look.wine === "rose") return art.bottleClearRose;
  if (look.wine === "amber") return art.bottleClearAmber;
  return art.bottleClearWhite;
}

/** Where the open lip sits in each bottle layer, in layer pixels: centre of the neck and top of the lip. */
const BOTTLE_LIP: Record<WineSceneLook["bottle"], { x: number; y: number }> = {
  dark: { x: 122, y: 8 },
  clear: { x: 124.5, y: 9 },
  sparkling: { x: 121.5, y: 8 },
};

/** Lines of the handwriting layer: top and bottom as fractions of its height. */
export const handwritingLines = [
  [0, 0.203],
  [0.235, 0.383],
  [0.388, 0.526],
  [0.537, 0.644],
  [0.684, 0.827],
  [0.852, 1],
] as const;

/** 0 before `start`, 1 after `end`, eased in and out between them. */
export function phase(value: number, start: number, end: number) {
  "worklet";
  const t = interpolate(value, [start, end], [0, 1], Extrapolation.CLAMP);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** 0 before `start`, 1 after `end`, slowing down like an object coming to rest. */
export function settle(value: number, start: number, end: number) {
  "worklet";
  const t = interpolate(value, [start, end], [0, 1], Extrapolation.CLAMP);
  return 1 - Math.pow(1 - t, 3);
}

interface SpriteProps {
  item: Art;
  scale: number;
  x: number;
  y: number;
  style?: LayerStyle;
  children?: ReactNode;
  testID?: string;
}

/** A watercolor layer placed on the stage, optionally moved by an animated style. */
export function Sprite({ item, scale, x, y, style, children, testID }: SpriteProps) {
  const width = item.w * scale;
  const height = item.h * scale;
  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      style={[styles.layer, { left: x, top: y, width, height }, style]}
    >
      <Image source={item.source} style={{ width, height }} />
      {children}
    </Animated.View>
  );
}

interface FilledGlassProps {
  progress: Progress;
  look: WineSceneLook;
  scale: number;
  x: number;
  y: number;
  /** Wine level at the start and at the end: 0 is empty, 1 is the illustration's pour. */
  from: number;
  to: number;
  start: number;
  end: number;
  testID?: string;
}

/** A glass whose wine rises or falls: the wine layer is uncovered from the bottom up. */
export function FilledGlass({ progress, look, scale, x, y, from, to, start, end, testID }: FilledGlassProps) {
  const { glass, wineBox } = glasses[look.glass];
  const width = glass.w * scale;
  const height = glass.h * scale;
  const [bx, by, bw, bh] = wineBox;
  const left = bx * width;
  const top = by * height;
  const boxWidth = bw * width;
  const boxHeight = bh * height;

  const surface = useAnimatedStyle(() => {
    const level = from + (to - from) * phase(progress.value, start, end);
    return { top: top + boxHeight * (1 - level), height: boxHeight * level };
  });
  const wineOffset = useAnimatedStyle(() => {
    const level = from + (to - from) * phase(progress.value, start, end);
    return { top: -(top + boxHeight * (1 - level)) };
  });

  return (
    <Sprite item={glass} scale={scale} x={x} y={y} testID={testID}>
      <Animated.View
        testID={testID ? `${testID}-wine` : undefined}
        style={[styles.clip, { left, width: boxWidth }, surface]}
      >
        <Animated.View style={[styles.layer, { left: -left, width, height }, wineOffset]}>
          <Image
            testID={testID ? `${testID}-${look.wine}` : undefined}
            source={wines[look.wine].source}
            style={{ width, height }}
          />
          {look.wine === "sparkling" ? (
            <Bubbles left={left} top={top} width={boxWidth} height={boxHeight} testID={testID} />
          ) : null}
        </Animated.View>
      </Animated.View>
    </Sprite>
  );
}

/** Where each bubble rises, as a fraction of the wine's width, and how far through its climb it starts. */
const BUBBLES = [
  [0.3, 0],
  [0.62, 0.35],
  [0.45, 0.62],
  [0.74, 0.18],
  [0.38, 0.84],
] as const;
const BUBBLE_RISE_MS = 1500;

interface BubblesProps {
  left: number;
  top: number;
  width: number;
  height: number;
  testID?: string;
}

/** Bubbles rising through sparkling wine, all the time; the wine's surface hides them as they reach it. */
function Bubbles({ left, top, width, height, testID }: BubblesProps) {
  const reduceMotion = useReducedMotion();
  const rise = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    rise.value = withRepeat(withTiming(1, { duration: BUBBLE_RISE_MS, easing: Easing.linear }), -1, false);
  }, [reduceMotion, rise]);
  return (
    <>
      {BUBBLES.map(([across, offset]) => (
        <Bubble
          key={across}
          rise={rise}
          x={left + across * width}
          bottom={top + height}
          climb={height}
          offset={offset}
          testID={testID ? `${testID}-bubble` : undefined}
        />
      ))}
    </>
  );
}

interface BubbleProps {
  rise: SharedValue<number>;
  x: number;
  bottom: number;
  climb: number;
  offset: number;
  testID?: string;
}

function Bubble({ rise, x, bottom, climb, offset, testID }: BubbleProps) {
  const style = useAnimatedStyle(() => {
    const t = (rise.value + offset) % 1;
    return {
      opacity: interpolate(t, [0, 0.15, 0.85, 1], [0, 0.9, 0.9, 0]),
      transform: [{ translateY: -climb * t }, { translateX: 0.6 * Math.sin(t * 2 * Math.PI) }],
    };
  });
  return <Animated.View testID={testID} style={[styles.bubble, { left: x - 1.3, top: bottom - 3 }, style]} />;
}

interface UncorkProps {
  progress: Progress;
  look: WineSceneLook;
}

/** Stage height of the bottle's lip in the uncork scene. */
const LIP = 72;
const BOTTLE_SCALE = 0.6;

/** The bottle the scene opens, placed so its lip sits at the centre of the stage, at LIP. */
function OpenBottle({ look }: { look: WineSceneLook }) {
  const lip = BOTTLE_LIP[look.bottle];
  return (
    <Sprite
      testID={`scene-uncork-bottle-${look.bottle}`}
      item={bottleArt(look)}
      scale={BOTTLE_SCALE}
      x={CENTER - lip.x * BOTTLE_SCALE}
      y={LIP - lip.y * BOTTLE_SCALE}
    />
  );
}

/** The first profile step: a still wine is uncorked, a sparkling one pops its cork. */
function UncorkScene({ progress, look }: UncorkProps) {
  return look.bottle === "sparkling" ? (
    <PopScene progress={progress} look={look} />
  ) : (
    <CorkscrewScene progress={progress} look={look} />
  );
}

/** The corkscrew turns into the cork, pulls it out of the neck and the aroma escapes. */
function CorkscrewScene({ progress, look }: UncorkProps) {
  const corkScale = 12 / art.cork.w;
  const screwScale = 0.17;
  const screwHeight = art.corkscrew.h * screwScale;
  const corkTop = LIP - 4;
  const pull = 30;

  const cork = useAnimatedStyle(() => ({
    transform: [{ translateY: -pull * settle(progress.value, 0.5, 0.8) }],
  }));
  const corkscrew = useAnimatedStyle(() => {
    const turns = interpolate(progress.value, [0.04, 0.46], [0, 1.5], Extrapolation.CLAMP);
    return {
      transform: [
        {
          translateY:
            14 * phase(progress.value, 0.04, 0.46) - pull * settle(progress.value, 0.5, 0.8),
        },
        { scaleX: Math.cos(turns * 2 * Math.PI) },
      ],
    };
  });
  const aroma = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.72, 0.84, 1], [0, 0.7, 0], Extrapolation.CLAMP),
    transform: [{ translateY: -18 * phase(progress.value, 0.72, 1) }],
  }));

  return (
    <>
      <OpenBottle look={look} />
      <Sprite item={art.wispTwo} scale={0.2} x={CENTER - 4.5} y={LIP - 26} style={aroma} />
      {/* Whatever is below the lip is inside the neck, so this frame hides it. */}
      <View style={[styles.clip, { left: 0, top: 0, width: SCENE_ART_SIZE, height: LIP }]}>
        <Sprite
          testID="scene-uncork-corkscrew"
          item={art.corkscrew}
          scale={screwScale}
          x={CENTER - 110 * screwScale}
          y={corkTop - 2 - screwHeight}
          style={corkscrew}
        />
        <Sprite
          testID="scene-uncork-cork"
          item={art.cork}
          scale={corkScale}
          x={CENTER - 6}
          y={corkTop}
          style={cork}
        />
      </View>
    </>
  );
}

/** Foam that wells up at the lip once the cork is out: centre offset, size and delay of each bubble. */
const FOAM = [
  [-4, 7, 0],
  [3.5, 8, 0.03],
  [0, 10, 0.06],
  [-2.5, 6.5, 0.1],
  [4.5, 6, 0.13],
  [1, 7.5, 0.16],
] as const;

/** Width of the sparkling cork on the stage; the cage is drawn at the same scale, as it was painted. */
const CORK_SPARKLING_WIDTH = 16;
/** How much of the cork's base is still inside the neck. */
const CORK_IN_NECK = 9;

/** The wire cage comes off, the cork wiggles loose and pops, and a little foam wells up. */
function PopScene({ progress, look }: UncorkProps) {
  const scale = CORK_SPARKLING_WIDTH / art.corkSparkling.w;
  const corkTop = LIP + CORK_IN_NECK - art.corkSparkling.h * scale;
  const cageWidth = art.cage.w * scale;

  const cage = useAnimatedStyle(() => {
    const off = phase(progress.value, 0.06, 0.36);
    return {
      opacity: 1 - phase(progress.value, 0.24, 0.4),
      transform: [{ translateX: 16 * off }, { translateY: -12 * off }, { rotate: `${28 * off}deg` }],
    };
  });
  const cork = useAnimatedStyle(() => {
    const p = progress.value;
    const wiggle = p < 0.58 ? 7 * Math.sin(phase(p, 0.38, 0.58) * 6 * Math.PI) : 0;
    const flight = settle(p, 0.58, 0.82);
    return {
      opacity: 1 - phase(p, 0.74, 0.84),
      transform: [
        { translateX: 10 * flight },
        { translateY: -70 * flight },
        { rotate: `${wiggle + 220 * flight}deg` },
      ],
    };
  });

  return (
    <>
      <OpenBottle look={look} />
      {FOAM.map(([dx, size, delay]) => (
        <Foam key={dx} progress={progress} x={CENTER + dx} size={size} delay={delay} />
      ))}
      {/* The base of the cork is inside the neck, so this frame hides it. */}
      <View style={[styles.clip, { left: 0, top: 0, width: SCENE_ART_SIZE, height: LIP }]}>
        <Sprite
          testID="scene-uncork-sparkling-cork"
          item={art.corkSparkling}
          scale={scale}
          x={CENTER - CORK_SPARKLING_WIDTH / 2}
          y={corkTop}
          style={cork}
        />
      </View>
      {/* The cage's plate rests on the cork's cap and its ring hangs around the neck. */}
      <Sprite
        testID="scene-uncork-cage"
        item={art.cage}
        scale={scale}
        x={CENTER - cageWidth / 2}
        y={corkTop - 1}
        style={cage}
      />
    </>
  );
}

interface FoamProps {
  progress: Progress;
  x: number;
  size: number;
  delay: number;
}

function Foam({ progress, x, size, delay }: FoamProps) {
  const style = useAnimatedStyle(() => {
    const up = settle(progress.value, 0.6 + delay, 0.86 + delay);
    return {
      opacity: up * (1 - 0.25 * phase(progress.value, 0.9, 1)),
      transform: [{ translateY: -9 * up }, { scale: 0.3 + 0.7 * up }],
    };
  });
  return (
    <Animated.View
      testID="scene-uncork-foam"
      style={[styles.foam, { left: x - size / 2, top: LIP - size / 2, width: size, height: size, borderRadius: size / 2 }, style]}
    />
  );
}

/** Wine pours into the glass and the stream stops once it is served. */
function PourScene({ progress, look }: { progress: Progress; look: WineSceneLook }) {
  const scale = 0.36;
  const { glass, wineBox } = glasses[look.glass];
  const width = glass.w * scale;
  const height = glass.h * scale;
  const x = (SCENE_ART_SIZE - width) / 2;
  const y = (SCENE_ART_SIZE - height) / 2;
  const [bx, by, bw, bh] = wineBox;
  const bowlBottom = y + (by + bh) * height;
  const streamX = x + (bx + bw / 2) * width - 1.2;
  const start = 0.1;
  const end = 0.76;

  const stream = useAnimatedStyle(() => {
    const surface = bowlBottom - bh * height * phase(progress.value, start, end);
    const reach = bowlBottom * phase(progress.value, 0, start);
    const top = surface * phase(progress.value, 0.64, 0.84);
    return { top, height: Math.max(0, Math.min(reach, surface) - top) };
  });

  return (
    <>
      <FilledGlass
        testID="scene-visual-glass"
        progress={progress}
        look={look}
        scale={scale}
        x={x}
        y={y}
        from={0}
        to={1}
        start={start}
        end={end}
      />
      <Animated.View
        testID="scene-visual-pour"
        style={[styles.stream, { left: streamX, backgroundColor: POUR_COLORS[look.wine] }, stream]}
      />
    </>
  );
}

/** Aromas rise from the glass in three wisps. */
function BouquetScene({ progress, look }: { progress: Progress; look: WineSceneLook }) {
  const scale = 0.27;
  const { glass } = glasses[look.glass];
  const width = glass.w * scale;
  const height = glass.h * scale;
  const x = (SCENE_ART_SIZE - width) / 2;
  const y = SCENE_ART_SIZE - height - 6;
  const rim = y + 0.12 * height;
  const wispScale = 0.21;

  return (
    <>
      <FilledGlass testID="scene-bouquet-glass" progress={progress} look={look} scale={scale} x={x} y={y} from={1} to={1} start={0} end={1} />
      {wisps.map((wisp, index) => (
        <Wisp
          key={index}
          progress={progress}
          item={wisp}
          scale={wispScale}
          x={CENTER - (wisp.w * wispScale) / 2 + (index - 1) * 15}
          y={rim - wisp.h * wispScale}
          start={0.05 + index * 0.16}
        />
      ))}
    </>
  );
}

interface WispProps {
  progress: Progress;
  item: Art;
  scale: number;
  x: number;
  y: number;
  start: number;
  testID?: string;
}

export function Wisp({ progress, item, scale, x, y, start, testID = "scene-bouquet-wisp" }: WispProps) {
  const rise = useAnimatedStyle(() => ({
    opacity: 0.8 * phase(progress.value, start, start + 0.3),
    transform: [{ translateY: 10 - 16 * settle(progress.value, start, start + 0.6) }],
  }));
  return <Sprite testID={testID} item={item} scale={scale} x={x} y={y} style={rise} />;
}

/** A sip lowers the wine in the glass. */
function TasteScene({ progress, look }: { progress: Progress; look: WineSceneLook }) {
  const scale = 0.36;
  const { glass } = glasses[look.glass];
  const width = glass.w * scale;
  const height = glass.h * scale;
  return (
    <FilledGlass
      testID="scene-taste-glass"
      progress={progress}
      look={look}
      scale={scale}
      x={(SCENE_ART_SIZE - width) / 2}
      y={(SCENE_ART_SIZE - height) / 2}
      from={1}
      to={0.55}
      start={0.12}
      end={0.8}
    />
  );
}

/** Each line takes LINE_STEP of the gesture: LINE_WRITE to write it, the rest to reach the next one. */
const LINE_STEP = 0.145;
const LINE_WRITE = 0.1;
/** Past 1 the page fades so it can be written again, and the pen goes back to the first line. */
export const REPLAY_FADE_END = 1.25;

/** The pen writes the tasting notes on the page, line by line. */
function WritingScene({ progress }: { progress: Progress }) {
  const paperScale = 0.34;
  const paperWidth = art.paper.w * paperScale;
  const paperHeight = art.paper.h * paperScale;
  const paperX = (SCENE_ART_SIZE - paperWidth) / 2;
  const paperY = (SCENE_ART_SIZE - paperHeight) / 2;
  const handScale = 0.31;
  const handWidth = art.handwriting.w * handScale;
  const handHeight = art.handwriting.h * handScale;
  const handX = paperX + 9;
  const handY = paperY + 16;
  const penScale = 0.23;
  const nibX = 0.06 * art.pen.w * penScale;
  const nibY = 0.99 * art.pen.h * penScale;
  const restX = paperX + paperWidth - 14;
  const restY = paperY + paperHeight - 12;
  const writtenAt = (handwritingLines.length - 1) * LINE_STEP + LINE_WRITE;
  const firstLineY = handY + (handHeight * (handwritingLines[0][0] + handwritingLines[0][1])) / 2;

  const ink = useAnimatedStyle(() => ({
    opacity: 1 - phase(progress.value, 1, REPLAY_FADE_END),
  }));
  const pen = useAnimatedStyle(() => {
    const p = progress.value;
    if (p > 1) {
      const back = phase(p, 1, REPLAY_FADE_END);
      return {
        transform: [
          { translateX: restX + (handX - restX) * back - nibX },
          { translateY: restY + (firstLineY - restY) * back - nibY },
        ],
      };
    }
    const line = Math.min(Math.floor(p / LINE_STEP), handwritingLines.length - 1);
    const lineStart = line * LINE_STEP;
    const [lineTop, lineBottom] = handwritingLines[line] ?? handwritingLines[0];
    const lineY = handY + (handHeight * (lineTop + lineBottom)) / 2;
    const along = phase(p, lineStart, lineStart + LINE_WRITE);
    // A slight up-and-down while the nib moves, like handwriting.
    let writeX = handX + handWidth * along;
    let writeY = lineY + 0.7 * Math.sin(along * Math.PI * 9) * (along < 1 ? 1 : 0);
    const next = handwritingLines[line + 1];
    if (next && p > lineStart + LINE_WRITE) {
      const carry = phase(p, lineStart + LINE_WRITE, lineStart + LINE_STEP);
      const nextY = handY + (handHeight * (next[0] + next[1])) / 2;
      writeX = handX + handWidth * (1 - carry);
      writeY = lineY + (nextY - lineY) * carry - 2 * Math.sin(carry * Math.PI);
    }
    const lift = phase(p, writtenAt, 1);
    return {
      transform: [
        { translateX: writeX + (restX - writeX) * lift - nibX },
        { translateY: writeY + (restY - writeY) * lift - nibY },
      ],
    };
  });

  return (
    <>
      <Sprite item={art.paper} scale={paperScale} x={paperX} y={paperY} />
      <Animated.View testID="scene-writing-ink" style={[StyleSheet.absoluteFill, ink]}>
        {handwritingLines.map(([lineTop, lineBottom], index) => (
          <HandwrittenLine
            key={lineTop}
            progress={progress}
            x={handX}
            y={handY + lineTop * handHeight}
            height={(lineBottom - lineTop) * handHeight}
            imageWidth={handWidth}
            imageHeight={handHeight}
            offset={lineTop * handHeight}
            start={index * LINE_STEP}
          />
        ))}
      </Animated.View>
      <Sprite testID="scene-writing-pen" item={art.pen} scale={penScale} x={0} y={0} style={pen} />
    </>
  );
}

interface HandwrittenLineProps {
  progress: Progress;
  x: number;
  y: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
  offset: number;
  start: number;
}

/** One line of the notes, uncovered from left to right as the pen passes. */
function HandwrittenLine(props: HandwrittenLineProps) {
  const { progress, x, y, height, imageWidth, imageHeight, offset, start } = props;
  const written = useAnimatedStyle(() => ({
    width: imageWidth * phase(progress.value, start, start + LINE_WRITE),
  }));
  return (
    <Animated.View
      testID="scene-writing-line"
      style={[styles.clip, { left: x, top: y, height }, written]}
    >
      <Image
        source={art.handwriting.source}
        style={{ position: "absolute", top: -offset, width: imageWidth, height: imageHeight }}
      />
    </Animated.View>
  );
}

const PAIR_SCALE = 0.23;
/** Centre of the left and right glass on the stage. */
const PAIR_X = [36, 92] as const;

/** Where a glass of the pair sits: both stand on the same line, each centred on its own spot. */
function pairPlace(look: WineSceneLook, side: 0 | 1) {
  const { glass, wineBox } = glasses[look.glass];
  const height = glass.h * PAIR_SCALE;
  const x = PAIR_X[side] - (glass.w * PAIR_SCALE) / 2;
  const y = (SCENE_ART_SIZE - height) / 2 + 4;
  return { x, y, bowlY: y + (wineBox[1] + wineBox[3] / 2) * height };
}

interface PairProps {
  progress: Progress;
  looks: WineSceneLooks;
}

/** Both wines are poured side by side. */
function CompareScene({ progress, looks }: PairProps) {
  const left = pairPlace(looks.first, 0);
  const right = pairPlace(looks.second, 1);
  return (
    <>
      <FilledGlass testID="scene-compare-first" progress={progress} look={looks.first} scale={PAIR_SCALE} x={left.x} y={left.y} from={0} to={1} start={0.04} end={0.7} />
      <FilledGlass testID="scene-compare-second" progress={progress} look={looks.second} scale={PAIR_SCALE} x={right.x} y={right.y} from={0} to={1} start={0.18} end={0.84} />
    </>
  );
}

/** Where the lens sits inside the magnifier layer: center x, center y and radius, as fractions. */
const LENS = { x: 0.337, y: 0.311, r: 0.337 } as const;

/** A magnifier looks closely at one wine and then the other to tell them apart. */
function ContrastScene({ progress, looks }: PairProps) {
  const scale = 0.22;
  const width = art.magnifier.w * scale;
  const height = art.magnifier.h * scale;
  const lensX = LENS.x * width;
  const lensY = LENS.y * height;
  const left = pairPlace(looks.first, 0);
  const right = pairPlace(looks.second, 1);
  const stops = [
    { x: 112, y: 122 },
    { x: PAIR_X[0], y: left.bowlY },
    { x: PAIR_X[1], y: right.bowlY },
  ] as const;

  const lens = useAnimatedStyle(() => {
    const p = progress.value;
    const toFirst = phase(p, 0, 0.35);
    const toSecond = phase(p, 0.55, 0.85);
    const x = stops[0].x + (stops[1].x - stops[0].x) * toFirst + (stops[2].x - stops[1].x) * toSecond;
    const y = stops[0].y + (stops[1].y - stops[0].y) * toFirst + (stops[2].y - stops[1].y) * toSecond;
    // A small lift as it settles over each glass, like someone leaning in to look.
    const lean = Math.sin(phase(p, 0.3, 0.55) * Math.PI) + Math.sin(phase(p, 0.82, 1) * Math.PI);
    return {
      opacity: phase(p, 0, 0.15),
      transform: [
        { translateX: x - lensX },
        { translateY: y - lensY },
        { scale: 1 + 0.06 * lean },
      ],
    };
  });

  return (
    <>
      <FilledGlass testID="scene-contrast-first" progress={progress} look={looks.first} scale={PAIR_SCALE} x={left.x} y={left.y} from={1} to={1} start={0} end={1} />
      <FilledGlass testID="scene-contrast-second" progress={progress} look={looks.second} scale={PAIR_SCALE} x={right.x} y={right.y} from={0.7} to={0.7} start={0} end={1} />
      <Sprite testID="scene-contrast-magnifier" item={art.magnifier} scale={scale} x={0} y={0} style={lens} />
    </>
  );
}

/** The grapes drop into the pans during this share of the gesture; then the balance swings. */
const GRAPES_LAND = 0.3;

/** Beam angle in degrees: the swing the landing grapes start, coming to rest level at the end. */
function balanceTilt(value: number) {
  "worklet";
  const t = Math.min(Math.max((value - GRAPES_LAND) / (1 - GRAPES_LAND), 0), 1);
  return -14 * Math.pow(1 - t, 2) * Math.sin(2.6 * Math.PI * t);
}

/** A pan hangs from its end of the beam, so it follows that hook without rotating. */
function hangFrom(degrees: number, hookX: number, hookY: number) {
  "worklet";
  const angle = (degrees * Math.PI) / 180;
  return [
    { translateX: hookX * Math.cos(angle) - hookY * Math.sin(angle) - hookX },
    { translateY: hookX * Math.sin(angle) + hookY * Math.cos(angle) - hookY },
  ];
}

/** A bunch of grapes drops into each pan; the balance swings and comes to rest level. */
function StructureScene({ progress, looks }: PairProps) {
  const s = 0.25;
  const standWidth = art.stand.w * s;
  const standHeight = art.stand.h * s;
  const standY = 114 - standHeight;
  const pivotY = standY + 10 * s;
  const beamWidth = art.beam.w * s;
  const beamHeight = art.beam.h * s;
  // The pivot sits at the middle of the beam, so it turns around its own center.
  const pivotInBeamY = 0.5 * beamHeight;
  const arm = 0.47 * beamWidth;
  const drop = 0.45 * beamHeight;
  const panWidth = art.pan.w * s;
  const ringY = 0.03 * art.pan.h * s;

  const beam = useAnimatedStyle(() => ({
    transform: [{ rotate: `${balanceTilt(progress.value)}deg` }],
  }));
  const leftPan = useAnimatedStyle(() => ({
    transform: hangFrom(balanceTilt(progress.value), -arm, drop),
  }));
  const rightPan = useAnimatedStyle(() => ({
    transform: hangFrom(balanceTilt(progress.value), arm, drop),
  }));
  const panY = pivotY + drop - ringY;
  const panHeight = art.pan.h * s;

  return (
    <>
      <Sprite item={art.stand} scale={s} x={CENTER - standWidth / 2} y={standY} />
      <Sprite testID="scene-structure-pan" item={art.pan} scale={s} x={CENTER - arm - panWidth / 2} y={panY} style={leftPan}>
        <Grapes progress={progress} item={grapes[looks.first.grapes]} panWidth={panWidth} panHeight={panHeight} start={0} />
      </Sprite>
      <Sprite testID="scene-structure-pan" item={art.pan} scale={s} x={CENTER + arm - panWidth / 2} y={panY} style={rightPan}>
        <Grapes progress={progress} item={grapes[looks.second.grapes]} panWidth={panWidth} panHeight={panHeight} start={0.08} />
      </Sprite>
      <Sprite
        testID="scene-structure-beam"
        item={art.beam}
        scale={s}
        x={CENTER - beamWidth / 2}
        y={pivotY - pivotInBeamY}
        style={beam}
      />
    </>
  );
}

interface GrapesProps {
  progress: Progress;
  item: Art;
  panWidth: number;
  panHeight: number;
  start: number;
}

/** A bunch of grapes lowered into its pan, resting on the bowl. */
function Grapes({ progress, item, panWidth, panHeight, start }: GrapesProps) {
  const scale = 21 / item.h;
  const width = item.w * scale;
  const height = item.h * scale;
  const land = useAnimatedStyle(() => ({
    opacity: phase(progress.value, start, start + 0.12),
    transform: [{ translateY: -14 * (1 - settle(progress.value, start, start + 0.22)) }],
  }));
  return (
    <Sprite
      testID="scene-structure-grapes"
      item={item}
      scale={scale}
      x={(panWidth - width) / 2}
      y={0.8 * panHeight - height}
      style={land}
    />
  );
}

interface SceneArtProps {
  scene: WineScene;
  progress: Progress;
  looks: WineSceneLooks;
}

/** The drawing of a step; `progress` runs from 0, the starting pose, to 1, the finished gesture. */
export function WineProcessSceneArt({ scene, progress, looks }: SceneArtProps) {
  switch (scene) {
    case "uncork":
      return <UncorkScene progress={progress} look={looks.first} />;
    case "visual":
      return <PourScene progress={progress} look={looks.first} />;
    case "bouquet":
      return <BouquetScene progress={progress} look={looks.first} />;
    case "taste":
      return <TasteScene progress={progress} look={looks.first} />;
    case "report":
    case "recommendation":
      return <WritingScene progress={progress} />;
    case "compare":
      return <CompareScene progress={progress} looks={looks} />;
    case "structure":
      return <StructureScene progress={progress} looks={looks} />;
    case "contrast":
      return <ContrastScene progress={progress} looks={looks} />;
  }
}

/** Scenes whose gesture plays again on the last step while the answer is pending. */
export const REPLAYABLE_SCENES: ReadonlySet<WineProcessScene> = new Set(["report", "recommendation", "quizWheel"]);

const styles = StyleSheet.create({
  layer: { position: "absolute" },
  clip: { position: "absolute", overflow: "hidden" },
  stream: {
    position: "absolute",
    width: 2.4,
    borderRadius: 1.2,
    opacity: 0.88,
  },
  bubble: {
    position: "absolute",
    width: 2.6,
    height: 2.6,
    borderRadius: 1.3,
    borderWidth: 0.6,
    borderColor: "rgba(150, 112, 40, 0.7)",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  foam: {
    position: "absolute",
    backgroundColor: "#F6EBCB",
    borderWidth: 0.8,
    borderColor: "#C8AB6A",
  },
});

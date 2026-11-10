// Pure maths of the pour rating demo: the same rules and geometry as the web and mobile
// rating control (S8 of feature #455), kept free of React so it can be tested with node --test.

export const RATING_MIN = 0.1;
export const RATING_MAX = 5;
/** Bottle angle while the score rises and the wine pours. */
export const POUR_ANGLE = 125;
/** Bottle angle while the score falls or rests. */
export const REST_ANGLE = 62;
export const GLASS_COUNT = 5;

/**
 * Glass art: 360-px-high images; `box` = [x, y, width, height] of the wine, as fractions of
 * the image. The wine layer is uncovered from the bottom of the box up.
 * @type {Record<string, { w: number, h: number, box: [number, number, number, number] }>}
 */
export const GLASSES = {
  bordeaux: { w: 177, h: 360, box: [0.027, 0.2009, 0.9459, 0.2939] },
  rose: { w: 172, h: 360, box: [0.0279, 0.1967, 0.9443, 0.2885] },
  tulip: { w: 148, h: 360, box: [0.0289, 0.2128, 0.9386, 0.2872] },
  flute: { w: 122, h: 360, box: [0.1261, 0.1512, 0.7478, 0.3774] },
};

/**
 * @typedef {'still' | 'sparkling'} CorkKind
 * @typedef {{ art: string, w: number, h: number, size: number, inNeck: number, kind: CorkKind }} CorkArt
 * `size` = cork width as a fraction of the bottle width; `inNeck` = share of its height inside the neck;
 * `kind` = how it comes out, as in the AI profile scene.
 */

/** @type {CorkArt} */
const STILL_CORK = { art: 'cork', w: 76, h: 172, size: 0.26, inNeck: 0.5, kind: 'still' };
/** @type {CorkArt} */
const SPARKLING_CORK = { art: 'cork-sparkling', w: 113, h: 160, size: 0.42, inNeck: 0.3, kind: 'sparkling' };

/**
 * Bottle art: 360-px-high images; `lip` = [x, y] of the pouring lip in image pixels.
 * `wine` = [shoulder, base] of the wine in a full bottle, as fractions of its height.
 * Each bottle has an empty twin (`bottle-<name>-empty`) with the same silhouette.
 * @type {Record<string, { w: number, h: number, lip: [number, number], cork: CorkArt, wine: [number, number] }>}
 */
export const BOTTLES = {
  dark: { w: 104, h: 360, lip: [51.7, 3.6], cork: STILL_CORK, wine: [0.3, 0.97] },
  'clear-white': { w: 105, h: 360, lip: [52.2, 3.6], cork: STILL_CORK, wine: [0.28, 0.97] },
  'clear-rose': { w: 105, h: 360, lip: [51.9, 3.6], cork: STILL_CORK, wine: [0.28, 0.97] },
  'clear-amber': { w: 106, h: 360, lip: [52.3, 3.6], cork: STILL_CORK, wine: [0.28, 0.97] },
  sparkling: { w: 116, h: 360, lip: [55.7, 3.6], cork: SPARKLING_CORK, wine: [0.35, 0.97] },
};

/** Pixel sizes of the uncorking props of the AI profile scene. */
export const UNCORK_ART = {
  corkscrew: { w: 224, h: 273 },
  cage: { w: 135, h: 149 },
  wisp: { w: 45, h: 150 },
};

/** Bottle height, in glass heights. */
const BOTTLE_SCALE = 1.3;
/** Glass height, in glass slots. */
const GLASS_SCALE = 1.35;
/** Room left of the standing bottle and between it and the first glass, in glass heights. */
const STAND_PAD = 0.2;
const STAND_GAP = 0.45;
/** Room under the glasses for the standing bottle's shadow, in px. */
const SHADOW_ROOM = 8;

/** @typedef {{ glass: string, wine: string, bottle: string, pour: string }} PourLook */

/** Glass, wine layer, bottle and stream colour per wine type, as in the AI profile scene. */
const LOOKS = {
  red: { glass: 'bordeaux', wine: 'red', bottle: 'dark', pour: '#7A1F2E' },
  fortified: { glass: 'bordeaux', wine: 'ruby', bottle: 'dark', pour: '#8E2A36' },
  rose: { glass: 'rose', wine: 'rose', bottle: 'clear-rose', pour: '#E39A8E' },
  white: { glass: 'tulip', wine: 'white', bottle: 'clear-white', pour: '#E3CF7C' },
  orange: { glass: 'tulip', wine: 'amber', bottle: 'clear-amber', pour: '#D08A3A' },
  dessert: { glass: 'tulip', wine: 'amber', bottle: 'clear-amber', pour: '#D08A3A' },
  sparkling: { glass: 'flute', wine: 'sparkling', bottle: 'sparkling', pour: '#E8C860' },
};

/** Like the grape pills of the mobile home: each wine layer's deepest hue to its rim. */
const TRACK_GRADIENTS = {
  red: ['#2A0A3B', '#7E1A47'],
  ruby: ['#5A1027', '#9E2338'],
  rose: ['#C9606B', '#F0B0A4'],
  white: ['#F6DE92', '#E4B654'],
  amber: ['#9A5A1E', '#D9A04F'],
  sparkling: ['#F3E3A0', '#E2C25A'],
};

/**
 * The two stops of the slider bar's wine fill, left to right; an unknown wine layer gets the red one.
 * @param {PourLook} look
 * @returns {[string, string]}
 */
export function trackGradient(look) {
  const stops = Object.hasOwn(TRACK_GRADIENTS, look.wine) ? TRACK_GRADIENTS[look.wine] : TRACK_GRADIENTS.red;
  return [stops[0], stops[1]];
}

/** Wine types offered as chips in the demo, in display order. */
export const WINE_TYPES = ['red', 'fortified', 'rose', 'white', 'orange', 'sparkling'];

/**
 * The look of a wine type; an unknown or missing type looks like a red wine.
 * @param {string | null | undefined} type
 * @returns {PourLook}
 */
export function lookFor(type) {
  const key = String(type ?? '').toLowerCase();
  return { ...(Object.hasOwn(LOOKS, key) ? LOOKS[key] : LOOKS.red) };
}

/**
 * Snaps a score to one decimal (2.15 becomes 2.2) and keeps it between 0.1 and 5.0.
 * @param {number} value
 */
export function clampRating(value) {
  if (Number.isNaN(value)) return RATING_MIN;
  // The epsilon makes halves round up despite binary fractions (2.15 * 10 = 21.4999…).
  const snapped = Math.round(value * 10 + 1e-7) / 10;
  return Math.min(RATING_MAX, Math.max(RATING_MIN, snapped));
}

/** @param {number} value */
export const formatRating = value => value.toFixed(1);

/**
 * How full glass `index` is (0 to 1) for a score.
 * @param {number} value
 * @param {number} index
 */
export const fillOf = (value, index) => Math.min(1, Math.max(0, value - index));

/** @param {number} value */
export const glassFills = value => Array.from({ length: GLASS_COUNT }, (_, index) => fillOf(value, index));

/**
 * Clip path that shows the wine layer from the bottom of its box up to the fill level.
 * @param {[number, number, number, number]} box
 * @param {number} fill
 */
export function wineClip(box, fill) {
  const [, y, , h] = box;
  return `inset(${((y + h * (1 - fill)) * 100).toFixed(2)}% 0 0 0)`;
}

/**
 * Clip path of the thin, brighter surface line at the fill level; hidden when empty.
 * @param {[number, number, number, number]} box
 * @param {number} fill
 */
export function surfaceClip(box, fill) {
  if (fill <= 0) return 'inset(100% 0 0 0)';
  const [, y, , h] = box;
  const top = (y + h * (1 - fill)) * 100;
  return `inset(${top.toFixed(2)}% 0 ${(100 - top - 1.4).toFixed(2)}% 0)`;
}

const KEY_STEPS = { ArrowRight: 0.1, ArrowUp: 0.1, ArrowLeft: -0.1, ArrowDown: -0.1, PageUp: 0.5, PageDown: -0.5 };

/**
 * The score after a key press, or null when the key does not change it.
 * @param {string} key
 * @param {number} value
 * @returns {number | null}
 */
export function ratingForKey(key, value) {
  if (key === 'Home') return RATING_MIN;
  if (key === 'End') return RATING_MAX;
  return Object.hasOwn(KEY_STEPS, key) ? clampRating(value + KEY_STEPS[key]) : null;
}

/**
 * @typedef {object} PourLayout
 * @property {number} width
 * @property {number} height
 * @property {number} side   margin left of the glasses: the stand where the bottle waits upright
 * @property {number} end    margin right of the glasses
 * @property {number} inner  width the five glasses share
 * @property {number} slot   width of one glass slot
 * @property {number} gw     glass width
 * @property {number} gh     glass height
 * @property {number} top    top of the glasses
 * @property {number} bw     bottle width
 * @property {number} bh     bottle height
 * @property {number[]} glasses  left edge of each glass
 */

/**
 * Lays out the five glasses and the bottle for a stage width.
 * @param {number} width
 * @param {PourLook} look
 * @param {number} [room]  room wanted right of the last glass centre (for the score at the end of the bar)
 * @returns {PourLayout}
 */
export function pourLayout(width, look, room = 0) {
  const glass = GLASSES[look.glass];
  const bottle = BOTTLES[look.bottle];
  // The stand and the glasses both scale with the glass height, so solve for it.
  const stand = STAND_PAD + STAND_GAP + (BOTTLE_SCALE * bottle.w) / bottle.h;
  // Right of the last glass centre lie half a slot and the margin; half a slot is `share` of what the margin leaves.
  const share = 1 / (2 * GLASS_SCALE * (GLASS_COUNT / GLASS_SCALE + stand));
  const end = Math.max(34, width * 0.07, (room - width * share) / (1 - share));
  const gh = (width - end) / (GLASS_COUNT / GLASS_SCALE + stand);
  const slot = gh / GLASS_SCALE;
  const inner = slot * GLASS_COUNT;
  const gw = (gh * glass.w) / glass.h;
  // Room above the rims for the tilted bottle.
  const top = gh * 0.9;
  const bh = gh * BOTTLE_SCALE;
  const bw = (bh * bottle.w) / bottle.h;
  const side = gh * (STAND_PAD + STAND_GAP) + bw;
  const glasses = Array.from({ length: GLASS_COUNT }, (_, index) => side + index * slot + (slot - gw) / 2);
  return { width, height: Math.round(top + gh + SHADOW_ROOM), side, end, inner, slot, gw, gh, top, bw, bh, glasses };
}

/**
 * Not rated yet: corked on its stand. Rated: pouring. 5.0: back on its stand, open and empty.
 * @param {number} value
 * @returns {'corked' | 'pouring' | 'finished'}
 */
export function bottleStage(value) {
  if (value <= 0) return 'corked';
  return value >= RATING_MAX ? 'finished' : 'pouring';
}

/**
 * The bottle upright on its stand, left of the first glass, on the glasses' base line.
 * @param {PourLayout} layout
 */
export const standPose = layout => ({
  left: layout.gh * STAND_PAD,
  top: layout.top + layout.gh - layout.bh,
  rotate: 0,
});

/**
 * The cork inside the bottle box (origin at its top left, upright), centred on the lip.
 * @param {PourLayout} layout
 * @param {PourLook} look
 */
export function corkBox(layout, look) {
  const bottle = BOTTLES[look.bottle];
  const { cork } = bottle;
  const width = layout.bw * cork.size;
  const height = (width * cork.h) / cork.w;
  const lipX = (bottle.lip[0] / bottle.w) * layout.bw;
  const lipY = (bottle.lip[1] / bottle.h) * layout.bh;
  return { left: lipX - width / 2, top: lipY - height * (1 - cork.inNeck), width, height };
}

/**
 * Share of the wine still in the bottle for a score: full at 0, empty at 5.
 * @param {number} value
 */
export const wineLeft = value => 1 - Math.min(1, Math.max(0, value / RATING_MAX));

/**
 * Height of the wine surface on the stage. The surface stays level whatever the bottle's angle:
 * it rises from the lowest point of the wine space (the base upright, the shoulder once turned
 * past horizontal) by the share of wine left, `remaining` (1 full, 0 empty).
 * @param {number} centerX
 * @param {number} centerY
 * @param {number} angle  degrees
 * @param {number} remaining
 * @param {PourLayout} layout
 * @param {PourLook} look
 */
export function wineSurfaceY(centerX, centerY, angle, remaining, layout, look) {
  const [top, bottom] = BOTTLES[look.bottle].wine;
  const a = (angle * Math.PI) / 180;
  const sin = Math.sin(a);
  const cos = Math.cos(a);
  let minY = Infinity;
  let maxY = -Infinity;
  for (const fx of [-0.5, 0.5]) {
    for (const fy of [top - 0.5, bottom - 0.5]) {
      const y = centerY + fx * layout.bw * sin + fy * layout.bh * cos;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return maxY - Math.min(1, Math.max(0, remaining)) * (maxY - minY);
}

/**
 * 0 before `start`, 1 after `end`, eased in and out between them (as the AI profile scenes).
 * @param {number} value
 * @param {number} start
 * @param {number} end
 */
export function phase(value, start, end) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * 0 before `start`, 1 after `end`, slowing down like an object coming to rest.
 * @param {number} value
 * @param {number} start
 * @param {number} end
 */
export function settle(value, start, end) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return 1 - Math.pow(1 - t, 3);
}

/**
 * @typedef {{ dx: number, dy: number, rotate: number, scaleX: number, opacity: number }} UncorkPart
 * Offsets in px, rotation in degrees.
 */

/** @returns {UncorkPart} */
const part = (dx, dy, rotate, scaleX, opacity) => ({ dx, dy, rotate, scaleX, opacity });

/**
 * The uncorking of the AI profile scene at `progress` (0..1), with its stage units scaled by
 * `scale`. Still wine: a corkscrew turns into the cork and pulls it out, and the aroma escapes.
 * Sparkling: the cage comes off, the cork wiggles loose and pops, and foam wells up. Every prop
 * is gone at the end, so the bottle can be lifted.
 * @param {number} progress
 * @param {CorkKind} kind
 * @param {number} scale
 * @returns {Record<'cork' | 'screw' | 'wisp' | 'cage' | 'foam', UncorkPart>}
 */
export function uncorkScene(progress, kind, scale) {
  const p = progress;
  if (kind === 'still') {
    const turns = 1.5 * Math.min(1, Math.max(0, (p - 0.04) / 0.42));
    const pull = -20 * scale * settle(p, 0.5, 0.8);
    const leave = 1 - phase(p, 0.66, 0.86);
    const wisp = p < 0.72 ? 0 : p < 0.84 ? (0.7 * (p - 0.72)) / 0.12 : (0.7 * (1 - p)) / 0.16;
    return {
      cork: part(0, pull, 0, 1, leave),
      screw: part(0, 14 * scale * phase(p, 0.04, 0.46) + pull, 0, Math.cos(turns * 2 * Math.PI), phase(p, 0, 0.04) * leave),
      wisp: part(0, -18 * scale * phase(p, 0.72, 1), 0, 1, Math.max(0, wisp)),
      cage: part(0, 0, 0, 1, 0),
      foam: part(0, 0, 0, 0, 0),
    };
  }
  const off = phase(p, 0.06, 0.36);
  const wiggle = p < 0.58 ? 7 * Math.sin(phase(p, 0.38, 0.58) * 6 * Math.PI) : 0;
  const flight = settle(p, 0.58, 0.82);
  const up = settle(p, 0.6, 0.86);
  return {
    cork: part(10 * scale * flight, -70 * scale * flight, wiggle + 220 * flight, 1, 1 - phase(p, 0.74, 0.84)),
    cage: part(16 * scale * off, -12 * scale * off, 28 * off, 1, 1 - phase(p, 0.24, 0.4)),
    // Foam rises and grows (scaleX carries its size), then settles back before the bottle is lifted.
    foam: part(0, -9 * scale * up, 0, 0.3 + 0.7 * up, up * (1 - phase(p, 0.9, 1))),
    screw: part(0, 0, 0, 1, 0),
    wisp: part(0, 0, 0, 1, 0),
  };
}

/** Width of the cork on the AI scene stage, which the uncorking motion is measured in. */
const STAGE_CORK_WIDTH = { still: 12, sparkling: 16 };
/** The corkscrew is drawn at this share of its pixels on that stage, its tip 110 px from its left. */
const SCREW_SCALE = 0.17;
const SCREW_TIP = 110;
const WISP_SCALE = 0.2;
/** Foam at the lip of a sparkling bottle: x offset and size, in stage units. */
const FOAM = [[-4, 7], [3.5, 8], [0, 10], [-2.5, 6.5], [4.5, 6], [1, 7.5]];

/**
 * Where the uncorking props sit in the bottle box (origin at its top left, upright).
 * `scale` turns the AI scene's stage units into px; `neckClip` hides what is below the lip.
 * @param {PourLayout} layout
 * @param {PourLook} look
 */
export function uncorkProps(layout, look) {
  const bottle = BOTTLES[look.bottle];
  const { kind } = bottle.cork;
  const cork = corkBox(layout, look);
  const scale = cork.width / STAGE_CORK_WIDTH[kind];
  const lipX = cork.left + cork.width / 2;
  const lipY = (bottle.lip[1] / bottle.h) * layout.bh;
  const screwW = UNCORK_ART.corkscrew.w * SCREW_SCALE * scale;
  const screwH = UNCORK_ART.corkscrew.h * SCREW_SCALE * scale;
  const tip = SCREW_TIP * SCREW_SCALE * scale;
  const wispW = UNCORK_ART.wisp.w * WISP_SCALE * scale;
  const cageW = (cork.width * UNCORK_ART.cage.w) / bottle.cork.w;
  const far = layout.bh * 4;
  return {
    kind,
    scale,
    lipX,
    lipY,
    cork,
    screw: { left: lipX - tip, top: cork.top - 2 * scale - screwH, width: screwW, height: screwH, tip },
    wisp: { left: lipX - wispW / 2, top: lipY - 26 * scale, width: wispW, height: UNCORK_ART.wisp.h * WISP_SCALE * scale },
    cage: { left: lipX - cageW / 2, top: cork.top - scale, width: cageW, height: (cork.width * UNCORK_ART.cage.h) / bottle.cork.w },
    foam: FOAM.map(([dx, size]) => ({ x: lipX + dx * scale, size: size * scale })),
    neckClip: `polygon(${-far}px ${-far}px, ${far}px ${-far}px, ${far}px ${lipY.toFixed(2)}px, ${-far}px ${lipY.toFixed(2)}px)`,
  };
}

/**
 * Everything that changes with the score: fills, bottle pose and the poured stream.
 * The bottle turns on its centre, placed so that at the pouring angle its lip sits on the
 * rail above the score; the stream curves from the lip into the glass being filled.
 * @param {PourLayout} layout
 * @param {PourLook} look
 * @param {number} value
 * @param {boolean} pouring
 */
export function pourFrame(layout, look, value, pouring) {
  const glass = GLASSES[look.glass];
  const bottle = BOTTLES[look.bottle];
  const lip = { x: layout.side + (value / RATING_MAX) * layout.inner, y: layout.top + layout.gh * 0.12 };
  const index = Math.min(GLASS_COUNT - 1, Math.max(0, Math.floor(value - 1e-6)));
  const fill = fillOf(value, index);
  const target = {
    x: layout.glasses[index] + (glass.box[0] + glass.box[2] / 2) * layout.gw,
    y: layout.top + (glass.box[1] + glass.box[3] * (1 - fill)) * layout.gh,
  };
  const angle = (POUR_ANGLE * Math.PI) / 180;
  const ox = (bottle.lip[0] / bottle.w - 0.5) * layout.bw;
  const oy = (bottle.lip[1] / bottle.h - 0.5) * layout.bh;
  const cx = lip.x - (ox * Math.cos(angle) - oy * Math.sin(angle));
  const cy = lip.y - (ox * Math.sin(angle) + oy * Math.cos(angle));
  const control = { x: lip.x + (target.x - lip.x) * 0.15, y: lip.y + (target.y - lip.y) * 0.55 };
  return {
    fills: glassFills(value),
    lip,
    target,
    left: cx - layout.bw / 2,
    top: cy - layout.bh / 2,
    rotate: pouring ? POUR_ANGLE : REST_ANGLE,
    stream: `M${lip.x},${lip.y} Q${control.x},${control.y} ${target.x},${target.y}`,
    streamOpacity: pouring ? 1 : 0,
  };
}

/**
 * Score under a pointer at `clientX`, for a stage whose left edge is at `left`.
 * @param {number} clientX
 * @param {number} left
 * @param {PourLayout} layout
 */
export const ratingFromPointer = (clientX, left, layout) =>
  clampRating(((clientX - left - layout.side) / layout.inner) * RATING_MAX);

/*
 * The slider bar under the glasses: a small glass, centred on a thin track like a slider thumb,
 * slides on its own straight scale where each whole score sits under the centre of its glass, so a
 * full bar ends under the last glass, which is then full too. 0 is one slot before the first glass.
 * The bar shares the stage's left edge, so its x runs in stage pixels.
 */
/** Height of the glass that slides along the bar, in px. */
export const BAR_GLASS_HEIGHT = 38;
/** Thickness of the track that runs through the middle of that glass, in px. */
export const BAR_TRACK = 5;
/** Space between the end of the bar and the score readout, in px. */
export const BAR_SCORE_GAP = 8;

/**
 * @typedef {object} BarLayout
 * @property {number} width        wide enough for the glass at 5, whose centre is the end of the track
 * @property {number} height
 * @property {number} glassWidth
 * @property {number} glassHeight
 * @property {number} trackTop     top of the track, centred on the glass
 * @property {number} trackLeft    the score 0
 * @property {number} trackWidth   up to the score 5, the last glass centre
 */

/** @param {PourLayout} layout @param {number} index */
const glassCentre = (layout, index) => layout.glasses[index] + layout.gw / 2;

/**
 * Position of a score on the bar, held at 0 and 5: whole scores sit under their glass centres.
 * @param {number} value
 * @param {PourLayout} layout
 */
export function barXAtRating(value, layout) {
  const score = Math.min(RATING_MAX, Math.max(0, value));
  return glassCentre(layout, 0) + (score - 1) * layout.slot;
}

/**
 * Raw score under a position on the bar (not yet snapped), held at 0 and 5; the inverse of `barXAtRating`.
 * @param {number} x
 * @param {PourLayout} layout
 */
export function ratingAtBarX(x, layout) {
  return Math.min(RATING_MAX, Math.max(0, (x - glassCentre(layout, 0)) / layout.slot + 1));
}

/** @param {PourLook} look */
const barGlassWidth = look => (BAR_GLASS_HEIGHT * GLASSES[look.glass].w) / GLASSES[look.glass].h;

/**
 * @param {PourLayout} layout
 * @param {PourLook} look
 * @returns {BarLayout}
 */
export function barLayout(layout, look) {
  const glassWidth = barGlassWidth(look);
  const trackLeft = barXAtRating(0, layout);
  const trackEnd = barXAtRating(RATING_MAX, layout);
  return {
    width: Math.ceil(trackEnd + glassWidth / 2),
    height: BAR_GLASS_HEIGHT,
    glassWidth,
    glassHeight: BAR_GLASS_HEIGHT,
    trackTop: (BAR_GLASS_HEIGHT - BAR_TRACK) / 2,
    trackLeft,
    trackWidth: trackEnd - trackLeft,
  };
}

/**
 * Room the score readout needs right of the last glass centre: half the bar glass (plus the bar's
 * rounding), the gap and the score itself.
 * @param {PourLook} look
 * @param {number} scoreWidth
 */
export const scoreRoom = (look, scoreWidth) => barGlassWidth(look) / 2 + 1 + BAR_SCORE_GAP + (scoreWidth || 0);

/**
 * Left edge of the bar's glass for a score, centred at its place on the bar.
 * @param {number} value
 * @param {PourLayout} layout
 * @param {BarLayout} bar
 */
export const barThumbLeft = (value, layout, bar) => barXAtRating(value, layout) - bar.glassWidth / 2;

/**
 * Width of the bar's wine fill, from the start of the track up to the glass; empty when not rated.
 * @param {number} value
 * @param {PourLayout} layout
 * @param {BarLayout} bar
 */
export const barFillWidth = (value, layout, bar) => (value > 0 ? barXAtRating(value, layout) - bar.trackLeft : 0);

/**
 * How full the bar's glass is: the score out of five, to two decimals.
 * @param {number} value
 */
export const barThumbFill = value => Math.round(Math.min(1, Math.max(0, value / RATING_MAX)) * 100) / 100;

/**
 * Rising bubbles of a flute, in percent of the glass box; other glasses have none.
 * @param {string} glassName
 * @param {number} glassHeight
 */
export function bubbleSpots(glassName, glassHeight) {
  if (glassName !== 'flute') return [];
  const [x, y, w, h] = GLASSES.flute.box;
  return Array.from({ length: 4 }, (_, k) => ({
    left: (x + w * (0.25 + k * 0.17)) * 100,
    top: (y + h * 0.95) * 100,
    rise: glassHeight * h * 0.8,
    delay: Math.round(k * 45) / 100,
  }));
}

const LABELS = {
  es: {
    yourRating: 'Tu puntuación',
    slider: 'Puntuación',
    wineType: 'Tipo de vino',
    hint: 'Deslizá la botella o la barra para puntuar',
    rowsTitle: 'Así se ven en las reseñas y en la página del vino',
    /** @param {number} value */
    valueText: value => `${formatRating(value)} de 5`,
    noValue: 'Sin puntuación',
    types: { red: 'Tinto', fortified: 'Fortificado', rose: 'Rosado', white: 'Blanco', orange: 'Naranjo', sparkling: 'Espumante' },
  },
  en: {
    yourRating: 'Your rating',
    slider: 'Rating',
    wineType: 'Wine type',
    hint: 'Drag the bottle or the bar to rate',
    rowsTitle: 'How they look in reviews and on the wine page',
    /** @param {number} value */
    valueText: value => `${formatRating(value)} of 5`,
    noValue: 'No rating yet',
    types: { red: 'Red', fortified: 'Fortified', rose: 'Rosé', white: 'White', orange: 'Orange', sparkling: 'Sparkling' },
  },
};

/** @param {string} locale */
export const labelsFor = locale => (locale === 'en' ? LABELS.en : LABELS.es);

const EXAMPLES = {
  es: [
    { type: 'red', value: 4.3, note: 'Malbec · promedio de 128 reseñas' },
    { type: 'white', value: 2.2, note: 'Torrontés · una reseña' },
    { type: 'rose', value: 3.7, note: 'Rosado de Pinot · una reseña' },
    { type: 'sparkling', value: 4.8, note: 'Extra Brut · promedio de 41 reseñas' },
  ],
  en: [
    { type: 'red', value: 4.3, note: 'Malbec · average of 128 reviews' },
    { type: 'white', value: 2.2, note: 'Torrontés · one review' },
    { type: 'rose', value: 3.7, note: 'Pinot rosé · one review' },
    { type: 'sparkling', value: 4.8, note: 'Extra Brut · average of 41 reviews' },
  ],
};

/** @param {string} locale */
export const examplesFor = locale => (locale === 'en' ? EXAMPLES.en : EXAMPLES.es);

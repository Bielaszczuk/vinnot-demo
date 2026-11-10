// Navigation and number helpers of the presentation deck (feature #487), kept free of React
// for node --test. A position is { slide, step }: each slide reveals its content in steps,
// and moving forward shows the next step before leaving the slide.

/** @typedef {{ slide: number, step: number }} Position */
/** @typedef {'next' | 'prev' | 'first' | 'last' | 'fullscreen'} Action */

/** @type {Record<string, Action>} */
const KEY_ACTIONS = {
  ArrowRight: 'next',
  ArrowDown: 'next',
  ' ': 'next',
  Enter: 'next',
  PageDown: 'next',
  ArrowLeft: 'prev',
  ArrowUp: 'prev',
  Backspace: 'prev',
  PageUp: 'prev',
  Home: 'first',
  End: 'last',
  f: 'fullscreen',
  F: 'fullscreen',
};

/** @param {string} key a KeyboardEvent key */
export const actionForKey = key => KEY_ACTIONS[key] ?? null;

/** @param {number} value @param {number} min @param {number} max */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * The position after an action. Going back from the first step of a slide lands on the
 * previous slide fully built, the way the audience last saw it.
 * @param {Position} position
 * @param {Action} action
 * @param {number[]} steps how many steps each slide reveals (at least 1)
 * @returns {Position}
 */
export function apply(position, action, steps) {
  const last = steps.length - 1;
  const { slide, step } = position;
  switch (action) {
    case 'next':
      if (step < steps[slide] - 1) return { slide, step: step + 1 };
      return slide < last ? { slide: slide + 1, step: 0 } : position;
    case 'prev':
      if (step > 0) return { slide, step: step - 1 };
      return slide > 0 ? { slide: slide - 1, step: steps[slide - 1] - 1 } : position;
    case 'first':
      return { slide: 0, step: 0 };
    case 'last':
      return { slide: last, step: steps[last] - 1 };
    default:
      return position;
  }
}

/**
 * The slide named by the address (#3 is the third slide), so a reload keeps the place.
 * @param {string} hash location.hash, with or without '#'
 * @param {number} count slides in the deck
 */
export function slideFromHash(hash, count) {
  const number = Number.parseInt(hash.replace('#', ''), 10);
  return Number.isNaN(number) ? 0 : clamp(number - 1, 0, count - 1);
}

/** @param {number} slide 0-based */
export const hashFor = slide => `#${slide + 1}`;

/**
 * A horizontal swipe moves the deck; short or mostly vertical ones are scrolling or taps.
 * @param {number} dx pointer travel in px (negative is towards the left)
 * @param {number} dy
 * @param {number} threshold minimum travel in px
 * @returns {'next' | 'prev' | null}
 */
export function swipeAction(dx, dy, threshold = 48) {
  if (Math.abs(dx) < threshold || Math.abs(dy) > Math.abs(dx)) return null;
  return dx < 0 ? 'next' : 'prev';
}

/**
 * Share of the deck already shown, counting steps, from 0 at the start to 1 at the end.
 * @param {Position} position
 * @param {number[]} steps
 */
export function progress(position, steps) {
  const total = steps.reduce((sum, count) => sum + count, 0) - 1;
  if (total === 0) return 1;
  const shown = steps.slice(0, position.slide).reduce((sum, count) => sum + count, 0) + position.step;
  return shown / total;
}

/**
 * The progress bar split by chapter: each chapter is as wide as its steps and fills with the
 * steps already shown, counting the current one.
 * @param {Position} position
 * @param {number[]} steps
 * @param {string[]} chapters the chapter of each slide
 * @param {string[]} order every chapter, in the order the talk tells them
 * @returns {{ chapter: string, weight: number, fill: number }[]}
 */
export function chapterFill(position, steps, chapters, order) {
  return order
    .map(chapter => {
      let weight = 0;
      let shown = 0;
      steps.forEach((count, slide) => {
        if (chapters[slide] !== chapter) return;
        weight += count;
        if (slide < position.slide) shown += count;
        if (slide === position.slide) shown += position.step + 1;
      });
      return { chapter, weight, fill: weight === 0 ? 0 : shown / weight };
    })
    .filter(part => part.weight > 0);
}

/** Ease-out cubic over 0..1: counters and bars start fast and settle softly. @param {number} t */
export const eased = t => 1 - (1 - clamp(t, 0, 1)) ** 3;

/**
 * The value a counter shows at time t (0..1) of its animation.
 * @param {number} target
 * @param {number} t
 * @param {number} decimals
 */
export function countAt(target, t, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(target * eased(t) * factor) / factor;
}

/**
 * A number with the separators of the deck language (20.000 and 83,31 in Spanish).
 * @param {number} value
 * @param {string} locale 'es' or 'en'
 * @param {number} decimals
 */
export function formatNumber(value, locale, decimals = 0) {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: 'always',
  }).format(value);
}

/** Elapsed time as mm:ss, for the presenter's clock. @param {number} ms */
export function formatClock(ms) {
  const seconds = Math.floor(Math.max(ms, 0) / 1000);
  const pad = (/** @type {number} */ value) => String(value).padStart(2, '0');
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

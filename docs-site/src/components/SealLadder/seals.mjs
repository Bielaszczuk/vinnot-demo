// Data and pure helpers of the seal ladder (S1 and S7 of feature #455): the eleven tiers,
// their sparkles and particles, and the pointer-driven tilt, kept free of React for node --test.

/** @param {string} key a tier key such as GRAN_RESERVA */
export const sealSlug = key => key.toLowerCase().replaceAll('_', '-');

/** @typedef {[number, number, number, number]} SparkSpot x %, y %, size %, delay s */

/**
 * The eleven tiers by current points. Display names are per language, in `ladderLabels(locale).names`.
 * @type {{ key: string, slug: string, threshold: number, sparks: SparkSpot[], particles: boolean }[]}
 */
export const TIERS = [
  ['BROTE', 0],
  ['PARRA', 30],
  ['RACIMO', 80],
  ['VENDIMIA', 160, [[70, 32, 16, 0.9]]],
  ['LAGAR', 280],
  ['BARRICA', 450],
  ['CRIANZA', 700],
  ['RESERVA', 1000],
  ['GRAN_RESERVA', 1600, [[22, 26, 15, 0], [80, 30, 12, 1.1], [70, 80, 14, 1.9]]],
  ['GRAN_ENOFILO', 2600, [[24, 22, 14, 0], [82, 26, 12, 0.7], [78, 78, 15, 1.4], [20, 74, 11, 2.1], [52, 10, 10, 1.7]]],
  ['VINNOT', 5000, [[18, 22, 15, 0], [84, 24, 13, 0.6], [86, 72, 14, 1.3], [16, 70, 12, 1.9], [50, 6, 11, 1.1], [62, 92, 10, 2.4]], true],
].map(([key, threshold, sparks = [], particles = false]) => ({
  key: /** @type {string} */ (key),
  slug: sealSlug(/** @type {string} */ (key)),
  threshold: /** @type {number} */ (threshold),
  sparks: /** @type {SparkSpot[]} */ (sparks),
  particles: /** @type {boolean} */ (particles),
}));

const HOLO = ['#ff7ad1', '#ffd27a', '#8affc1', '#79d3ff', '#b78bff'];
/** @type {Record<string, string>} */
const SPARK_COLOR = { vendimia: '#fff8e0', 'gran-reserva': '#ffe39a', 'gran-enofilo': '#d8ecff', vinnot: '#ffffff' };
/** Sparkles and particles read as noise below this size. */
const MIN_FX_SIZE = 40;

/** @param {string} slug */
const tierOf = slug => TIERS.find(tier => tier.slug === slug);

/**
 * Twinkling sparkles of a seal drawn at `size` px.
 * @param {string} slug
 * @param {number} size
 */
export function sparksFor(slug, size) {
  const tier = tierOf(slug);
  if (!tier || size < MIN_FX_SIZE) return [];
  return tier.sparks.map(([x, y, z, delay], index) => ({
    x,
    y,
    z,
    delay,
    duration: slug === 'vendimia' ? 3.8 : 2.4 + (index % 3) * 0.5,
    color: slug === 'vinnot' ? HOLO[index % HOLO.length] : SPARK_COLOR[slug],
  }));
}

/**
 * Small deterministic generator, so the static HTML and the hydrated page draw the same
 * particles (Math.random would differ between server and browser).
 * @param {number} seed
 */
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Coloured particles rising from Vinnot; other seals have none.
 * @param {string} slug
 * @param {number} size
 */
export function particlesFor(slug, size) {
  if (!tierOf(slug)?.particles || size < MIN_FX_SIZE) return [];
  const random = seeded(5000);
  return Array.from({ length: 9 }, (_, index) => ({
    x: 22 + random() * 56,
    y: 70 + random() * 18,
    z: 2.5 + random() * 2.5,
    color: HOLO[index % HOLO.length],
    delay: Math.round(index * 45) / 100,
    duration: Math.round((2.8 + random() * 1.6) * 100) / 100,
    rise: Math.round(size * (0.45 + random() * 0.35)),
    dx: Math.round((random() - 0.5) * size * 0.25),
  }));
}

/**
 * Tilt and holographic foil that follow the pointer; x and y go from 0 to 1 over the seal.
 * @param {number} x
 * @param {number} y
 * @param {number} strength degrees of tilt at the edge
 */
export function tiltFrom(x, y, strength) {
  return {
    rx: `${((0.5 - y) * strength).toFixed(1)}deg`,
    ry: `${((x - 0.5) * strength).toFixed(1)}deg`,
    mx: `${(x * 100).toFixed(0)}%`,
    my: `${(y * 100).toFixed(0)}%`,
    ang: `${(90 + (x - 0.5) * 80).toFixed(0)}deg`,
  };
}

/**
 * @param {number} points
 * @param {string} locale
 */
export const formatPoints = (points, locale) => points.toLocaleString(locale === 'en' ? 'en-US' : 'es-AR');

const LABELS = {
  es: {
    /** @param {{ threshold: number }} tier */
    from: tier => `Desde ${formatPoints(tier.threshold, 'es')} puntos`,
    /** @param {string} name */
    seal: name => `Sello ${name}`,
    ladder: 'Escalera de sellos',
    names: {
      BROTE: 'Brote',
      PARRA: 'Parra',
      RACIMO: 'Racimo',
      VENDIMIA: 'Vendimia',
      LAGAR: 'Lagar',
      BARRICA: 'Barrica',
      CRIANZA: 'Crianza',
      RESERVA: 'Reserva',
      GRAN_RESERVA: 'Gran Reserva',
      GRAN_ENOFILO: 'Gran Enófilo',
      VINNOT: 'Vinnot',
    },
    pause: 'Pausar animaciones',
    play: 'Reanudar animaciones',
    hint: 'Pasa el puntero o el dedo sobre un sello: se inclina y, en Vinnot, la lámina holográfica lo sigue.',
    shine: {
      brote: 'Se mece suavemente',
      parra: 'Se mece y respira',
      racimo: 'Las uvas maduran de verde a morado, con rocío',
      vendimia: 'Un destello recorre la hoja del cuchillo',
      lagar: 'Un reflejo lo cruza de vez en cuando',
      barrica: 'Reflejo metálico',
      crianza: 'Brillo satinado y un halo color vino',
      reserva: 'Brillo dorado y un halo dorado',
      'gran-reserva': 'Oro constante, rayos lentos y destellos',
      'gran-enofilo': 'Cromo que gira y chispas',
      vinnot: 'Lámina holográfica que sigue tu dedo o el puntero, brillos y partículas que suben',
    },
  },
  en: {
    /** @param {{ threshold: number }} tier */
    from: tier => `From ${formatPoints(tier.threshold, 'en')} points`,
    /** @param {string} name */
    seal: name => `${name} seal`,
    ladder: 'Seal ladder',
    names: {
      BROTE: 'Bud',
      PARRA: 'Vine Leaf',
      RACIMO: 'Cluster',
      VENDIMIA: 'Harvest',
      LAGAR: 'Wine Press',
      BARRICA: 'Barrel',
      CRIANZA: 'Aging',
      RESERVA: 'Reserve',
      GRAN_RESERVA: 'Grand Reserve',
      GRAN_ENOFILO: 'Connoisseur',
      VINNOT: 'Vinnot',
    },
    pause: 'Pause animations',
    play: 'Resume animations',
    hint: 'Move the pointer or your finger over a seal: it tilts and, on Vinnot, the holographic foil follows it.',
    shine: {
      brote: 'Sways gently',
      parra: 'Sways and breathes',
      racimo: 'The grapes ripen from green to purple, with dew',
      vendimia: 'A glint runs along the knife blade',
      lagar: 'A highlight sweeps across it now and then',
      barrica: 'Metallic sweep',
      crianza: 'Satin sheen and a wine-coloured halo',
      reserva: 'Gold sheen and a gold halo',
      'gran-reserva': 'Constant gold, slow rays and sparkles',
      'gran-enofilo': 'Rotating chrome and sparks',
      vinnot: 'Holographic foil that follows your finger or pointer, glitter and rising particles',
    },
  },
};

/** @param {string} locale */
export const ladderLabels = locale => (locale === 'en' ? LABELS.en : LABELS.es);

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useBaseUrlUtils } from '@docusaurus/useBaseUrl';
import {
  BOTTLES,
  GLASSES,
  RATING_MAX,
  RATING_MIN,
  WINE_TYPES,
  barFillWidth,
  barLayout,
  barThumbFill,
  barThumbLeft,
  bottleStage,
  bubbleSpots,
  clampRating,
  examplesFor,
  fillOf,
  formatRating,
  labelsFor,
  lookFor,
  pourFrame,
  pourLayout,
  ratingAtBarX,
  ratingForKey,
  ratingFromPointer,
  scoreRoom,
  standPose,
  surfaceClip,
  trackGradient,
  uncorkProps,
  uncorkScene,
  wineClip,
  wineLeft,
  wineSurfaceY,
} from './pour.mjs';
import styles from './styles.module.css';

/** Score the opening pour fills up to. */
const START_RATING = 3.6;
/** Stage width used for the static HTML, before the browser measures the page. */
const DEFAULT_WIDTH = 600;
/** How long the bottle keeps pouring after the score stops rising. */
const POUR_HOLD_MS = 260;
const DEMO_STEP_MS = 45;
/** The uncorking of the AI profile scene, which plays on its own before the opening pour. */
const UNCORK_MS = 2200;
/** Bottle carried between its stand and the glasses (see styles.module.css). */
const TRAVEL_MS = 420;

type CssVars = CSSProperties & Record<`--${string}`, string>;
type Travel = 'lift' | 'settle';
type Part = { dx: number; dy: number; rotate: number; scaleX: number; opacity: number };

const moved = (part: Part, scale = false): CSSProperties => ({
  translate: `${part.dx}px ${part.dy}px`,
  rotate: `${part.rotate}deg`,
  ...(scale ? { scale: `${part.scaleX} 1` } : {}),
  opacity: part.opacity,
});

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

function useLocale(): string {
  return useDocusaurusContext().i18n.currentLocale;
}

function useArt() {
  const { withBaseUrl } = useBaseUrlUtils();
  return useCallback((name: string) => withBaseUrl(`/img/rating/${name}.webp`), [withBaseUrl]);
}

/**
 * Rating demo: not rated yet, the bottle stands corked beside five glasses and uncorks itself as
 * the AI profile scene does (a touch meanwhile finishes it at once), then the opening pour plays.
 * The first score lifts it over the glasses and pours in step with the bar. Then it follows the
 * pointer: it tilts and pours while the score rises, and empties; while the score falls it lifts
 * and fills again. 0.1 to 5.0 in steps of 0.1. At 5.0 it is back on its stand, open and empty.
 * Under the glasses a slider bar offers the same score: its small glass slides and fills with it,
 * and dragging it moves the bottle as dragging the bottle does. It is a second way to point, not a
 * second slider, so it is hidden from assistive tech; the score reads at its right end.
 */
export default function PourRating(): ReactNode {
  const labels = labelsFor(useLocale());
  const art = useArt();
  const [type, setType] = useState('red');
  const [value, setValue] = useState(0);
  const [pouring, setPouring] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [scoreWidth, setScoreWidth] = useState(0);
  const [touched, setTouched] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const scoreBox = useRef<HTMLDivElement>(null);
  const current = useRef(0);
  const dragging = useRef(false);
  const barDragging = useRef(false);
  const reducedMotion = useRef(false);
  const pourTimer = useRef(0);
  const demoTimer = useRef(0);

  const look = lookFor(type);
  const glass = GLASSES[look.glass];
  // The glasses leave room on their right for the score at the end of the bar.
  const layout = useMemo(() => {
    const typeLook = lookFor(type);
    return pourLayout(width, typeLook, scoreRoom(typeLook, scoreWidth));
  }, [width, type, scoreWidth]);
  const bar = barLayout(layout, look);
  const [barFrom, barTo] = trackGradient(look);
  const bubbles = bubbleSpots(look.glass, layout.gh);

  // 0 corked, 1 open: the bottle uncorks on its stand before any score; `openRun` restarts it.
  const [uncork, setUncork] = useState(0);
  const [openRun, setOpenRun] = useState(0);
  const afterOpen = useRef<(() => void) | null>(null);
  const bottleAt = bottleStage(value);
  // The bottle stands beside the glasses until the first score, and once 5.0 is poured.
  const atStand = bottleAt === 'corked' || (bottleAt === 'finished' && !pouring);
  const [seenStand, setSeenStand] = useState(atStand);
  const [travel, setTravel] = useState<Travel | null>(null);
  if (seenStand !== atStand) {
    if (!prefersReducedMotion()) setTravel(atStand ? 'settle' : 'lift');
    setSeenStand(atStand);
  }
  useEffect(() => {
    if (!openRun) return undefined;
    let request = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / UNCORK_MS));
      setUncork(progress);
      if (progress < 1) {
        request = window.requestAnimationFrame(tick);
        return;
      }
      setOpenRun(0);
      const then = afterOpen.current;
      afterOpen.current = null;
      then?.();
    };
    request = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(request);
  }, [openRun]);
  useEffect(() => {
    if (!travel) return undefined;
    const timer = window.setTimeout(() => setTravel(null), TRAVEL_MS);
    return () => window.clearTimeout(timer);
  }, [travel]);

  /** Corks the bottle again and uncorks it, then runs `then`. */
  const openBottle = useCallback((then: (() => void) | null) => {
    afterOpen.current = then;
    setUncork(0);
    setOpenRun(run => run + 1);
  }, []);
  /** Ends an uncorking under way at once, without what was to follow it. */
  const finishUncork = useCallback(() => {
    afterOpen.current = null;
    setOpenRun(0);
    setUncork(1);
  }, []);

  const frame = pourFrame(layout, look, value, pouring);
  // The glasses fill in step with the score (and the bar); the stream shows once the bottle is over them.
  const fills = frame.fills;
  const place = atStand ? standPose(layout) : frame;
  const streaming = pouring && !atStand && travel !== 'lift';
  // The bottle holds what is not poured yet; its surface stays level, measured from its centre.
  const centerY = place.top + layout.bh / 2;
  const level = wineSurfaceY(place.left + layout.bw / 2, centerY, place.rotate, wineLeft(value), layout, look) - centerY;
  const props = uncorkProps(layout, look);
  const scene = uncorkScene(uncork, props.kind, props.scale);

  const setRating = useCallback((next: number) => {
    const rating = clampRating(next);
    const previous = current.current;
    if (rating === previous) return;
    current.current = rating;
    setValue(rating);
    setPouring(rating > previous);
    window.clearTimeout(pourTimer.current);
    pourTimer.current = window.setTimeout(() => setPouring(false), POUR_HOLD_MS);
  }, []);

  const stopDemo = useCallback(() => {
    window.clearTimeout(demoTimer.current);
    window.clearInterval(demoTimer.current);
    afterOpen.current = null;
  }, []);

  // Opening pour: back to "not rated" with a corked bottle, uncork it, then fill up to the target score.
  const demo = useCallback(
    (target: number) => {
      stopDemo();
      if (reducedMotion.current) {
        setUncork(1);
        setRating(target);
        return;
      }
      const wasRated = current.current > 0;
      current.current = 0;
      setValue(0);
      setPouring(false);
      window.clearTimeout(pourTimer.current);
      const pour = () => {
        demoTimer.current = window.setInterval(() => {
          if (current.current >= target) stopDemo();
          else setRating(current.current + 0.1);
        }, DEMO_STEP_MS);
      };
      // Back on its stand first, then a fresh bottle is uncorked; the pour starts only after that.
      demoTimer.current = window.setTimeout(() => openBottle(pour), wasRated ? TRAVEL_MS : 0);
    },
    [openBottle, setRating, stopDemo],
  );

  useEffect(() => {
    const element = stage.current;
    if (!element) return undefined;
    reducedMotion.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    // Reduced motion: the bottle starts open.
    if (reducedMotion.current) setUncork(1);
    const measure = () => {
      setWidth(element.clientWidth || DEFAULT_WIDTH);
      setScoreWidth(scoreBox.current?.offsetWidth ?? 0);
    };
    measure();
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(element);
    if (scoreBox.current) resize?.observe(scoreBox.current);
    // Without IntersectionObserver there is no opening pour, but the bottle still uncorks once.
    if (typeof IntersectionObserver === 'undefined' && !reducedMotion.current) openBottle(null);
    const appear =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            entries => {
              if (entries.some(entry => entry.isIntersecting)) {
                demo(START_RATING);
                appear?.disconnect();
              }
            },
            { threshold: 0.5 },
          );
    appear?.observe(element);
    return () => {
      resize?.disconnect();
      appear?.disconnect();
      stopDemo();
      window.clearTimeout(pourTimer.current);
    };
  }, [demo, openBottle, stopDemo]);

  /** A touch on the bottle, the bar or the keys stops the opening pour, hides the hint and finishes the uncorking. */
  const touch = () => {
    stopDemo();
    finishUncork();
    setTouched(true);
  };

  const fromPointer = (event: PointerEvent<HTMLDivElement>) =>
    ratingFromPointer(event.clientX, event.currentTarget.getBoundingClientRect().left, layout);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    touch();
    setRating(fromPointer(event));
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setRating(fromPointer(event));
  };
  const onPointerEnd = () => {
    dragging.current = false;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = ratingForKey(event.key, current.current);
    if (next === null) return;
    event.preventDefault();
    touch();
    setRating(next);
  };

  // The bar shares the stage's left edge, so a position on it is a stage x.
  const fromBar = (event: PointerEvent<HTMLDivElement>) =>
    ratingAtBarX(event.clientX - event.currentTarget.getBoundingClientRect().left, layout);
  const onBarDown = (event: PointerEvent<HTMLDivElement>) => {
    barDragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    touch();
    setRating(fromBar(event));
  };
  const onBarMove = (event: PointerEvent<HTMLDivElement>) => {
    if (barDragging.current) setRating(fromBar(event));
  };
  const onBarEnd = () => {
    barDragging.current = false;
  };
  const thumbFill = barThumbFill(value);
  const chooseType = (next: string) => {
    setType(next);
    demo(current.current);
  };

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div className={styles.scoreLabel}>{labels.yourRating}</div>
        <div className={styles.types} role="group" aria-label={labels.wineType}>
          {WINE_TYPES.map(wineType => (
            <button
              key={wineType}
              type="button"
              aria-pressed={wineType === type}
              onClick={() => chooseType(wineType)}>
              <i style={{ '--c': lookFor(wineType).pour } as CssVars} />
              {labels.types[wineType as keyof typeof labels.types]}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.board}>
        <div
          ref={stage}
          className={styles.pour}
          style={{ height: layout.height }}
          tabIndex={0}
          role="slider"
          aria-label={labels.slider}
          aria-orientation="horizontal"
          aria-valuemin={RATING_MIN}
          aria-valuemax={RATING_MAX}
          aria-valuenow={value > 0 ? value : undefined}
          aria-valuetext={value > 0 ? labels.valueText(value) : labels.noValue}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onKeyDown={onKeyDown}>
          {layout.glasses.map((left, index) => (
            <div
              key={index}
              className={styles.glass}
              style={{ left, top: layout.top, width: layout.gw, height: layout.gh }}>
              <img src={art(`glass-${look.glass}`)} alt="" draggable={false} />
              <img
                className={styles.wine}
                src={art(`wine-${look.wine}`)}
                alt=""
                draggable={false}
                style={{ clipPath: wineClip(glass.box, fills[index]) }}
              />
              <img
                className={styles.surface}
                src={art(`wine-${look.wine}`)}
                alt=""
                draggable={false}
                style={{ clipPath: surfaceClip(glass.box, fills[index]) }}
              />
              {fills[index] > 0.15 &&
                bubbles.map(bubble => (
                  <i
                    key={bubble.delay}
                    className={styles.bubble}
                    style={{
                      left: `${bubble.left}%`,
                      top: `${bubble.top}%`,
                      animationDelay: `${bubble.delay}s`,
                      '--h': `${bubble.rise}px`,
                    } as CssVars}
                  />
                ))}
            </div>
          ))}
          <svg className={styles.stream} aria-hidden="true">
            <path d={frame.stream} stroke={look.pour} strokeWidth={3.2} style={{ opacity: streaming ? 1 : 0 }} />
            <path
              className={styles.flow}
              d={frame.stream}
              stroke="rgba(255, 255, 255, 0.55)"
              strokeWidth={1.4}
              style={{ opacity: streaming ? 1 : 0 }}
            />
          </svg>
          <div
            className={styles.bottle}
            aria-hidden="true"
            data-stand={atStand}
            data-travel={travel ?? undefined}
            style={{
              width: layout.bw,
              height: layout.bh,
              left: place.left,
              top: place.top,
              rotate: `${place.rotate}deg`,
            }}>
            <img className={styles.art} src={art(`bottle-${look.bottle}-empty`)} alt="" draggable={false} />
            {/* The wine: the full bottle seen through a window below the level surface. The window
                turns back by the bottle's angle, so it stays level with the stage. */}
            <div className={styles.level} style={{ rotate: `${-place.rotate}deg` }}>
              <div
                className={styles.levelWindow}
                style={{ left: -layout.bh, top: level, width: layout.bh * 2, height: layout.bh * 2 }}>
                <div className={styles.level} style={{ left: layout.bh, top: -level, rotate: `${place.rotate}deg` }}>
                  <img
                    className={styles.art}
                    src={art(`bottle-${look.bottle}`)}
                    alt=""
                    draggable={false}
                    style={{ left: -layout.bw / 2, top: -layout.bh / 2, width: layout.bw, height: layout.bh }}
                  />
                </div>
              </div>
            </div>
            {props.kind === 'still' && (
              <img
                className={styles.prop}
                src={art('wisp-2')}
                alt=""
                draggable={false}
                style={{ ...props.wisp, ...moved(scene.wisp) }}
              />
            )}
            <div className={styles.neck} style={{ clipPath: props.neckClip }}>
              <img
                className={styles.prop}
                src={art(BOTTLES[look.bottle].cork.art)}
                alt=""
                draggable={false}
                style={{ ...props.cork, ...moved(scene.cork) }}
              />
              {props.kind === 'still' && (
                <img
                  className={styles.prop}
                  src={art('corkscrew')}
                  alt=""
                  draggable={false}
                  style={{
                    left: props.screw.left,
                    top: props.screw.top,
                    width: props.screw.width,
                    height: props.screw.height,
                    transformOrigin: `${props.screw.tip}px 0`,
                    ...moved(scene.screw, true),
                  }}
                />
              )}
            </div>
            {props.kind === 'sparkling' && (
              <>
                <img
                  className={styles.prop}
                  src={art('cage')}
                  alt=""
                  draggable={false}
                  style={{ ...props.cage, ...moved(scene.cage) }}
                />
                {props.foam.map(bubble => {
                  const size = bubble.size * scene.foam.scaleX;
                  return (
                    <i
                      key={bubble.x}
                      className={styles.foam}
                      style={{
                        left: bubble.x - size / 2,
                        top: props.lipY + scene.foam.dy - size / 2,
                        width: size,
                        height: size,
                        opacity: scene.foam.opacity,
                      }}
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>
        {/* The slider bar: a second way to point, hidden from assistive tech; the score reads at its end. */}
        <div className={styles.barRow}>
          <div
            className={styles.bar}
            aria-hidden="true"
            style={{ width: bar.width, height: bar.height }}
            onPointerDown={onBarDown}
            onPointerMove={onBarMove}
            onPointerUp={onBarEnd}
            onPointerCancel={onBarEnd}>
            <span className={styles.track} style={{ top: bar.trackTop, left: bar.trackLeft, width: bar.trackWidth }} />
            <span
              className={styles.fill}
              style={{
                top: bar.trackTop,
                left: bar.trackLeft,
                width: barFillWidth(value, layout, bar),
                '--from': barFrom,
                '--to': barTo,
              } as CssVars}
            />
            <span
              className={styles.thumb}
              style={{ left: barThumbLeft(value, layout, bar), width: bar.glassWidth, height: bar.glassHeight }}>
              <img src={art(`glass-${look.glass}`)} alt="" draggable={false} />
              <img
                className={styles.wine}
                src={art(`wine-${look.wine}`)}
                alt=""
                draggable={false}
                style={{ clipPath: wineClip(glass.box, thumbFill) }}
              />
              <img
                className={styles.surface}
                src={art(`wine-${look.wine}`)}
                alt=""
                draggable={false}
                style={{ clipPath: surfaceClip(glass.box, thumbFill) }}
              />
            </span>
          </div>
          <div ref={scoreBox} className={styles.score} aria-hidden="true">
            <b>{formatRating(value)}</b>
            <span>/ 5</span>
          </div>
        </div>
      </div>
      <p className={styles.hint} data-hidden={touched || undefined}>
        {labels.hint}
      </p>
    </div>
  );
}

/** Read-only glasses, each filled by its fraction, as reviews and the wine page show them. */
export function RatingExamples(): ReactNode {
  const locale = useLocale();
  const art = useArt();
  const labels = labelsFor(locale);
  const size = 30;

  return (
    <div className={styles.rows}>
      <div className={styles.rowsTitle}>{labels.rowsTitle}</div>
      {examplesFor(locale).map(example => {
        const look = lookFor(example.type);
        const glass = GLASSES[look.glass];
        return (
          <div key={example.note} className={styles.row}>
            <span className={styles.glasses} role="img" aria-label={labels.valueText(example.value)}>
              {[0, 1, 2, 3, 4].map(index => (
                <span
                  key={index}
                  className={styles.rowGlass}
                  style={{ width: (size * glass.w) / glass.h, height: size }}>
                  <img src={art(`glass-${look.glass}`)} alt="" />
                  <img
                    className={styles.wine}
                    src={art(`wine-${look.wine}`)}
                    alt=""
                    style={{ clipPath: wineClip(glass.box, fillOf(example.value, index)) }}
                  />
                </span>
              ))}
            </span>
            <b>{formatRating(example.value)}</b>
            <small>{example.note}</small>
          </div>
        );
      })}
    </div>
  );
}

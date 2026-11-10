import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useBaseUrlUtils } from '@docusaurus/useBaseUrl';
import { CHAPTERS, SLIDES, deckCopy, fill } from './content.mjs';
import { actionForKey, apply, chapterFill, formatClock, hashFor, slideFromHash, swipeAction, type Action, type Position } from './deck.mjs';
import { SLIDE_COMPONENTS } from './slides';
import styles from './styles.module.css';

const STEPS = SLIDES.map(slide => slide.steps);
const SLIDE_CHAPTERS = SLIDES.map(slide => slide.chapter);
const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

const Chevron = ({ back = false }: { back?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={back ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
);

const Expand = ({ exit = false }: { exit?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={exit ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'} />
  </svg>
);

/**
 * The full-screen deck of the oral presentation (feature #487). Keys, clicks, swipes and the
 * address (#n) move it; each slide reveals its content in steps.
 */
export default function Presentation(): ReactNode {
  const { i18n } = useDocusaurusContext();
  const { withBaseUrl } = useBaseUrlUtils();
  const locale = i18n.currentLocale;
  const copy = deckCopy(locale);
  const [position, setPosition] = useState<Position>({ slide: 0, step: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setPosition({ slide: slideFromHash(window.location.hash, SLIDES.length), step: 0 });
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', hashFor(position.slide));
  }, [position.slide]);

  useEffect(() => {
    const begin = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - begin), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const act = useCallback((action: Action) => {
    if (action !== 'fullscreen') {
      setPosition(current => apply(current, action, STEPS));
      return;
    }
    // Some browsers and embedded views refuse full screen; the deck still works without it.
    const request = document.fullscreenElement ? document.exitFullscreen() : root.current?.requestFullscreen();
    request?.catch(() => undefined);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if ((event.key === 'Enter' || event.key === ' ') && target?.closest('a, button')) return;
      const action = actionForKey(event.key);
      if (!action) return;
      event.preventDefault();
      act(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointer.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start || (event.target as HTMLElement).closest('a, button')) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const swipe = swipeAction(dx, dy);
    if (swipe) act(swipe);
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && event.pointerType === 'mouse') act('next');
  };

  const current = SLIDES[position.slide];
  const chapterIndex = CHAPTERS.indexOf(current.chapter);
  const lastStep = STEPS.length - 1;
  const atStart = position.slide === 0 && position.step === 0;
  const atEnd = position.slide === lastStep && position.step === STEPS[lastStep] - 1;

  return (
    <div
      ref={root}
      className={clsx(styles.deck, current.tone === 'wine' ? styles.onWine : styles.onPaper)}
      role="region"
      aria-roledescription="carousel"
      aria-label={copy.ui.deck}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}>
      <Head>
        <title>{copy.ui.deck}</title>
        <meta name="robots" content="noindex" />
      </Head>

      {SLIDES.map((slide, index) => {
        const Slide = SLIDE_COMPONENTS[slide.id];
        const active = index === position.slide;
        const step = index < position.slide ? slide.steps - 1 : active ? position.step : 0;
        return (
          <section
            key={slide.id}
            className={clsx(styles.slide, styles[slide.tone], active && styles.active, index < position.slide && styles.past)}
            aria-roledescription="slide"
            aria-label={fill(copy.ui.slideOf, { current: index + 1, total: SLIDES.length })}
            aria-hidden={!active}>
            <span className={styles.orb} style={{ left: '-8%', top: '-12%' }} aria-hidden="true" />
            <span className={styles.orb} style={{ right: '-10%', bottom: '-18%' }} aria-hidden="true" />
            <Slide copy={copy} step={step} active={active} locale={locale} />
          </section>
        );
      })}

      <header className={clsx(styles.chrome, styles.top)}>
        <Link to="/docs/presentation" aria-label={copy.ui.back}>
          <img className={styles.brand} src={withBaseUrl('/img/wordmark.png')} alt="Vinnot" />
        </Link>
        <span className={styles.chapter}>
          <span className={styles.chapterNumber}>{NUMERALS[chapterIndex]}</span>
          {copy.chapters[current.chapter as keyof typeof copy.chapters]}
        </span>
      </header>

      <footer className={clsx(styles.chrome, styles.bottom)}>
        <div className={styles.refs}>
          {current.rubric.length > 0 && (
            <div className={styles.chips}>
              <span className={styles.chipLabel}>{copy.ui.rubric}</span>
              {current.rubric.map(row => (
                <span key={row} className={styles.chip}>{copy.rubric.rows[row as keyof typeof copy.rubric.rows]}</span>
              ))}
            </div>
          )}
          {current.docs.length > 0 && (
            <div className={styles.chips}>
              <span className={styles.chipLabel}>{copy.ui.readMore}</span>
              {current.docs.map(route => (
                <Link key={route} className={styles.docLink} to={route} target="_blank">
                  {copy.docs[route as keyof typeof copy.docs]} ↗
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className={styles.controls}>
          <span className={styles.clock} title={copy.ui.clock}>{formatClock(elapsed)}</span>
          <span className={styles.counter} aria-live="polite">
            {position.slide + 1} / {SLIDES.length}
          </span>
          <button type="button" className={styles.button} onClick={() => act('prev')} disabled={atStart} aria-label={copy.ui.previous}>
            <Chevron back />
          </button>
          <button type="button" className={styles.button} onClick={() => act('next')} disabled={atEnd} aria-label={copy.ui.next}>
            <Chevron />
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => act('fullscreen')}
            aria-label={fullscreen ? copy.ui.exitFullscreen : copy.ui.fullscreen}>
            <Expand exit={fullscreen} />
          </button>
        </div>
      </footer>

      {position.slide === 0 && <p className={styles.hint}>{copy.ui.hint}</p>}

      <div className={styles.progress} aria-hidden="true">
        {chapterFill(position, STEPS, SLIDE_CHAPTERS, CHAPTERS).map(part => (
          <div key={part.chapter} className={styles.segment} style={{ '--w': part.weight } as CSSProperties}>
            <i style={{ '--f': part.fill } as CSSProperties} />
          </div>
        ))}
      </div>
    </div>
  );
}

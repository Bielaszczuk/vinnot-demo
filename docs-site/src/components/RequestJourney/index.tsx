import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
  clampStep,
  hopAt,
  isLastStep,
  labelsFor,
  nextStep,
  previousStep,
  progress,
  scenarioById,
  scenariosFor,
} from './journey.mjs';
import styles from './styles.module.css';

/** Time the dot stays on each hop while playing. */
const STEP_MS = 2400;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

type CssVars = CSSProperties & Record<`--${string}`, string>;

/** True when the reader's system asks for reduced motion; false during the static render. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(REDUCED_MOTION);
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

/**
 * Follows one request through the platform: a dot travels the hops of the chosen scenario
 * (device, DNS, edge or proxy, backend, data or provider) and the card explains each hop.
 * With reduced motion it shows every step as a plain list instead.
 */
export default function RequestJourney(): ReactNode {
  const { i18n } = useDocusaurusContext();
  const scenarios = useMemo(() => scenariosFor(i18n.currentLocale), [i18n.currentLocale]);
  const labels = labelsFor(i18n.currentLocale);
  const reduced = useReducedMotion();
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const scenario = scenarioById(scenarios, scenarioId);
  const count = scenario.hops.length;
  const current = clampStep(step, count);
  const hop = hopAt(scenario, current);

  useEffect(() => {
    if (!playing || reduced) return undefined;
    if (isLastStep(current, count)) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setStep(nextStep(current, count)), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, reduced, current, count]);

  const choose = (id: string) => {
    setScenarioId(id);
    setStep(0);
    setPlaying(false);
  };
  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (isLastStep(current, count)) setStep(0);
    setPlaying(true);
  };
  const move = (target: number) => {
    setPlaying(false);
    setStep(target);
  };

  return (
    <section className={styles.journey} aria-label={labels.track}>
      <div className={styles.picker} role="group" aria-label={labels.picker}>
        {scenarios.map(item => (
          <button
            key={item.id}
            type="button"
            className={clsx(styles.choice, item.id === scenario.id && styles.chosen)}
            aria-pressed={item.id === scenario.id}
            onClick={() => choose(item.id)}>
            {item.title}
          </button>
        ))}
      </div>
      <p className={styles.summary}>{scenario.summary}</p>

      {reduced ? (
        <>
          <p className={styles.note}>{labels.reducedMotion}</p>
          <ol className={styles.steps}>
            {scenario.hops.map(item => (
              <li key={item.index} className={clsx(styles.stepItem, styles[`k-${item.kind}`])}>
                <strong>{item.name}</strong>
                <span>{item.detail}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <div className={styles.track}>
            <div className={styles.rail} />
            <div className={styles.filled} style={{ width: `${progress(current, count)}%` }} />
            {scenario.hops.map(item => (
              <button
                key={item.index}
                type="button"
                className={clsx(
                  styles.node,
                  styles[`k-${item.kind}`],
                  item.index <= current && styles.reached,
                  item.index === current && styles.active,
                )}
                style={{ '--at': `${progress(item.index, count)}%` } as CssVars}
                aria-label={`${labels.step(item.index + 1, count)}: ${item.name}`}
                aria-current={item.index === current ? 'step' : undefined}
                onClick={() => move(item.index)}>
                {item.index + 1}
              </button>
            ))}
            <span
              className={clsx(styles.dot, playing && styles.moving)}
              style={{ '--at': `${progress(current, count)}%` } as CssVars}
              aria-hidden="true"
            />
          </div>

          <div className={clsx(styles.card, styles[`k-${hop.kind}`])} aria-live="polite">
            <div className={styles.counter}>{labels.step(current + 1, count)}</div>
            <div className={styles.hopName}>{hop.name}</div>
            <p className={styles.detail}>{hop.detail}</p>
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.control}
              onClick={() => move(previousStep(current, count))}
              disabled={current === 0}>
              {labels.previous}
            </button>
            <button type="button" className={clsx(styles.control, styles.primary)} onClick={togglePlay}>
              {playing ? labels.pause : isLastStep(current, count) ? labels.restart : labels.play}
            </button>
            <button
              type="button"
              className={styles.control}
              onClick={() => move(nextStep(current, count))}
              disabled={isLastStep(current, count)}>
              {labels.next}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

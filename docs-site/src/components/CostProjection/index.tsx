import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
  MODEL_MAX_USERS,
  SCALE_STEPS,
  SCENARIOS,
  bottlenecks,
  firstBottleneck,
  monthlyBreakdown,
  monthlyCost,
  projectionLabels,
} from './projection.mjs';
import styles from './styles.module.css';

/** Duration of the counter animation. */
const COUNT_MS = 450;
/** The opening scale: the first scenario. */
const START_INDEX = SCALE_STEPS.indexOf(1000);
/** Bars are drawn against the most expensive scale, so they grow as the scale grows. */
const MAX_TOTAL = monthlyCost(MODEL_MAX_USERS);

type CssVars = CSSProperties & Record<`--${string}`, string>;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** A number that eases towards its target, or jumps when motion is reduced. */
function useCountUp(target: number): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (prefersReducedMotion()) {
      from.current = target;
      setShown(target);
      return undefined;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const value = origin + (target - origin) * (1 - (1 - t) ** 3);
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return shown;
}

/** Interactive cost projection by number of monthly active users (#482, S6). */
export default function CostProjection(): ReactNode {
  const locale = useDocusaurusContext().i18n.currentLocale;
  const labels = projectionLabels(locale);
  const number = locale === 'es' ? 'es-AR' : 'en-US';
  const [index, setIndex] = useState(START_INDEX);
  const users = SCALE_STEPS[index] ?? SCALE_STEPS[START_INDEX];
  const breakdown = monthlyBreakdown(users);
  const crossed = bottlenecks(users);
  const first = firstBottleneck();
  const monthly = useCountUp(breakdown.total);
  const money = (value: number) =>
    new Intl.NumberFormat(number, { style: 'currency', currency: 'USD', currencyDisplay: 'code', maximumFractionDigits: 2 }).format(value);
  const services = labels.services as Record<string, string>;
  const plans = labels.plans as Record<string, string>;
  const limits = labels.limits as Record<string, string>;
  const kinds = labels.kinds as Record<string, string>;
  const segments = [
    ...breakdown.services.filter(line => line.usd > 0).map(line => ({ key: line.service, label: services[line.service], usd: line.usd })),
    { key: 'fixed', label: labels.fixed, usd: breakdown.fixed },
  ];

  return (
    <section className={styles.projection} aria-label={labels.title}>
      <div className={styles.controls}>
        <label className={styles.scaleLabel} htmlFor="cost-projection-scale">
          {labels.users}: <strong>{users.toLocaleString(number)}</strong>
        </label>
        <input
          id="cost-projection-scale"
          className={styles.slider}
          type="range"
          min={0}
          max={SCALE_STEPS.length - 1}
          step={1}
          value={index}
          aria-valuetext={users.toLocaleString(number)}
          onChange={event => setIndex(Number(event.target.value))}
        />
        <div className={styles.presets} role="group" aria-label={labels.users}>
          {SCENARIOS.map(scenario => (
            <button
              key={scenario}
              type="button"
              className={clsx(styles.preset, scenario === users && styles.active)}
              aria-pressed={scenario === users}
              onClick={() => setIndex(SCALE_STEPS.indexOf(scenario))}>
              {scenario.toLocaleString(number)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.totals} aria-live="polite">
        <div>
          <span className={styles.amount}>{money(monthly)}</span> <span className={styles.unit}>{labels.perMonth}</span>
        </div>
        <div className={styles.annual}>
          {money(breakdown.total * 12)} {labels.perYear}
        </div>
      </div>

      <div className={styles.stack} role="img" aria-label={`${labels.stack}: ${money(breakdown.total)}`}>
        {segments.map(segment => (
          <span
            key={segment.key}
            className={clsx(styles.segment, styles[`s-${segment.key}`])}
            style={{ '--w': `${(segment.usd / MAX_TOTAL) * 100}%` } as CssVars}
            title={`${segment.label}: ${money(segment.usd)}`}
          />
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{labels.service}</th>
              <th scope="col">{labels.plan}</th>
              <th scope="col" className={styles.num}>
                {labels.cost}
              </th>
            </tr>
          </thead>
          <tbody>
            {breakdown.services.map(line => (
              <tr key={line.service}>
                <td>
                  <span className={clsx(styles.swatch, styles[`s-${line.service}`])} aria-hidden="true" />
                  {services[line.service]}
                </td>
                <td>{plans[line.id]}</td>
                <td className={styles.num}>{money(line.usd)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <span className={clsx(styles.swatch, styles['s-fixed'])} aria-hidden="true" />
                {labels.fixed}
              </td>
              <td>—</td>
              <td className={styles.num}>{money(breakdown.fixed)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h4 className={styles.heading}>{labels.bottlenecks}</h4>
      {crossed.length === 0 ? (
        <p className={styles.none}>{labels.none}</p>
      ) : (
        <ol className={styles.limits}>
          {crossed.map(limit => (
            <li key={limit.id} className={clsx(styles.limit, limit.id === first.id && styles.first)}>
              <span>{limits[limit.id]}</span>
              <span className={styles.meta}>
                {labels.upTo(limit.upTo)} · {kinds[limit.kind]}
                {limit.id === first.id ? ` · ${labels.first}` : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className={styles.note}>{labels.estimate}</p>
    </section>
  );
}

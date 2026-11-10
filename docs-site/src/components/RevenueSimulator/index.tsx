import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
  COMMISSION_MAX,
  COMMISSION_PRESETS,
  COST_PRESETS,
  DEFAULTS,
  STORE_FEE_PRESETS,
  barPercent,
  breakEven,
  formatMoney,
  revenueLabels,
  tween,
} from './revenue.mjs';
import styles from './styles.module.css';

/** Duration of the counter animation. */
const COUNT_MS = 450;

type Inputs = typeof DEFAULTS;
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
      const value = tween(origin, target, (now - start) / COUNT_MS);
      from.current = value;
      setShown(value);
      if (now - start < COUNT_MS) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return shown;
}

type FieldProps = {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
};

function Field({ id, label, value, min = 0, max, step = 1, onChange }: FieldProps): ReactNode {
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        className={styles.input}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : ''}
        onChange={event => onChange(event.target.value === '' ? 0 : Number(event.target.value))}
      />
    </label>
  );
}

type ChipsProps = {
  label: string;
  options: { key: string; text: string; active: boolean; pick: () => void }[];
};

function Chips({ label, options }: ChipsProps): ReactNode {
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      {options.map(option => (
        <button
          key={option.key}
          type="button"
          className={clsx(styles.chip, option.active && styles.active)}
          aria-pressed={option.active}
          onClick={option.pick}>
          {option.text}
        </button>
      ))}
    </div>
  );
}

/** Interactive revenue simulator: ticket commission, winery subscriptions and break-even (#482, S4 and S5). */
export default function RevenueSimulator(): ReactNode {
  const locale = useDocusaurusContext().i18n.currentLocale;
  const labels = revenueLabels(locale);
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const set = <K extends keyof Inputs>(key: K) => (value: Inputs[K]) => setInputs(current => ({ ...current, [key]: value }));
  const result = breakEven(inputs);
  const usd = (value: number) => formatMoney(value, 'USD', locale);
  const commission = useCountUp(result.commission.monthlyUsd);
  const subscriptions = useCountUp(result.subscriptions.monthlyUsd);
  const revenue = useCountUp(result.revenue);
  const margin = useCountUp(result.margin);
  const scale = Math.max(result.revenue, result.cost);

  return (
    <section className={styles.simulator} aria-label={labels.title}>
      <div className={styles.inputs}>
        <fieldset className={styles.group}>
          <legend>{labels.commission}</legend>
          <Chips
            label={labels.commission}
            options={COMMISSION_PRESETS.map(percent => ({
              key: String(percent),
              text: locale === 'es' ? `${percent} %` : `${percent}%`,
              active: inputs.commissionPercent === percent,
              pick: () => set('commissionPercent')(percent),
            }))}
          />
          <Field
            id="revenue-commission"
            label={`${labels.custom} (%)`}
            value={inputs.commissionPercent}
            max={COMMISSION_MAX}
            step={0.5}
            onChange={set('commissionPercent')}
          />
          <Field id="revenue-events" label={labels.events} value={inputs.eventsPerMonth} onChange={set('eventsPerMonth')} />
          <Field id="revenue-tickets" label={labels.tickets} value={inputs.ticketsPerEvent} onChange={set('ticketsPerEvent')} />
          <Field id="revenue-ticket-price" label={labels.ticketPrice} value={inputs.ticketPriceArs} step={500} onChange={set('ticketPriceArs')} />
          <Field id="revenue-exchange" label={labels.exchange} value={inputs.arsPerUsd} step={10} onChange={set('arsPerUsd')} />
        </fieldset>

        <fieldset className={styles.group}>
          <legend>{labels.wineries}</legend>
          <label className={styles.field} htmlFor="revenue-wineries">
            <span>
              {labels.wineries}: <strong>{inputs.proWineries}</strong>
            </span>
            <input
              id="revenue-wineries"
              className={styles.slider}
              type="range"
              min={0}
              max={100}
              value={inputs.proWineries}
              onChange={event => set('proWineries')(Number(event.target.value))}
            />
          </label>
          <Field id="revenue-price" label={labels.price} value={inputs.subscriptionUsd} onChange={set('subscriptionUsd')} />
          <span className={styles.caption}>{labels.storeFee}</span>
          <Chips
            label={labels.storeFee}
            options={STORE_FEE_PRESETS.map(percent => ({
              key: String(percent),
              text: locale === 'es' ? `${percent} %` : `${percent}%`,
              active: inputs.storeFeePercent === percent,
              pick: () => set('storeFeePercent')(percent),
            }))}
          />
          <span className={styles.caption}>{labels.perSubscriber(usd(result.subscriptions.perSubscriberUsd))}</span>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>{labels.cost}</legend>
          <Chips
            label={labels.cost}
            options={COST_PRESETS.map(preset => ({
              key: preset.id,
              text: preset.users === 0 ? labels.costPresets.today : labels.costPresets.users(preset.users),
              active: inputs.monthlyCostUsd === preset.usd,
              pick: () => set('monthlyCostUsd')(preset.usd),
            }))}
          />
          <Field id="revenue-cost" label={`${labels.cost} (USD)`} value={inputs.monthlyCostUsd} step={0.01} onChange={set('monthlyCostUsd')} />
        </fieldset>
      </div>

      <div className={styles.outputs} aria-live="polite">
        <dl className={styles.figures}>
          <div>
            <dt>{labels.commissionRevenue}</dt>
            <dd>{usd(commission)}</dd>
            <dd className={styles.small}>{labels.ticketsSold(result.commission.tickets)}</dd>
          </div>
          <div>
            <dt>{labels.subscriptionRevenue}</dt>
            <dd>{usd(subscriptions)}</dd>
          </div>
          <div>
            <dt>{labels.revenue}</dt>
            <dd>{usd(revenue)}</dd>
            <dd className={styles.small}>
              {usd(result.revenue * 12)} {labels.perYear}
            </dd>
          </div>
          <div>
            <dt>{labels.margin}</dt>
            <dd className={result.margin >= 0 ? styles.positive : styles.negative}>{usd(margin)}</dd>
            <dd className={styles.small}>
              {usd(result.annualMargin)} {labels.perYear}
            </dd>
          </div>
        </dl>

        <div className={styles.bars}>
          <div className={styles.barRow}>
            <span className={styles.barLabel}>{labels.revenue}</span>
            <span className={styles.track}>
              <span
                className={clsx(styles.bar, styles.commission)}
                style={{ '--w': `${barPercent(result.commission.monthlyUsd, scale)}%` } as CssVars}
              />
              <span
                className={clsx(styles.bar, styles.subscription)}
                style={{ '--w': `${barPercent(result.subscriptions.monthlyUsd, scale)}%` } as CssVars}
              />
            </span>
          </div>
          <div className={styles.barRow}>
            <span className={styles.barLabel}>{labels.costs}</span>
            <span className={styles.track}>
              <span className={clsx(styles.bar, styles.cost)} style={{ '--w': `${barPercent(result.cost, scale)}%` } as CssVars} />
            </span>
          </div>
        </div>

        <p className={styles.line}>{labels.covered(result.covered)}</p>
        <p className={styles.line}>{labels.ticketsNeeded(result.ticketsNeeded)}</p>
        <p className={styles.line}>{labels.wineriesNeeded(result.wineriesNeeded)}</p>
        <p className={styles.note}>{labels.estimate}</p>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { labelsFor, layerForKey, layersFor, nextLayer, statusCounts } from './layers.mjs';
import styles from './styles.module.css';

/** How long the travelling request stays in each layer. */
const STEP_MS = 1400;

type CssVars = CSSProperties & Record<`--${string}`, string>;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * The security defense layers, outermost first. Selecting a layer reveals its controls with their status;
 * a dot travels from the edge to the core to show a request crossing every layer.
 */
export default function DefenseLayers(): ReactNode {
  const { i18n } = useDocusaurusContext();
  const locale = i18n.currentLocale;
  const layers = useMemo(() => layersFor(locale), [locale]);
  const labels = labelsFor(locale);
  const counts = useMemo(() => statusCounts(layers), [layers]);
  const [selected, setSelected] = useState(0);
  const [packet, setPacket] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (paused || reduced) return undefined;
    const timer = window.setInterval(() => setPacket(index => nextLayer(index, layers.length)), STEP_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduced, layers.length]);

  const choose = (index: number) => {
    setSelected(index);
    tabs.current[index]?.focus();
  };

  const navigate = (event: KeyboardEvent<HTMLButtonElement>) => {
    const target = layerForKey(event.key, selected, layers.length);
    if (target === null) return;
    event.preventDefault();
    choose(target);
  };

  const layer = layers[selected];
  const animated = !paused && !reduced;

  return (
    <section className={styles.explorer} aria-label={labels.region}>
      <div className={styles.toolbar}>
        <p className={styles.hint}>{labels.hint}</p>
        {!reduced && (
          <button type="button" className={styles.toggle} onClick={() => setPaused(value => !value)}>
            {paused ? labels.play : labels.pause}
          </button>
        )}
      </div>
      <p className={styles.summary}>{labels.summary(counts)}</p>
      <div className={styles.stack} role="tablist" aria-orientation="vertical" aria-label={labels.region}>
        {layers.map((item, index) => {
          const pending = item.controls.filter(control => control.status === 'pending').length;
          const style: CssVars = { '--depth': String(index), '--layers': String(layers.length) };
          return (
            <button
              key={item.key}
              ref={element => {
                tabs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`defense-layer-${item.key}`}
              aria-selected={index === selected}
              aria-controls="defense-layer-panel"
              tabIndex={index === selected ? 0 : -1}
              className={clsx(styles.layer, index === selected && styles.selected)}
              style={style}
              onClick={() => setSelected(index)}
              onKeyDown={navigate}>
              <span className={styles.number} aria-hidden="true">
                {index + 1}
              </span>
              <span className={styles.title}>{item.title}</span>
              {pending > 0 && (
                <span className={styles.pendingDot} aria-hidden="true">
                  {pending}
                </span>
              )}
              {animated && index === packet && (
                <span className={styles.packet} aria-hidden="true" title={labels.request} />
              )}
            </button>
          );
        })}
      </div>
      <div
        id="defense-layer-panel"
        role="tabpanel"
        aria-labelledby={`defense-layer-${layer.key}`}
        className={styles.panel}>
        <p className={styles.position}>{labels.layerPosition(selected + 1, layers.length)}</p>
        <h3 className={styles.panelTitle}>{layer.title}</h3>
        <p className={styles.panelSummary}>{layer.summary}</p>
        <ul className={styles.controls}>
          {layer.controls.map(control => (
            <li key={control.key} className={styles.control}>
              <span className={clsx(styles.badge, styles[control.status])}>{labels.status[control.status]}</span>
              <span>{control.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

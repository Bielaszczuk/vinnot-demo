import { useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useBaseUrlUtils } from '@docusaurus/useBaseUrl';
import { TIERS, ladderLabels, particlesFor, sparksFor, tiltFrom } from './seals.mjs';
import styles from './styles.module.css';

/** Seal size in the ladder, as on the profile header. */
const SIZE = 104;
const TILT_PROPERTIES = ['--rx', '--ry', '--mx', '--my', '--ang'] as const;

type CssVars = CSSProperties & Record<`--${string}`, string>;

type SealProps = {
  slug: string;
  label: string;
  src: string;
  size: number;
  strength?: number;
};

/**
 * One wax seal with the motion of its tier. Every light layer uses the seal image as a mask,
 * so reflections stay inside the wax; the pointer tilts it and moves the holographic foil.
 */
export function Seal({ slug, label, src, size, strength = 12 }: SealProps): ReactNode {
  const follow = (event: PointerEvent<HTMLSpanElement>) => {
    const element = event.currentTarget;
    const box = element.getBoundingClientRect();
    const tilt = tiltFrom((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height, strength);
    element.style.setProperty('--rx', tilt.rx);
    element.style.setProperty('--ry', tilt.ry);
    element.style.setProperty('--mx', tilt.mx);
    element.style.setProperty('--my', tilt.my);
    element.style.setProperty('--ang', tilt.ang);
  };
  const rest = (event: PointerEvent<HTMLSpanElement>) => {
    for (const property of TILT_PROPERTIES) event.currentTarget.style.removeProperty(property);
  };
  const style: CssVars = { '--s': `${size}px`, '--img': `url("${src}")` };

  return (
    <span
      role="img"
      aria-label={label}
      className={clsx(styles.seal, styles[`t-${slug}`])}
      style={style}
      onPointerMove={follow}
      onPointerLeave={rest}>
      <span className={styles.tilt}>
        <span className={clsx(styles.behind, styles.rays)} />
        <span className={clsx(styles.behind, styles.halo)} />
        <span className={styles.body}>
          <span className={styles.art} />
          <span className={clsx(styles.m, styles.tint)} />
          <span className={clsx(styles.m, styles.holo)} />
          <span className={clsx(styles.m, styles.glitter)} />
          <span className={clsx(styles.m, styles.sheen)} />
        </span>
        <span className={styles.fx}>
          {sparksFor(slug, size).map(spark => (
            <i
              key={`${spark.x}-${spark.y}`}
              className={styles.spark}
              style={{
                left: `${spark.x}%`,
                top: `${spark.y}%`,
                '--z': `${spark.z}%`,
                '--dl': `${spark.delay}s`,
                '--d': `${spark.duration}s`,
                '--c': spark.color,
              } as CssVars}
            />
          ))}
          {particlesFor(slug, size).map(particle => (
            <i
              key={particle.delay}
              className={styles.dot}
              style={{
                left: `${particle.x.toFixed(2)}%`,
                top: `${particle.y.toFixed(2)}%`,
                '--z': `${particle.z.toFixed(2)}%`,
                '--c': particle.color,
                '--dl': `${particle.delay}s`,
                '--d': `${particle.duration}s`,
                '--rise': `${particle.rise}px`,
                '--dx': `${particle.dx}px`,
              } as CssVars}
            />
          ))}
        </span>
      </span>
    </span>
  );
}

/** The eleven seals, animated as on the profile, each with its name, threshold and shine. */
export default function SealLadder(): ReactNode {
  const { i18n } = useDocusaurusContext();
  const { withBaseUrl } = useBaseUrlUtils();
  const labels = ladderLabels(i18n.currentLocale);
  const [paused, setPaused] = useState(false);

  return (
    <section className={clsx(styles.ladder, paused && styles.paused)} aria-label={labels.ladder}>
      <div className={styles.toolbar}>
        <p className={styles.hint}>{labels.hint}</p>
        <button type="button" className={styles.toggle} onClick={() => setPaused(value => !value)}>
          {paused ? labels.play : labels.pause}
        </button>
      </div>
      <ol className={styles.grid}>
        {TIERS.map(tier => {
          const name = labels.names[tier.key as keyof typeof labels.names];
          return (
            <li key={tier.key} className={styles.card}>
              <div className={styles.cell}>
                <Seal
                  slug={tier.slug}
                  label={labels.seal(name)}
                  src={withBaseUrl(`/img/emblems/${tier.slug}.webp`)}
                  size={SIZE}
                />
              </div>
              <div className={styles.name}>{name}</div>
              <div className={styles.points}>{labels.from(tier)}</div>
              <p className={styles.shine}>{labels.shine[tier.slug as keyof typeof labels.shine]}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

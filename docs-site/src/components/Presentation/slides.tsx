import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import { useBaseUrlUtils } from '@docusaurus/useBaseUrl';
import { Seal } from '../SealLadder';
import { CHAPTERS, FACTS, RUBRIC, deckCopy, fill } from './content.mjs';
import { countAt, formatNumber } from './deck.mjs';
import { CHANNELS, PRICING, SCENARIOS, channelTotals, founderSavings, listPriceAt, perHundred, project } from './growth.mjs';
import styles from './styles.module.css';

type Copy = ReturnType<typeof deckCopy>;
type Vars = CSSProperties & Record<`--${string}`, string | number>;

export type SlideProps = {
  copy: Copy;
  step: number;
  active: boolean;
  locale: string;
};

const vars = (values: Record<string, string | number>): Vars =>
  Object.fromEntries(Object.entries(values).map(([key, value]) => [`--${key}`, value])) as Vars;

/** Content shown from a given step of the slide, with a stagger index. */
function Build({ at, step, i = 0, className, children }: { at: number; step: number; i?: number; className?: string; children: ReactNode }) {
  return (
    <div className={clsx(styles.build, step >= at && styles.on, className)} style={vars({ i })}>
      {children}
    </div>
  );
}

/** Rises in when the slide opens, after the elements before it. */
function Rise({ i = 0, className, style, children, as: Tag = 'div' }: { i?: number; className?: string; style?: Vars; children: ReactNode; as?: 'div' | 'p' | 'h2' | 'li' }) {
  return (
    <Tag className={clsx(styles.rise, className)} style={{ ...style, ...vars({ i }) }}>
      {children}
    </Tag>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <h2 className={clsx(styles.title, styles.rise)}>{children}</h2>;
}

/** A number that counts up when it comes into view. */
function Count({ value, run, locale, decimals = 0 }: { value: number; run: boolean; locale: string; decimals?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!run) {
      setShown(0);
      return undefined;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1400;
      setShown(countAt(value, t, decimals));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, value, decimals]);
  return <>{formatNumber(shown, locale, decimals)}</>;
}

const Check = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);

const Arrow = () => (
  <svg className={styles.arrow} viewBox="0 0 60 12" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 6h56M50 1l6 5-6 5" />
  </svg>
);

/* ---------------- intro ---------------- */

export function Cover({ copy }: SlideProps) {
  const { withBaseUrl } = useBaseUrlUtils();
  const text = copy.slides.cover;
  return (
    <div className={clsx(styles.content, styles.cover)}>
      <div className={styles.coverMark}>
        <svg className={styles.rings} viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="48" />
          <circle cx="50" cy="50" r="42" />
        </svg>
        <img src={withBaseUrl('/img/mark.png')} alt="" />
      </div>
      <Rise i={4} as="p" className={styles.kicker}>{text.kicker}</Rise>
      <Rise i={5}>
        <h1 style={{ margin: 0 }}>
          <img className={styles.wordmark} src={withBaseUrl('/img/wordmark.png')} alt={text.title} />
        </h1>
      </Rise>
      <Rise i={7} as="p" className={styles.tagline}>{text.tagline}</Rise>
      <Rise i={9} className={styles.pills}>
        {text.platforms.split(' · ').map(platform => (
          <span key={platform} className={styles.pill}>{platform}</span>
        ))}
      </Rise>
      <Rise i={11} as="p" className={styles.muted}>{text.presenter}</Rise>
    </div>
  );
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

export function Agenda({ copy }: SlideProps) {
  const text = copy.slides.agenda;
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <Rise i={1} as="p" className={styles.lead}>{text.lead}</Rise>
      <ol className={styles.agenda}>
        {CHAPTERS.map((chapter, index) => (
          <Rise key={chapter} as="li" i={index + 2}>
            <span className={styles.numeral}>{NUMERALS[index]}</span>
            <span>
              <span className={styles.agendaTitle}>{copy.chapters[chapter as keyof Copy['chapters']]}</span>
              <span className={styles.agendaDetail}>{text.items[chapter as keyof typeof text.items]}</span>
            </span>
          </Rise>
        ))}
      </ol>
    </div>
  );
}

const FRAGMENT_SPOTS = [
  { x: '4%', y: '8%', r: '-4deg' },
  { x: '46%', y: '18%', r: '3deg' },
  { x: '10%', y: '62%', r: '2.5deg' },
  { x: '50%', y: '72%', r: '-3deg' },
];

export function Problem({ copy, step }: SlideProps) {
  const text = copy.slides.problem;
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.split}>
        <div>
          <div className={styles.scatter}>
            <span className={styles.question} aria-hidden="true">?</span>
            {text.sources.map((source, index) => (
              <span key={source} className={styles.fragment} style={vars({ ...FRAGMENT_SPOTS[index], i: index })}>
                {source}
              </span>
            ))}
          </div>
          <Rise i={6} as="p" className={styles.lead}>{text.drinkers}</Rise>
        </div>
        <Build at={1} step={step} className={clsx(styles.card, styles.sideNote)}>
          <p className={styles.kicker}>{text.wineriesLabel}</p>
          <p className={styles.cardTitle}>{text.wineries}</p>
        </Build>
      </div>
    </div>
  );
}

export function Solution({ copy, step }: SlideProps) {
  const { withBaseUrl } = useBaseUrlUtils();
  const text = copy.slides.solution;
  const spots = text.needs.map((_, index) => {
    const angle = (-90 + (index * 360) / text.needs.length) * (Math.PI / 180);
    return { x: 50 + 39 * Math.cos(angle), y: 50 + 41 * Math.sin(angle) };
  });
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.hub}>
        <svg className={styles.hubLines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {spots.map((spot, index) => (
            <line key={index} x1="50" y1="50" x2={spot.x} y2={spot.y} style={vars({ i: index })} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div className={styles.hubCenter}>
          <img src={withBaseUrl('/img/mark.png')} alt="" />
          {text.hub}
        </div>
        {text.needs.map((item, index) => (
          <div key={item.need} className={styles.node} style={vars({ x: `${spots[index].x}%`, y: `${spots[index].y}%` })}>
            <Rise i={index + 3}>
              <strong>{item.need}</strong>
              <span>{item.offer}</span>
            </Rise>
          </div>
        ))}
      </div>
      <Build at={1} step={step} className={styles.banner}>{text.positioning}</Build>
    </div>
  );
}

const ROLE_COLORS: Record<string, string> = {
  USER: '#ab214c',
  PARTNER: '#a8823f',
  'MODERATOR · ADMIN': '#1f2433',
};

export function Audience({ copy, step }: SlideProps) {
  const text = copy.slides.audience;
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.segments}>
        {text.segments.map((segment, index) => (
          <Rise key={segment.who} i={index + 1} className={clsx(styles.card, styles['segment-card'])}>
            <span className={styles.roles}>
              {segment.role.split(' · ').map(role => (
                <span key={role} className={styles.role} style={vars({ role: ROLE_COLORS[segment.role] })}>{role}</span>
              ))}
            </span>
            <strong className={styles.serif} style={{ fontSize: '1.1em' }}>{segment.who}</strong>
            <span className={styles.muted} style={{ fontSize: '0.85em' }}>{segment.wants}</span>
          </Rise>
        ))}
      </div>
      <Build at={1} step={step} className={styles.strip}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        <span>{text.market}</span>
      </Build>
    </div>
  );
}

function Screen({ kind, cols }: { kind: 'browser' | 'phone'; cols: number }) {
  return (
    <div className={clsx(styles.screen, styles[kind])}>
      <div className={styles.bar} />
      <div className={styles.tiles} style={vars({ cols })}>
        {Array.from({ length: cols * 2 }, (_, index) => (
          <div key={index} className={styles.tile} style={vars({ i: index })} />
        ))}
      </div>
    </div>
  );
}

export function Platforms({ copy, step }: SlideProps) {
  const text = copy.slides.platforms;
  const devices = [
    { key: 'web', kind: 'browser' as const, cols: 4, label: text.web },
    { key: 'ios', kind: 'phone' as const, cols: 2, label: text.ios },
    { key: 'android', kind: 'phone' as const, cols: 2, label: text.android },
  ];
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.platformStack}>
        <div className={styles.devices}>
          {devices.map((device, index) => (
            <Rise key={device.key} i={index + 1} className={styles.device}>
              <Screen kind={device.kind} cols={device.cols} />
              <span className={styles.deviceName}>{device.label.name}</span>
              <span className={styles.deviceDetail}>{device.label.detail}</span>
            </Rise>
          ))}
        </div>
        <Build at={1} step={step} className={styles.apiRow}>
          {/* The three device columns are equal, so their centers sit at 1/6, 1/2 and 5/6 of the stack. */}
          <svg className={styles.wires} viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
            {[100 / 6, 50, 500 / 6].map(x => (
              <path key={x} d={`M${x} 0 C${x} 12, 50 8, 50 20`} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <span className={styles.apiLine}>
            <span className={styles.api}>{text.api}</span>
            <span className={styles.deviceDetail}>{text.apiDetail}</span>
          </span>
          <span className={styles.deviceDetail}>{text.ota}</span>
        </Build>
      </div>
    </div>
  );
}

/* ---------------- product ---------------- */

const FEATURE_ICONS = [
  <svg key="discover" className={styles.icon} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <circle cx="21" cy="21" r="12" />
    <line x1="30" y1="30" x2="41" y2="41" />
    <path d="M17 15c-2 3-2 9 4 12" />
  </svg>,
  <svg key="live" className={styles.icon} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M14 6h20c0 10-2 18-10 18S14 16 14 6z" />
    <path d="M15 13h18" />
    <line x1="24" y1="24" x2="24" y2="38" />
    <path d="M16 42h16" />
  </svg>,
  <svg key="manage" className={styles.icon} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M24 5l16 6v11c0 10-7 17-16 21C15 39 8 32 8 22V11z" />
    <polyline points="17 24 22 29 31 19" />
  </svg>,
];

export function Features({ copy, step }: SlideProps) {
  const text = copy.slides.features;
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.columns}>
        {text.groups.map((group, index) => (
          <Build key={group.name} at={index} step={step} className={clsx(styles.card, styles.feature)}>
            {FEATURE_ICONS[index]}
            <strong className={styles.cardTitle}>{group.name}</strong>
            <ul className={styles.list}>
              {group.items.map(item => <li key={item}>{item}</li>)}
            </ul>
          </Build>
        ))}
      </div>
    </div>
  );
}

const SEAL_NAMES: Record<string, { es: string; en: string }> = {
  brote: { es: 'Brote', en: 'Bud' },
  racimo: { es: 'Racimo', en: 'Cluster' },
  barrica: { es: 'Barrica', en: 'Barrel' },
  reserva: { es: 'Reserva', en: 'Reserve' },
  'gran-enofilo': { es: 'Gran Enófilo', en: 'Grand Oenophile' },
  vinnot: { es: 'Vinnot', en: 'Vinnot' },
};

export function Seals({ copy, step, locale }: SlideProps) {
  const { withBaseUrl } = useBaseUrlUtils();
  const text = copy.slides.seals;
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <Rise i={1} as="p" className={styles.lead}>{text.lead}</Rise>
      <div className={styles.sealRow}>
        {FACTS.seals.map((seal, index) => {
          const name = SEAL_NAMES[seal.slug][locale === 'en' ? 'en' : 'es'];
          return (
            <Rise key={seal.slug} i={index + 2}>
              <div style={vars({ lift: `calc(var(--u) * ${index * 1.4})` })} className={styles.sealItem}>
                <Seal slug={seal.slug} label={name} src={withBaseUrl(`/img/emblems/${seal.slug}.webp`)} size={88 + index * 10} />
                <strong className={styles.serif}>{name}</strong>
                <span className={styles.sealPoints}>{formatNumber(seal.points, locale)} {text.points}</span>
              </div>
            </Rise>
          );
        })}
      </div>
      <div className={styles.actions}>
        {text.actions.map((action, index) => (
          <Build key={action.action} at={1} step={step} i={index} className={clsx(styles.card, styles.action)}>
            <strong>{action.points}</strong>
            <span>{action.action}</span>
          </Build>
        ))}
        <Build at={1} step={step} i={4} className={styles.cap}>{text.cap}</Build>
      </div>
    </div>
  );
}

// Stops zigzag along the route; labels sit below low stops and above high ones, off the line.
const STOPS = [
  { x: 8, y: 72, up: false },
  { x: 25, y: 28, up: true },
  { x: 42, y: 72, up: false },
  { x: 59, y: 28, up: true },
  { x: 76, y: 72, up: false },
  { x: 92, y: 28, up: true },
];

const ROUTE = `M ${STOPS.map(stop => `${stop.x} ${stop.y}`).join(' L ')}`;

export function DemoPlan({ copy, step }: SlideProps) {
  const text = copy.slides['demo-plan'];
  const travelled = (step / (STOPS.length - 1)) * 100;
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <Rise i={1} className={styles.leadRow}>
        <p className={styles.lead}>{text.lead}</p>
        <p className={clsx(styles.kicker)}>{text.access}</p>
      </Rise>
      <Rise i={2} className={styles.route}>
        <svg className={styles.routePath} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={ROUTE} vectorEffect="non-scaling-stroke" />
          <path
            className={styles.travelled}
            d={ROUTE}
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - travelled}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {text.stops.map((stop, index) => (
          <div
            key={`${stop.role}-${index}`}
            className={clsx(styles.stop, STOPS[index].up && styles.up, step >= index && styles.reached, step === index && styles.current)}
            style={vars({ x: `${STOPS[index].x}%`, y: `${STOPS[index].y}%` })}>
            <span className={styles.dot}>{index + 1}</span>
            <strong>{stop.role}</strong>
            <span>{stop.what}</span>
          </div>
        ))}
      </Rise>
    </div>
  );
}

export function Live({ copy }: SlideProps) {
  const text = copy.slides.live;
  return (
    <div className={clsx(styles.content, styles.live)}>
      <Rise i={0} className={styles.badge}>
        <i />
        {text.badge}
      </Rise>
      <Rise i={1}>
        <h2 className={styles.liveTitle}>{text.title}</h2>
      </Rise>
      <Rise i={3} className={styles.urls}>
        <span>{text.web}</span>
        <span>{text.stores}</span>
      </Rise>
      <Rise i={5} as="p" className={styles.muted}>{text.note}</Rise>
    </div>
  );
}

/* ---------------- how it was built ---------------- */

export function Plan({ copy, step }: SlideProps) {
  const text = copy.slides.plan;
  return (
    <div className={styles.content} style={{ gap: 'calc(var(--u) * 1.4)' }}>
      <Title>{text.title}</Title>
      <Rise i={1}>
        <p className={styles.kicker}>{text.objectiveLabel}</p>
        <p className={styles.quote}>{text.objective}</p>
      </Rise>
      <Build at={1} step={step}>
        <p className={styles.kicker}>{text.objectivesLabel} · ✓ {text.done} · ○ {text.planned}</p>
        <div className={styles.objectives}>
          {text.objectives.map((objective, index) => (
            <Build key={objective.id} at={1} step={step} i={index} className={clsx(styles.objective, objective.done === 'no' && styles.pending)}>
              <b>{objective.id}</b>
              <span>{objective.text}</span>
              <em aria-label={objective.done === 'yes' ? text.done : text.planned}>{objective.done === 'yes' ? '✓' : '○'}</em>
            </Build>
          ))}
        </div>
      </Build>
      <Build at={2} step={step} className={styles.scope}>
        <div className={styles.card}>
          <p className={styles.kicker}>{text.inScope}</p>
          <span>{text.inScopeDetail}</span>
        </div>
        <div className={styles.card}>
          <p className={styles.kicker}>{text.outScope}</p>
          <ul className={styles.outList}>
            {text.outScopeItems.map(item => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </Build>
    </div>
  );
}

const MILESTONE_TOPS = ['2.4em', '4.8em', '7.2em'];

export function Timeline({ copy, step }: SlideProps) {
  const text = copy.slides.timeline;
  const { stages, milestones } = FACTS.schedule;
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <Rise i={1} className={styles.gantt}>
        <span />
        {text.months.map(month => <span key={month} className={styles.month}>{month}</span>)}
        {stages.map((stage, index) => (
          <div key={stage.key} style={{ display: 'contents' }}>
            <span className={styles.stageName} style={{ gridColumn: 1, gridRow: index + 2 }}>
              {text.stages[stage.key as keyof typeof text.stages]}
            </span>
            <div
              className={styles.ganttBar}
              style={{ ...vars({ i: index }), gridColumn: `${stage.from + 1} / ${stage.to + 2}`, gridRow: index + 2 }}
            />
          </div>
        ))}
        <div className={clsx(styles.milestones, styles.build, step >= 1 && styles.on)}>
          {milestones.map((milestone, index) => (
            <div
              key={milestone.key}
              className={styles.milestone}
              style={vars({ x: `calc(var(--u) * 24 + (100% - var(--u) * 24) * ${(milestone.month - 1) / 10})`, top: MILESTONE_TOPS[index] })}>
              <span>{text.milestones[milestone.key as keyof typeof text.milestones]}</span>
            </div>
          ))}
        </div>
      </Rise>
    </div>
  );
}

export function Requirements({ copy, step, active, locale }: SlideProps) {
  const text = copy.slides.requirements;
  const facts = FACTS.requirements;
  const stats = [
    { at: 0, value: facts.modules, label: text.modules },
    { at: 0, value: facts.useCases, label: text.useCases },
    { at: 1, value: facts.functional, label: text.functional, note: fill(text.split, { web: facts.web, app: facts.app }) },
    { at: 1, value: facts.nonFunctional, label: text.nonFunctional },
    { at: 2, value: facts.testCases, label: text.testCases },
  ];
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.stats}>
        {stats.map((stat, index) => (
          <Build key={stat.label} at={stat.at} step={step} i={index} className={clsx(styles.card, styles.stat)}>
            <strong><Count value={stat.value} run={active && step >= stat.at} locale={locale} /></strong>
            <span>{stat.label}</span>
            {stat.note && <small>{stat.note}</small>}
          </Build>
        ))}
      </div>
      <Build at={2} step={step}>
        <p className={styles.kicker} style={{ textAlign: 'center', marginBottom: '0.8em' }}>{text.chainLabel}</p>
        <div className={styles.chain}>
          {text.chain.map((link, index) => (
            <div key={link.id} style={{ display: 'contents' }}>
              {index > 0 && <Arrow />}
              <div className={styles.link}>
                <code>{link.id}</code>
                <span>{link.what}</span>
              </div>
            </div>
          ))}
        </div>
      </Build>
    </div>
  );
}

const SKETCHES = [
  <svg key="er" className={styles.sketch} viewBox="0 0 120 70" aria-hidden="true">
    <rect x="4" y="10" width="40" height="46" rx="3" className={styles.fill} />
    <line x1="4" y1="22" x2="44" y2="22" />
    <rect x="76" y="14" width="40" height="40" rx="3" className={styles.fill} />
    <line x1="76" y1="26" x2="116" y2="26" />
    <path d="M44 34h32M68 28l8 6-8 6M48 30v8" />
  </svg>,
  <svg key="class" className={styles.sketch} viewBox="0 0 120 70" aria-hidden="true">
    <rect x="34" y="4" width="52" height="60" rx="3" className={styles.fill} />
    <line x1="34" y1="18" x2="86" y2="18" />
    <line x1="34" y1="42" x2="86" y2="42" />
    <path d="M42 26h28M42 34h20M42 50h32M42 57h22" />
  </svg>,
  <svg key="use-case" className={styles.sketch} viewBox="0 0 120 70" aria-hidden="true">
    <circle cx="18" cy="16" r="7" />
    <path d="M18 23v20M8 31h20M18 43l-8 14M18 43l8 14" />
    <ellipse cx="82" cy="20" rx="30" ry="10" className={styles.fill} />
    <ellipse cx="82" cy="50" rx="30" ry="10" className={styles.fill} />
    <path d="M28 30l24-8M28 34l24 12" />
  </svg>,
  <svg key="architecture" className={styles.sketch} viewBox="0 0 120 70" aria-hidden="true">
    <polygon points="60,2 92,19 92,51 60,68 28,51 28,19" className={styles.fill} />
    <polygon points="60,18 76,26 76,44 60,52 44,44 44,26" />
  </svg>,
  <svg key="gantt" className={styles.sketch} viewBox="0 0 120 70" aria-hidden="true">
    <path d="M6 6v58h110" />
    <rect x="12" y="12" width="30" height="8" rx="4" className={styles.fill} />
    <rect x="34" y="26" width="40" height="8" rx="4" className={styles.fill} />
    <rect x="62" y="40" width="26" height="8" rx="4" className={styles.fill} />
    <rect x="82" y="54" width="30" height="6" rx="3" className={styles.fill} />
  </svg>,
];

export function Diagrams({ copy }: SlideProps) {
  const text = copy.slides.diagrams;
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.diagramGrid}>
        {text.cards.map((card, index) => (
          <Rise key={card.name} i={index + 1} className={clsx(styles.card, styles.diagram)}>
            <div style={vars({ i: index })}>{SKETCHES[index]}</div>
            <strong className={styles.cardTitle}>{card.name}</strong>
            <span className={styles.muted} style={{ fontSize: '0.8em' }}>{fill(card.detail, FACTS.diagrams)}</span>
          </Rise>
        ))}
      </div>
      <Rise i={7} as="p" className={styles.footer}>{text.footer}</Rise>
    </div>
  );
}

const hexagon = (radius: number) =>
  Array.from({ length: 6 }, (_, index) => {
    const angle = ((60 * index - 90) * Math.PI) / 180;
    return `${150 + radius * Math.cos(angle)},${150 + radius * Math.sin(angle)}`;
  }).join(' ');

export function Architecture({ copy, step }: SlideProps) {
  const text = copy.slides.architecture;
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.hexWrap}>
        <svg className={styles.hex} viewBox="0 0 300 300" role="img" aria-label={text.title}>
          <polygon className={styles.outer} points={hexagon(145)} style={vars({ i: 0 })} />
          <polygon className={styles.middle} points={hexagon(98)} style={vars({ i: 1 })} />
          <polygon className={styles.inner} points={hexagon(50)} style={vars({ i: 2 })} />
          <text x="150" y="28">{text.layers.adapters}</text>
          <text x="150" y="40" className={styles.small}>{text.layerDetail.adapters}</text>
          <text x="150" y="75">{text.layers.application}</text>
          <text x="150" y="87" className={styles.small}>{text.layerDetail.application}</text>
          <text x="150" y="150">{text.layers.domain}</text>
          <text x="150" y="162" className={styles.small}>{text.layerDetail.domain.split(',')[0]}</text>
        </svg>
        <div style={{ display: 'grid', gap: 'calc(var(--u) * 2.4)' }}>
          <ul className={styles.facts}>
            {text.facts.map((fact, index) => (
              <Rise key={fact} as="li" i={index + 3}>{fill(fact, FACTS.code)}</Rise>
            ))}
          </ul>
          <Build at={1} step={step} className={styles.flow}>
            {text.flow.map((part, index) => (
              <span key={part} className={styles.step} style={vars({ i: index })}>{part}</span>
            ))}
          </Build>
        </div>
      </div>
    </div>
  );
}

export function Repository({ copy, step, active, locale }: SlideProps) {
  const text = copy.slides.repository;
  const code = FACTS.code;
  const tests = [
    { key: 'backend', value: code.backendTests },
    { key: 'web', value: code.webTests },
    { key: 'app', value: code.appTests },
    { key: 'e2e', value: code.e2e },
  ];
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.split}>
        <ul className={styles.tree}>
          {text.tree.map((entry, index) => (
            <Rise key={entry.path} as="li" i={index + 1}>
              <b>{entry.path}</b>
              <span>{entry.what}</span>
            </Rise>
          ))}
        </ul>
        <div style={{ display: 'grid', gap: 'calc(var(--u) * 2)' }}>
          <Rise i={3} className={clsx(styles.pipeline, step >= 0 && active && styles.on)}>
            {text.pipeline.map((stage, index) => (
              <span key={stage} className={styles.stage} style={vars({ i: index })}>{stage}</span>
            ))}
          </Rise>
          <Build at={1} step={step}>
            <p className={styles.kicker} style={{ marginBottom: '0.6em' }}>{text.tests}</p>
            <div className={styles.testRow}>
              {tests.map(test => (
                <div key={test.key} className={clsx(styles.card, styles.stat)} style={{ padding: '0.8em 0.2em' }}>
                  <strong style={{ fontSize: '2em' }}><Count value={test.value} run={active && step >= 1} locale={locale} /></strong>
                  <span>{text.testLabels[test.key as keyof typeof text.testLabels]}</span>
                </div>
              ))}
            </div>
            <p className={styles.muted} style={{ marginTop: '0.8em' }}>{fill(text.migrations, code)}</p>
          </Build>
        </div>
      </div>
    </div>
  );
}

export function Security({ copy, step }: SlideProps) {
  const text = copy.slides.security;
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.split}>
        <div className={styles.onion}>
          {text.layers.map((layer, index) => (
            <div key={layer} className={clsx(styles.layer, styles.rise)} style={vars({ k: index, i: index + 1 })}>
              {layer}
            </div>
          ))}
        </div>
        <Build at={1} step={step} className={styles.card}>
          <p className={styles.kicker}>{text.qualityLabel}</p>
          <ul className={styles.checks}>
            {text.quality.map((item, index) => (
              <li key={item} style={vars({ i: index })}>
                <Check />
                {item}
              </li>
            ))}
          </ul>
        </Build>
      </div>
    </div>
  );
}

/* ---------------- business ---------------- */

export function Value({ copy, step }: SlideProps) {
  const text = copy.slides.value;
  const { decisions, rows } = FACTS.competitors;
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <Rise i={1} as="p" className={styles.bigQuote}>{text.quote}</Rise>
      <Build at={1} step={step}>
        <p className={styles.kicker} style={{ marginBottom: '0.4em' }}>{text.competitorsLabel}</p>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th />
              {decisions.map(decision => <th key={decision}>{text.decisions[decision as keyof typeof text.decisions]}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.name} className={clsx(row.name === 'Vinnot' && styles.us)}>
                <td>{row.name}</td>
                {decisions.map((decision, index) => (
                  <td key={decision}>
                    {row.covers.includes(decision) && <span className={styles.mark} style={vars({ i: rowIndex * 2 + index })} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.muted} style={{ marginTop: '0.6em' }}>{text.takeaway}</p>
      </Build>
    </div>
  );
}

const RUNG_HEIGHTS = [5, 11, 16];

export function Monetization({ copy, step, active, locale }: SlideProps) {
  const text = copy.slides.monetization;
  const { ticket, rates, example, proUsd } = FACTS.commission;
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.split}>
        <div style={{ display: 'grid', gap: 'calc(var(--u) * 1.4)' }}>
          <Rise i={1} className={styles.ticket}>
            <div>
              <small>{text.ticket}</small>
              <strong>ARS <Count value={ticket} run={active} locale={locale} /></strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <small>{text.vinnot} · {rates[0]} %</small>
              <strong style={{ color: 'var(--gold-bright)' }}>ARS <Count value={example} run={active} locale={locale} /></strong>
            </div>
          </Rise>
          <Rise i={2} className={styles.splitBar}>
            <div className={styles.organizer} style={vars({ i: 0 })}>{text.organizer} · 97 %</div>
            <div className={styles.fee} style={vars({ i: 1 })}>Vinnot · 3 %</div>
          </Rise>
          <Rise i={3} as="p" className={styles.muted}>{text.split}</Rise>
        </div>
        <div style={{ display: 'grid', gap: 'calc(var(--u) * 2)' }}>
          <Build at={1} step={step}>
            <p className={styles.kicker} style={{ marginBottom: '0.6em' }}>{text.roadmapLabel}</p>
            <div className={styles.ladder}>
              {rates.map((rate, index) => (
                <div key={rate} className={clsx(styles.rung, index > 0 && styles.next)}>
                  <div style={vars({ h: RUNG_HEIGHTS[index], i: index })}>{rate} %</div>
                  <span style={{ fontSize: '0.8em' }}>{text.roadmap[index]}</span>
                </div>
              ))}
            </div>
          </Build>
          <Build at={2} step={step}>
            <p className={styles.kicker} style={{ marginBottom: '0.6em' }}>{text.proLabel} <span className={styles.tag}>{text.planned}</span></p>
            <div className={styles.plans}>
              <div className={styles.card}>
                <strong>Free</strong>
                <span className={styles.muted} style={{ fontSize: '0.85em' }}>{text.free}</span>
              </div>
              <div className={styles.card}>
                <strong>Pro</strong>
                <span className={styles.muted} style={{ fontSize: '0.85em' }}>{text.pro} · {fill(text.perMonth, { usd: proUsd })}</span>
              </div>
            </div>
          </Build>
        </div>
      </div>
    </div>
  );
}

const COST_COLORS = ['#ab214c', '#1f2433', '#a8823f', '#df4d72', '#8a7f72'];

export function Scale({ copy, step, active, locale }: SlideProps) {
  const text = copy.slides.scale;
  const { costs, scale, breakEven } = FACTS;
  const max = Math.max(...scale.map(point => point.usd));
  return (
    <div className={styles.content} style={{ gap: 'calc(var(--u) * 2)' }}>
      <Title>{text.title}</Title>
      <div className={styles.split} style={{ alignItems: 'end' }}>
        <div style={{ display: 'grid', gap: 'calc(var(--u) * 1.2)' }}>
          <Rise i={1}>
            <p className={styles.kicker}>{text.costLabel}</p>
            <span className={styles.total}>USD <Count value={costs.total} decimals={2} run={active} locale={locale} /></span>
          </Rise>
          <Rise i={2} className={styles.costBar}>
            {costs.items.map((item, index) => (
              <div key={item.key} style={vars({ w: item.usd, c: COST_COLORS[index], i: index })} />
            ))}
          </Rise>
          <Rise i={3} className={styles.legend}>
            {costs.items.map((item, index) => (
              <span key={item.key}>
                <i style={vars({ c: COST_COLORS[index] })} />
                {text.items[item.key as keyof typeof text.items]} <b>{formatNumber(item.usd, locale, 2)}</b>
              </span>
            ))}
          </Rise>
        </div>
        <Build at={1} step={step}>
          <p className={styles.kicker} style={{ marginBottom: '0.6em' }}>{text.scaleLabel} · {text.perMonth}</p>
          <div className={styles.columnsChart}>
            {scale.map((point, index) => (
              <div key={point.users} className={styles.column}>
                <b>{formatNumber(point.usd, locale, 2)}</b>
                <div style={vars({ h: `${Math.max((point.usd / max) * 82, 6)}%`, i: index })} />
              </div>
            ))}
          </div>
          <div className={styles.axis}>
            {scale.map(point => <span key={point.users}>{formatNumber(point.users, locale)} {text.users}</span>)}
          </div>
        </Build>
      </div>
      <Build at={2} step={step} className={styles.highlight}>{fill(text.breakEven, breakEven)}</Build>
    </div>
  );
}

/* ---------------- growth and the winery offer ---------------- */

const SERIES = {
  conservative: project(SCENARIOS.conservative),
  base: project(SCENARIOS.base),
  optimistic: project(SCENARIOS.optimistic),
};
const percent = (value: number, locale: string) => {
  const points = Math.round(value * 1000) / 10;
  return formatNumber(points, locale, Number.isInteger(points) ? 0 : 1);
};

export function Acquisition({ copy, step, locale }: SlideProps) {
  const text = copy.slides.acquisition;
  const { shops, events, social, paid, wineries } = SCENARIOS.base;
  const funnel = perHundred(shops);
  const totals = channelTotals(SERIES.base);
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const order = [...CHANNELS].sort((a, b) => totals[b] - totals[a]);
  const max = totals[order[0]];
  const hints: Record<string, Record<string, string | number>> = {
    events: { attendees: formatNumber(events.attendees, locale), install: percent(events.install, locale) },
    social: { posts: social.posts },
    paid: { budget: paid.budget, cpi: formatNumber(paid.cpi, locale) },
    wineries: { added: wineries.added },
  };
  const share = Math.round(((totals.shops + totals.events) / total) * 10);
  const scans = Math.round(funnel.scans);
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.split} style={{ alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 'calc(var(--u) * 1.2)' }}>
          <Rise i={1}><p className={styles.kicker}>{text.hundredLabel}</p></Rise>
          <Rise i={2} className={styles.crowd}>
            {Array.from({ length: 100 }, (_, index) => (
              <i
                key={index}
                className={clsx(index < scans && styles.scanned, index === 0 && styles.installed)}
                style={vars({ i: index })}
              />
            ))}
          </Rise>
          <Rise i={3} className={styles.funnel}>
            <span><b>100</b>{text.walk}</span>
            <Arrow />
            <span className={styles.scanned}><b>{formatNumber(funnel.scans, locale)}</b>{text.scan}</span>
            <Arrow />
            <span className={styles.installed}><b>{formatNumber(funnel.installs, locale, 1)}</b>{text.install}</span>
          </Rise>
          <Rise i={4} as="p" className={styles.formula}>
            {fill(text.formula, { added: shops.added, visitors: shops.visitors, scan: percent(shops.scan, locale), install: percent(shops.install, locale) })}
          </Rise>
        </div>
        <Build at={1} step={step} className={styles.bars}>
          <p className={styles.kicker}>{text.channelsLabel}</p>
          {order.map((key, index) => {
            const channel = text.channels[key as keyof typeof text.channels];
            return (
              <div key={key} className={styles.barRow} style={vars({ i: index })}>
                <span>
                  <strong>{channel.name}</strong>
                  <small>{fill(channel.hint, hints[key] ?? {})}</small>
                </span>
                <b>{formatNumber(Math.round(totals[key]), locale)}</b>
                <div className={styles.barTrack}><div style={vars({ w: `${(totals[key] / max) * 100}%`, i: index })} /></div>
              </div>
            );
          })}
        </Build>
      </div>
      <Build at={2} step={step} className={styles.highlight}>{fill(text.key, { share })}</Build>
    </div>
  );
}

const CHART = { width: 100, height: 60 };
const MONTH_TICKS = [1, 3, 6, 9, 12];

export function Growth({ copy, step, active, locale }: SlideProps) {
  const text = copy.slides.growth;
  const max = SERIES.optimistic[11].cumulative;
  const x = (month: number) => ((month - 1) / 11) * CHART.width;
  const y = (value: number) => CHART.height - (value / max) * (CHART.height - 4);
  const line = (series: typeof SERIES.base) => series.map(point => `${x(point.month)},${y(point.cumulative)}`).join(' ');
  const band = `${line(SERIES.optimistic)} ${[...SERIES.conservative].reverse().map(point => `${x(point.month)},${y(point.cumulative)}`).join(' ')}`;
  const last = { conservative: SERIES.conservative[11], base: SERIES.base[11], optimistic: SERIES.optimistic[11] };
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.growthGrid}>
        <Rise i={1} className={styles.chartBox}>
          <p className={styles.kicker}>{text.axis}</p>
          <div className={styles.chartArea}>
            <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} preserveAspectRatio="none" aria-hidden="true">
              {[0.25, 0.5, 0.75].map(level => (
                <line key={level} className={styles.grid} x1="0" x2={CHART.width} y1={y(max * level)} y2={y(max * level)} vectorEffect="non-scaling-stroke" />
              ))}
              <polygon className={clsx(styles.band, step >= 1 && styles.shown)} points={band} />
              <polyline className={clsx(styles.edge, step >= 1 && styles.shown)} points={line(SERIES.optimistic)} vectorEffect="non-scaling-stroke" />
              <polyline className={clsx(styles.edge, step >= 1 && styles.shown)} points={line(SERIES.conservative)} vectorEffect="non-scaling-stroke" />
              <polyline className={styles.baseLine} points={line(SERIES.base)} vectorEffect="non-scaling-stroke" />
            </svg>
            {(Object.keys(last) as (keyof typeof last)[]).map(key => (
              <span
                key={key}
                className={clsx(styles.endLabel, key === 'base' ? styles.baseLabel : step >= 1 ? styles.shown : styles.hiddenLabel)}
                style={vars({ top: `${(y(last[key].cumulative) / CHART.height) * 100}%` })}
              >
                {text.scenarios[key]} · {formatNumber(Math.round(last[key].cumulative), locale)}
              </span>
            ))}
          </div>
          <div className={styles.monthAxis}>
            {MONTH_TICKS.map(month => (
              <span key={month} style={vars({ left: `${(x(month) / CHART.width) * 100}%` })}>{fill(text.month, { month })}</span>
            ))}
          </div>
        </Rise>
        <div className={styles.kpis}>
          <Rise i={2}>
            <span className={styles.total}><Count value={Math.round(last.base.cumulative)} run={active} locale={locale} /></span>
            <span className={styles.muted}>{text.installs} · {text.scenarios.base}</span>
          </Rise>
          <Rise i={3}>
            <span className={styles.total} style={{ color: 'var(--gold)' }}><Count value={Math.round(last.base.mau)} run={active} locale={locale} /></span>
            <span className={styles.muted}>{text.mau}</span>
          </Rise>
          <Build at={1} step={step} className={styles.sideNote}>
            {fill(text.range, { low: formatNumber(Math.round(last.conservative.cumulative), locale), high: formatNumber(Math.round(last.optimistic.cumulative), locale) })}
          </Build>
        </div>
      </div>
      <Build at={2} step={step} className={styles.formula}>
        {fill(text.note, { retention: Math.round(SCENARIOS.base.retention * 100) })}
      </Build>
    </div>
  );
}

const PHASE_AUDIENCE_MONTH: Record<string, number | undefined> = { founders: 6, growth: 12 };

export function Offer({ copy, step, active, locale }: SlideProps) {
  const text = copy.slides.offer;
  const top = Math.max(...PRICING.phases.map(phase => phase.usd));
  const height = (usd: number) => (usd / top) * 12;
  const founder = PRICING.phases[0];
  return (
    <div className={styles.content}>
      <Title>{text.title}</Title>
      <div className={styles.stairs}>
        <div className={styles.stairBars}>
          {PRICING.phases.map((phase, index) => (
            <div key={phase.key} className={styles.stairBar} style={vars({ h: height(phase.usd), i: index })}>
              <span><small>USD</small>{phase.usd}</span>
            </div>
          ))}
          <div className={clsx(styles.lock, step >= 1 && styles.shown)} style={vars({ h: height(founder.usd) })}>
            <span>{fill(text.lock, { usd: founder.usd, months: PRICING.lockMonths })}</span>
          </div>
        </div>
        <div className={styles.stairText}>
          {PRICING.phases.map((phase, index) => {
            const label = text.phases[phase.key as keyof typeof text.phases];
            const month = PHASE_AUDIENCE_MONTH[phase.key];
            return (
              <Rise key={phase.key} i={index + 2} className={styles.phase}>
                <small className={styles.kicker}>{label.when}</small>
                <strong className={styles.serif}>{label.name}</strong>
                <span>{fill(label.condition, { seats: PRICING.founderSeats, mau: formatNumber(phase.mau, locale) })}</span>
                <span className={styles.muted}>
                  {month
                    ? fill(label.audience, { installs: formatNumber(Math.round(SERIES.base[month - 1].cumulative), locale), month })
                    : label.audience}
                </span>
              </Rise>
            );
          })}
        </div>
      </div>
      <Build at={2} step={step} className={styles.savings}>
        <span>
          <small className={styles.kicker}>{fill(text.savings, { months: PRICING.lockMonths })}</small>
          <strong className={styles.total}>USD <Count value={founderSavings(PRICING)} run={active && step >= 2} locale={locale} /></strong>
        </span>
        <span className={styles.muted}>{text.rule}</span>
      </Build>
    </div>
  );
}

// Month of each roadmap stop and the projection month whose audience it shows.
const ROADMAP_STOPS = [{ month: 1 }, { month: 7, audience: 6 }, { month: 13, audience: 12 }, { month: 24 }];

export function Roadmap({ copy, step, locale }: SlideProps) {
  const text = copy.slides.roadmap;
  const founder = PRICING.phases[0].usd;
  const reached = Math.min(step, ROADMAP_STOPS.length - 1);
  const progress = `${((reached + 0.5) / ROADMAP_STOPS.length) * 100}%`;
  const impressions = Math.round(((founder / FACTS.market.metaCpmUsd) * 1000) / 100) * 100;
  return (
    <div className={styles.content} style={{ gap: 'calc(var(--u) * 1.5)' }}>
      <Title>{text.title}</Title>
      <Rise i={1} className={styles.road} style={vars({ p: progress })}>
        <div className={styles.roadTrack} />
        <div className={styles.roadDone} />
        {ROADMAP_STOPS.map((stop, index) => (
          <span
            key={stop.month}
            className={clsx(styles.roadDot, index <= reached && styles.reached)}
            style={vars({ x: `${((index + 0.5) / ROADMAP_STOPS.length) * 100}%` })}
          />
        ))}
        <div className={styles.ribbon}>{fill(text.ribbon, { usd: founder, months: PRICING.lockMonths })}</div>
      </Rise>
      <div className={styles.roadStops}>
        {ROADMAP_STOPS.map((stop, index) => {
          const label = text.stops[index];
          const point = stop.audience ? SERIES.base[stop.audience - 1] : undefined;
          const audience = point
            ? fill(label.audience, { installs: formatNumber(Math.round(point.cumulative), locale), mau: formatNumber(Math.round(point.mau), locale), month: point.month })
            : fill(label.audience, { savings: founderSavings(PRICING) });
          const body = (
            <>
              <small className={styles.kicker}>{label.when}</small>
              <strong className={styles.serif}>{label.name}</strong>
              <span className={styles.prices}>
                <span>{fill(text.list, { usd: listPriceAt(stop.month, PRICING.phases) })}</span>
                <b>{fill(text.founder, { usd: founder })}</b>
              </span>
              <span className={styles.stopAudience}>{audience}</span>
              <ul className={styles.stopItems}>
                {label.items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </>
          );
          return index === 0 ? (
            <Rise key={stop.month} i={2} className={styles.roadStop}>{body}</Rise>
          ) : (
            <Build key={stop.month} at={index} step={step} className={styles.roadStop}>{body}</Build>
          );
        })}
      </div>
      <Build at={4} step={step} className={styles.roadCompare}>
        {fill(text.compare, { usd: founder, impressions: formatNumber(impressions, locale), cellarPass: FACTS.market.cellarPassUsd })}
      </Build>
    </div>
  );
}

/* ---------------- closing ---------------- */

// Store links read better as the app name and version than as long store addresses.
const LINK_TEXT: Record<string, string> = { web: 'vinnot.com', docs: 'vinnot-docs.pages.dev' };

export function Closing({ copy, step }: SlideProps) {
  const text = copy.slides.closing;
  const links = FACTS.links;
  return (
    <div className={styles.content}>
      {step === 0 ? (
        <>
          <Title>{text.recap}</Title>
          <div className={styles.recap}>
            {(Object.keys(RUBRIC) as (keyof typeof RUBRIC)[]).map((block, blockIndex) => (
              <Rise key={block} i={blockIndex + 1} className={clsx(styles.card, styles.on)}>
                <h3>{copy.rubric.blocks[block]}</h3>
                <ul className={styles.checks}>
                  {RUBRIC[block].map((row, index) => (
                    <li key={row} style={vars({ i: blockIndex * 4 + index })}>
                      <Check />
                      {copy.rubric.rows[row as keyof Copy['rubric']['rows']]}
                    </li>
                  ))}
                </ul>
              </Rise>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.thanks}>
          <Rise i={0}>
            <h2 className={styles.liveTitle}>{text.title}</h2>
          </Rise>
          <Rise i={1} as="p" className={styles.tagline}>{text.question}</Rise>
          <Rise i={3} className={styles.linkList}>
            {(Object.keys(text.links) as (keyof typeof text.links)[]).map(key => (
              <span key={key}>
                <b>{text.links[key]}</b>
                <a href={links[key]} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                  {LINK_TEXT[key] ?? `Vinnot ${FACTS.apps.version}`}
                </a>
              </span>
            ))}
          </Rise>
        </div>
      )}
    </div>
  );
}

export const SLIDE_COMPONENTS: Record<string, (props: SlideProps) => ReactNode> = {
  cover: Cover,
  agenda: Agenda,
  problem: Problem,
  solution: Solution,
  audience: Audience,
  platforms: Platforms,
  features: Features,
  seals: Seals,
  'demo-plan': DemoPlan,
  live: Live,
  plan: Plan,
  timeline: Timeline,
  requirements: Requirements,
  diagrams: Diagrams,
  architecture: Architecture,
  repository: Repository,
  security: Security,
  value: Value,
  monetization: Monetization,
  acquisition: Acquisition,
  growth: Growth,
  scale: Scale,
  offer: Offer,
  roadmap: Roadmap,
  closing: Closing,
};

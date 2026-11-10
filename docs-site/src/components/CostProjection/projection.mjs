// Cost and capacity model behind docs/*/business/capacity-and-cost-projections.md (#482, S6).
// Single source of truth: the page tables quote the numbers this module computes, and
// docs-site/test/cost-projection.test.mjs pins them. Kept free of React for node --test.

/** Date the live costs were read from the consoles and the public prices were checked. */
export const MEASURED_ON = '2026-10-29';

/** Users are monthly active users (MAU). The model is not valid above this scale. */
export const MODEL_MAX_USERS = 60000;
export const MODEL_MIN_USERS = 500;

/** The four scales the owner asked about. */
export const SCENARIOS = [1000, 5000, 10000, 50000];

/** Usage assumptions; every projected number depends on them. */
export const ASSUMPTIONS = {
  /** Share of MAU active on a given day (DAU / MAU). */
  dauShare: 0.2,
  /** API requests per daily active user per day. */
  requestsPerDau: 50,
  /** Share of a day's requests that falls in the busiest hour. */
  peakHourShare: 0.12,
  /** Backend plus database CPU time per API request, in seconds. */
  cpuSecondsPerRequest: 0.03,
  /** Share of MAU that uses the web; the rest uses the mobile app. */
  webShare: 0.3,
  /** CloudFront requests per web MAU per month (HTML, JS and CSS bundles, fonts). */
  cdnRequestsPerWebUser: 120,
  /** Image requests that reach the images Worker per DAU per day (the rest hit the device cache). */
  imageRequestsPerDau: 20,
  /** Google Maps JavaScript map loads per web MAU per month. */
  mapLoadsPerWebUser: 2,
  /** Emails sent through SES per MAU per month. */
  emailsPerUser: 2,
  /** OpenAI spend per MAU per month in USD; AI profiles are cached per wine, so most reads cost nothing. */
  aiUsdPerUser: 0.002,
  /** Images uploaded per MAU per month (avatars, labels, covers). */
  uploadsPerUser: 0.3,
  /** Frequently read database data per MAU in KB (detail views kept 180 days, reviews, cellar, points). */
  hotDataKbPerUser: 50,
  /** Catalog, search index and reference data in MB. */
  catalogMb: 100,
};

/** Public prices in USD, us-east-1, 730 h per month (see 50-prices sources on the capacity page). */
export const PRICES = {
  t3aSmallMonth: 13.72,
  t3aMediumMonth: 27.45,
  ebsGbMonth: 0.08,
  ipv4Month: 3.65,
  albMonth: 16.43,
  albLcuHour: 0.008,
  hoursPerMonth: 730,
  rdsT4gMediumSingleAz: 47.45,
  rdsT4gMediumMultiAz: 94.17,
  rdsGp3SingleAzGb: 0.115,
  rdsGp3MultiAzGb: 0.23,
  valkeyT4gMicro: 9.34,
  cloudfrontFreeRequests: 1000000,
  cloudfrontPro: 15,
  workersFreeRequestsPerDay: 100000,
  workersPaid: 5,
  expoFreeMau: 1000,
  expoStarter: 19,
  expoStarterMau: 3000,
  expoProduction: 199,
  expoProductionMau: 50000,
  expoExtraMau: 0.005,
  mapsFreeLoads: 10000,
  mapsPerThousand: 7,
  sesPerThousand: 0.1,
  aiBudgetToday: 8,
  r2MonthlyWritesCap: 5000,
};

/** Monthly costs that do not depend on users (USD). CI scales with development work, not with users. */
export const FIXED_MONTHLY = {
  /** Dev host t3a.small about 17 h a day, 16 GB gp3 and its public IPv4. */
  dev: 14.65,
  /** Secrets Manager, ECR, CloudWatch and S3 as measured in October 2026. */
  otherAws: 1.67,
  /** Apple Developer Program, USD 99 per year. */
  apple: 8.25,
  /** vinnot.com at USD 11.17 per year from the 2027 renewal. */
  domain: 0.93,
};

/** Measured monthly cost (October 2026), the "today" line of the costs page. */
export const CURRENT_COSTS = {
  aws: 38.74,
  githubActions: 33.05,
  openai: 2.4,
  domain: 0.87,
  apple: 8.25,
};

/** Rounds to cents. */
export const cents = value => Math.round(value * 100) / 100;

/** Sum of the measured monthly lines: 83.31. */
export const CURRENT_MONTHLY_USD = cents(Object.values(CURRENT_COSTS).reduce((sum, value) => sum + value, 0));

/** Users that fit in a given amount of database memory, in MB. */
export const usersForDbMemory = memoryMb =>
  Math.floor(((memoryMb - ASSUMPTIONS.catalogMb) * 1000) / ASSUMPTIONS.hotDataKbPerUser);

/** Memory left to cache hot data on each database host, in MB. */
export const DB_MEMORY_MB = { smallHost: 250, mediumHost: 1100, rdsMedium: 3100 };

const ebs = gb => gb * PRICES.ebsGbMonth;
const SINGLE_HOST_LIMIT = 35000;

/**
 * Tiers per service: the plan that holds up to `upTo` MAU and its monthly cost.
 * @type {Record<string, { id: string, upTo: number, usd: number }[]>}
 */
export const TIERS = {
  compute: [
    { id: 't3a-small', upTo: usersForDbMemory(DB_MEMORY_MB.smallHost), usd: cents(PRICES.t3aSmallMonth + ebs(32) + PRICES.ipv4Month) },
    { id: 't3a-medium', upTo: usersForDbMemory(DB_MEMORY_MB.mediumHost), usd: cents(PRICES.t3aMediumMonth + ebs(32) + PRICES.ipv4Month) },
    { id: 't3a-medium-app', upTo: SINGLE_HOST_LIMIT, usd: cents(PRICES.t3aMediumMonth + ebs(16) + PRICES.ipv4Month) },
    {
      id: 'two-t3a-medium-alb',
      upTo: MODEL_MAX_USERS,
      usd: cents(
        2 * PRICES.t3aMediumMonth + 2 * ebs(16) + 4 * PRICES.ipv4Month + PRICES.albMonth + PRICES.albLcuHour * PRICES.hoursPerMonth,
      ),
    },
  ],
  database: [
    { id: 'postgres-on-host', upTo: usersForDbMemory(DB_MEMORY_MB.mediumHost), usd: 0 },
    { id: 'rds-single-az', upTo: SINGLE_HOST_LIMIT, usd: cents(PRICES.rdsT4gMediumSingleAz + 50 * PRICES.rdsGp3SingleAzGb) },
    { id: 'rds-multi-az', upTo: usersForDbMemory(DB_MEMORY_MB.rdsMedium), usd: cents(PRICES.rdsT4gMediumMultiAz + 50 * PRICES.rdsGp3MultiAzGb) },
  ],
  cache: [
    { id: 'in-process', upTo: SINGLE_HOST_LIMIT, usd: 0 },
    { id: 'valkey-micro', upTo: MODEL_MAX_USERS, usd: PRICES.valkeyT4gMicro },
  ],
  cdn: [
    {
      id: 'cloudfront-free',
      upTo: Math.floor(PRICES.cloudfrontFreeRequests / (ASSUMPTIONS.webShare * ASSUMPTIONS.cdnRequestsPerWebUser)),
      usd: 0,
    },
    { id: 'cloudfront-pro', upTo: MODEL_MAX_USERS, usd: PRICES.cloudfrontPro },
  ],
  images: [
    {
      id: 'workers-free',
      upTo: Math.floor(PRICES.workersFreeRequestsPerDay / (ASSUMPTIONS.dauShare * ASSUMPTIONS.imageRequestsPerDau)),
      usd: 0,
    },
    { id: 'workers-paid', upTo: MODEL_MAX_USERS, usd: PRICES.workersPaid },
  ],
};

/** Services in display order. */
export const SERVICES = ['compute', 'database', 'cache', 'cdn', 'images', 'mobileUpdates', 'ai', 'email', 'maps', 'ci'];

/** Clamps a user count into the range the model covers. */
export const clampUsers = users => Math.min(MODEL_MAX_USERS, Math.max(MODEL_MIN_USERS, Math.round(users)));

/** Mobile monthly active users (the Expo update MAU). */
export const mobileUsers = users => Math.ceil(users * (1 - ASSUMPTIONS.webShare) - 1e-9);

/** Peak API requests per second and the vCPU they need. */
export const peakLoad = users => {
  const perSecond = (users * ASSUMPTIONS.dauShare * ASSUMPTIONS.requestsPerDau * ASSUMPTIONS.peakHourShare) / 3600;
  return { requestsPerSecond: cents(perSecond), vcpu: cents(perSecond * ASSUMPTIONS.cpuSecondsPerRequest) };
};

/** Cheapest Expo plan for the mobile MAU. */
export const expoPlan = users => {
  const mobile = mobileUsers(users);
  if (mobile <= PRICES.expoFreeMau) return { id: 'expo-free', usd: 0 };
  const starter = PRICES.expoStarter + PRICES.expoExtraMau * Math.max(0, mobile - PRICES.expoStarterMau);
  const production = PRICES.expoProduction + PRICES.expoExtraMau * Math.max(0, mobile - PRICES.expoProductionMau);
  return starter <= production ? { id: 'expo-starter', usd: cents(starter) } : { id: 'expo-production', usd: cents(production) };
};

/** OpenAI spend and the AI_MONTHLY_LIMIT_USD budget it needs. */
export const aiPlan = users => {
  const usd = cents(users * ASSUMPTIONS.aiUsdPerUser);
  const budget = usd <= PRICES.aiBudgetToday ? PRICES.aiBudgetToday : Math.ceil(usd / 10) * 10;
  return { id: budget === PRICES.aiBudgetToday ? 'ai-budget-today' : 'ai-budget-raised', usd, budget };
};

/** SES emails per month and their cost. */
export const emailPlan = users => {
  const emails = users * ASSUMPTIONS.emailsPerUser;
  return { id: 'ses', usd: cents((emails / 1000) * PRICES.sesPerThousand), emails };
};

/** Google Maps JavaScript loads on the web; the mobile Maps SDK is free. */
export const mapsPlan = users => {
  const loads = Math.ceil(users * ASSUMPTIONS.webShare * ASSUMPTIONS.mapLoadsPerWebUser - 1e-9);
  const extra = Math.max(0, loads - PRICES.mapsFreeLoads);
  return { id: extra === 0 ? 'maps-free' : 'maps-paid', usd: cents((extra / 1000) * PRICES.mapsPerThousand), loads };
};

/**
 * The plan one service needs at a user count.
 * @param {string} service one of SERVICES
 * @param {number} users monthly active users
 * @returns {{ id: string, usd: number }}
 */
export const planFor = (service, users) => {
  const scale = clampUsers(users);
  const tiers = TIERS[service];
  if (tiers) {
    // Every tier list ends at MODEL_MAX_USERS and the scale is clamped, so a tier always matches.
    const tier = /** @type {{ id: string, upTo: number, usd: number }} */ (tiers.find(candidate => scale <= candidate.upTo));
    return { id: tier.id, usd: tier.usd };
  }
  switch (service) {
    case 'mobileUpdates':
      return expoPlan(scale);
    case 'ai': {
      const { id, usd } = aiPlan(scale);
      return { id, usd };
    }
    case 'email':
      return { id: 'ses', usd: emailPlan(scale).usd };
    case 'maps': {
      const { id, usd } = mapsPlan(scale);
      return { id, usd };
    }
    case 'ci':
      return { id: 'github-actions', usd: CURRENT_COSTS.githubActions };
    default:
      throw new Error(`Unknown service: ${service}`);
  }
};

/** Fixed lines that do not depend on users. */
export const fixedMonthly = () => cents(Object.values(FIXED_MONTHLY).reduce((sum, value) => sum + value, 0));

/** Every service's plan and cost, plus the fixed lines and the total, per month. */
export const monthlyBreakdown = users => {
  const services = SERVICES.map(service => ({ service, ...planFor(service, users) }));
  const fixed = fixedMonthly();
  const total = cents(services.reduce((sum, line) => sum + line.usd, 0) + fixed);
  return { users: clampUsers(users), services, fixed, total };
};

/** Total monthly cost in USD. */
export const monthlyCost = users => monthlyBreakdown(users).total;

/** Total annual cost in USD (twelve months; Apple and the domain are already prorated). */
export const annualCost = users => cents(monthlyCost(users) * 12);

/**
 * The limits of the current plans and configuration, in the order they are crossed.
 * `upTo` is the largest MAU that still fits; `kind` says what crossing it takes:
 * a paid plan, a configuration change, or a variable cost.
 */
export const LIMITS = [
  { id: 'expo-free', upTo: Math.floor(PRICES.expoFreeMau / (1 - ASSUMPTIONS.webShare)), kind: 'plan' },
  { id: 'host-memory', upTo: TIERS.compute[0].upTo, kind: 'plan' },
  { id: 'ai-budget', upTo: Math.floor(PRICES.aiBudgetToday / ASSUMPTIONS.aiUsdPerUser), kind: 'config' },
  { id: 'r2-writes', upTo: Math.floor(PRICES.r2MonthlyWritesCap / ASSUMPTIONS.uploadsPerUser), kind: 'config' },
  {
    id: 'maps-free',
    upTo: Math.floor(PRICES.mapsFreeLoads / (ASSUMPTIONS.webShare * ASSUMPTIONS.mapLoadsPerWebUser)),
    kind: 'cost',
  },
  { id: 'single-db-host', upTo: TIERS.compute[1].upTo, kind: 'plan' },
  { id: 'workers-free', upTo: TIERS.images[0].upTo, kind: 'plan' },
  { id: 'cloudfront-free', upTo: TIERS.cdn[0].upTo, kind: 'plan' },
  { id: 'single-app-host', upTo: SINGLE_HOST_LIMIT, kind: 'plan' },
];

/** Limits already crossed at this scale, first crossed first. */
export const bottlenecks = users => {
  const scale = clampUsers(users);
  return LIMITS.filter(limit => scale > limit.upTo).sort((a, b) => a.upTo - b.upTo);
};

/** The first limit the current setup hits. */
export const firstBottleneck = () => [...LIMITS].sort((a, b) => a.upTo - b.upTo)[0];

/** Snap points of the scale slider: the four scenarios plus intermediate values. */
export const SCALE_STEPS = [500, 1000, 1500, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 50000, 60000];

const ES = {
  services: {
    compute: 'Servidor de la API (EC2)',
    database: 'Base de datos',
    cache: 'Caché compartida',
    cdn: 'CDN de la web (CloudFront)',
    images: 'Imágenes (Worker y R2)',
    mobileUpdates: 'Actualizaciones de la app (Expo)',
    ai: 'IA (OpenAI)',
    email: 'Email (SES)',
    maps: 'Mapas en la web',
    ci: 'CI (GitHub Actions)',
  },
  plans: {
    't3a-small': '1 × t3a.small, API y base juntas',
    't3a-medium': '1 × t3a.medium, API y base juntas',
    't3a-medium-app': '1 × t3a.medium solo para la API',
    'two-t3a-medium-alb': '2 × t3a.medium detrás de un ALB',
    'postgres-on-host': 'PostgreSQL en el mismo host',
    'rds-single-az': 'RDS db.t4g.medium, una zona',
    'rds-multi-az': 'RDS db.t4g.medium, Multi-AZ',
    'in-process': 'En memoria de la instancia',
    'valkey-micro': 'ElastiCache Valkey t4g.micro',
    'cloudfront-free': 'Plan Free',
    'cloudfront-pro': 'Plan Pro',
    'workers-free': 'Workers Free',
    'workers-paid': 'Workers Paid',
    'expo-free': 'Plan Free',
    'expo-starter': 'Plan Starter',
    'expo-production': 'Plan Production',
    'ai-budget-today': 'Tope actual de USD 8',
    'ai-budget-raised': 'Subir el tope',
    ses: 'Pago por uso',
    'maps-free': 'Dentro del cupo gratuito',
    'maps-paid': 'Cargas sobre el cupo gratuito',
    'github-actions': 'Plan Free más minutos',
  },
  limits: {
    'expo-free': 'Expo Free: 1.000 usuarios de actualizaciones por mes',
    'host-memory': 'Memoria de la base en el host t3a.small',
    'ai-budget': 'Tope de IA AI_MONTHLY_LIMIT_USD = 8',
    'r2-writes': 'Salvaguarda de 5.000 escrituras R2 por mes',
    'maps-free': 'Cupo gratuito de Google Maps JavaScript',
    'single-db-host': 'Base de datos en el mismo host que la API',
    'workers-free': 'Workers Free: 100.000 pedidos por día',
    'cloudfront-free': 'CloudFront Free: 1 millón de pedidos por mes',
    'single-app-host': 'Una sola instancia de la API, sin alta disponibilidad',
  },
  kinds: { plan: 'cambio de plan', config: 'cambio de configuración', cost: 'costo variable' },
  title: 'Costos por escala',
  users: 'Usuarios activos mensuales',
  perMonth: 'por mes',
  perYear: 'por año',
  fixed: 'Fijos (dev, otros AWS, Apple, dominio)',
  service: 'Servicio',
  plan: 'Plan necesario',
  cost: 'USD por mes',
  bottlenecks: 'Límites superados',
  none: 'Ninguno: los planes actuales alcanzan.',
  first: 'primer cuello de botella',
  upTo: limit => `hasta ${limit.toLocaleString('es-AR')} usuarios`,
  estimate: `Estimación con los precios y costos relevados el 29-10-2026.`,
  stack: 'Composición del costo mensual',
};

const EN = {
  services: {
    compute: 'API server (EC2)',
    database: 'Database',
    cache: 'Shared cache',
    cdn: 'Web CDN (CloudFront)',
    images: 'Images (Worker and R2)',
    mobileUpdates: 'App updates (Expo)',
    ai: 'AI (OpenAI)',
    email: 'Email (SES)',
    maps: 'Maps on the web',
    ci: 'CI (GitHub Actions)',
  },
  plans: {
    't3a-small': '1 × t3a.small, API and database together',
    't3a-medium': '1 × t3a.medium, API and database together',
    't3a-medium-app': '1 × t3a.medium for the API only',
    'two-t3a-medium-alb': '2 × t3a.medium behind an ALB',
    'postgres-on-host': 'PostgreSQL on the same host',
    'rds-single-az': 'RDS db.t4g.medium, single zone',
    'rds-multi-az': 'RDS db.t4g.medium, Multi-AZ',
    'in-process': 'In instance memory',
    'valkey-micro': 'ElastiCache Valkey t4g.micro',
    'cloudfront-free': 'Free plan',
    'cloudfront-pro': 'Pro plan',
    'workers-free': 'Workers Free',
    'workers-paid': 'Workers Paid',
    'expo-free': 'Free plan',
    'expo-starter': 'Starter plan',
    'expo-production': 'Production plan',
    'ai-budget-today': 'Current USD 8 cap',
    'ai-budget-raised': 'Raise the cap',
    ses: 'Pay as you go',
    'maps-free': 'Within the free allowance',
    'maps-paid': 'Loads above the free allowance',
    'github-actions': 'Free plan plus minutes',
  },
  limits: {
    'expo-free': 'Expo Free: 1,000 update users per month',
    'host-memory': 'Database memory on the t3a.small host',
    'ai-budget': 'AI cap AI_MONTHLY_LIMIT_USD = 8',
    'r2-writes': 'R2 guard rail of 5,000 writes per month',
    'maps-free': 'Google Maps JavaScript free allowance',
    'single-db-host': 'Database on the same host as the API',
    'workers-free': 'Workers Free: 100,000 requests per day',
    'cloudfront-free': 'CloudFront Free: 1 million requests per month',
    'single-app-host': 'A single API instance, no high availability',
  },
  kinds: { plan: 'plan change', config: 'configuration change', cost: 'variable cost' },
  title: 'Costs by scale',
  users: 'Monthly active users',
  perMonth: 'per month',
  perYear: 'per year',
  fixed: 'Fixed (dev, other AWS, Apple, domain)',
  service: 'Service',
  plan: 'Plan needed',
  cost: 'USD per month',
  bottlenecks: 'Limits crossed',
  none: 'None: the current plans hold.',
  first: 'first bottleneck',
  upTo: limit => `up to ${limit.toLocaleString('en-US')} users`,
  estimate: 'Estimate with the prices and costs read on 2026-10-29.',
  stack: 'Monthly cost breakdown',
};

/** Labels for the component; `es` for Spanish, English otherwise. */
export const projectionLabels = locale => (locale === 'es' ? ES : EN);

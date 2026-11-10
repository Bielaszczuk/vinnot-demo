// Scenario and hop data for the RequestJourney component, plus pure helpers. No React here,
// so the logic stays testable with node:test. Every hop names the layer it crosses and what
// happens there; the facts come from the infrastructure and backend code linked in
// docs/*/infra/diagrams/request-journey.mdx.

/** Node kinds, used to colour each hop on the track. */
export const KINDS = ['device', 'dns', 'edge', 'proxy', 'app', 'data', 'external'];

/** Scenario order on the picker. */
export const SCENARIO_IDS = ['open-web', 'api-wines', 'image', 'mp-webhook', 'ota'];

/**
 * @typedef {{ index: number, kind: string, name: string, detail: string }} Hop
 * @typedef {{ id: string, title: string, summary: string, hops: Hop[] }} Scenario
 */

const text = (es, en) => ({ es, en });

const SCENARIOS = [
  {
    id: 'open-web',
    title: text('Abrir vinnot.com', 'Open vinnot.com'),
    summary: text(
      'El navegador descarga la web estática desde CloudFront; la API no interviene hasta que la app arranca.',
      'The browser downloads the static web from CloudFront; the API is not involved until the app starts.',
    ),
    hops: [
      {
        kind: 'device',
        name: text('Navegador', 'Browser'),
        detail: text(
          'Pide https://vinnot.com y resuelve el nombre.',
          'Requests https://vinnot.com and resolves the name.',
        ),
      },
      {
        kind: 'dns',
        name: text('DNS de Cloudflare', 'Cloudflare DNS'),
        detail: text(
          'La raíz del dominio apunta al hostname de CloudFront mediante CNAME flattening.',
          'The apex points to the CloudFront hostname through CNAME flattening.',
        ),
      },
      {
        kind: 'edge',
        name: text('CloudFront', 'CloudFront'),
        detail: text(
          'Termina TLS (mínimo TLS 1.2, HTTP/2 y HTTP/3) en el borde más cercano y busca en su caché.',
          'Terminates TLS (TLS 1.2 minimum, HTTP/2 and HTTP/3) at the nearest edge and checks its cache.',
        ),
      },
      {
        kind: 'edge',
        name: text('AWS WAF', 'AWS WAF'),
        detail: text(
          'Evalúa los grupos administrados de reputación IP, ataques comunes y entradas maliciosas conocidas.',
          'Evaluates the managed groups for IP reputation, common attacks and known bad inputs.',
        ),
      },
      {
        kind: 'edge',
        name: text('CloudFront Function', 'CloudFront Function'),
        detail: text(
          'Reescribe las rutas de la SPA a index.html y agrega las cabeceras de seguridad a la respuesta.',
          'Rewrites SPA routes to index.html and adds the security headers to the response.',
        ),
      },
      {
        kind: 'data',
        name: text('S3 privado', 'Private S3'),
        detail: text(
          'Sólo CloudFront lee el bucket (Origin Access Control). index.html sale sin caché; los assets con hash, con caché de un año.',
          'Only CloudFront reads the bucket (Origin Access Control). index.html is never cached; hashed assets are cached for a year.',
        ),
      },
      {
        kind: 'device',
        name: text('Navegador', 'Browser'),
        detail: text(
          'React arranca y empieza a llamar a https://api.vinnot.com/api.',
          'React starts and begins calling https://api.vinnot.com/api.',
        ),
      },
    ],
  },
  {
    id: 'api-wines',
    title: text('La app pide /api/wines', 'The app requests /api/wines'),
    summary: text(
      'Una búsqueda del catálogo cruza Caddy, los filtros de Spring y la base de datos del mismo servidor.',
      'A catalogue search crosses Caddy, the Spring filters and the database on the same host.',
    ),
    hops: [
      {
        kind: 'device',
        name: text('App (iOS o Android)', 'App (iOS or Android)'),
        detail: text(
          'Axios envía GET /api/wines con el token de sesión guardado en el almacenamiento seguro, si hay sesión.',
          'Axios sends GET /api/wines with the session token kept in secure storage, when signed in.',
        ),
      },
      {
        kind: 'dns',
        name: text('Proxy de Cloudflare', 'Cloudflare proxy'),
        detail: text(
          'api.vinnot.com pasa por el proxy de Cloudflare: reglas administradas del WAF, protección DDoS y un límite para /api/auth. El servidor solo acepta conexiones de Cloudflare.',
          'api.vinnot.com goes through the Cloudflare proxy: managed WAF rules, DDoS protection and a rate limit for /api/auth. The host only accepts connections from Cloudflare.',
        ),
      },
      {
        kind: 'proxy',
        name: text('Caddy', 'Caddy'),
        detail: text(
          'Termina TLS con un certificado ACME automático, toma la IP real del cliente de CF-Connecting-IP (solo de Cloudflare), agrega HSTS y nosniff y reenvía a backend:8080.',
          'Terminates TLS with an automatic ACME certificate, takes the real client IP from CF-Connecting-IP (Cloudflare peers only), adds HSTS and nosniff and forwards to backend:8080.',
        ),
      },
      {
        kind: 'app',
        name: text('Límite de pedidos', 'Rate limit'),
        detail: text(
          'Bucket4j cuenta el pedido del cliente: catálogo público 180 por minuto y 1500 por día. Al agotarse responde 429.',
          'Bucket4j counts the client request: public catalogue 180 per minute and 1500 per day. When exhausted it answers 429.',
        ),
      },
      {
        kind: 'app',
        name: text('Filtro JWT', 'JWT filter'),
        detail: text(
          'Si llega un token, comprueba firma y vencimiento y carga el usuario. El catálogo también admite pedidos anónimos.',
          'When a token arrives, it checks signature and expiry and loads the user. The catalogue also accepts anonymous requests.',
        ),
      },
      {
        kind: 'app',
        name: text('Controlador y consulta', 'Controller and query'),
        detail: text(
          'El controlador convierte los parámetros en una consulta; el handler valida la paginación y llama a los puertos de salida.',
          'The controller turns the parameters into a query; the handler validates paging and calls the output ports.',
        ),
      },
      {
        kind: 'data',
        name: text('PostgreSQL', 'PostgreSQL'),
        detail: text(
          'Hikari presta una de sus 6 conexiones; la búsqueda usa unaccent y pg_trgm. Los resultados vuelven como JSON paginado.',
          'Hikari lends one of its 6 connections; search uses unaccent and pg_trgm. The results go back as paged JSON.',
        ),
      },
    ],
  },
  {
    id: 'image',
    title: text('Ver una imagen', 'Show an image'),
    summary: text(
      'Las imágenes no pasan por AWS: las sirve un Worker de Cloudflare desde R2 privado.',
      'Images never reach AWS: a Cloudflare Worker serves them from private R2.',
    ),
    hops: [
      {
        kind: 'device',
        name: text('Web o app', 'Web or app'),
        detail: text(
          'Pide una imagen WebP en https://images.vinnot.com/… con una clave inmutable.',
          'Requests a WebP image at https://images.vinnot.com/… with an immutable key.',
        ),
      },
      {
        kind: 'dns',
        name: text('DNS de Cloudflare', 'Cloudflare DNS'),
        detail: text(
          'images.vinnot.com es el dominio propio del Worker.',
          'images.vinnot.com is the Worker custom domain.',
        ),
      },
      {
        kind: 'edge',
        name: text('Worker vinnot-catalog-images', 'Worker vinnot-catalog-images'),
        detail: text(
          'Acepta sólo GET, HEAD y OPTIONS, y sólo claves con el formato exacto del catálogo, de un avatar o etiqueta pública, o de un diagrama. Lo demás es 404.',
          'Accepts only GET, HEAD and OPTIONS, and only keys in the exact format of the catalogue, a public avatar or label, or a diagram. Anything else is 404.',
        ),
      },
      {
        kind: 'edge',
        name: text('Caché del borde', 'Edge cache'),
        detail: text(
          'Busca la respuesta en la caché de Cloudflare; si está, la devuelve sin tocar R2.',
          'Looks the response up in the Cloudflare cache; on a hit it answers without touching R2.',
        ),
      },
      {
        kind: 'data',
        name: text('R2 privado', 'Private R2'),
        detail: text(
          'Como máximo una lectura por pedido. El bucket no tiene acceso público; la respuesta lleva caché inmutable de un año.',
          'At most one read per request. The bucket has no public access; the response carries a one-year immutable cache.',
        ),
      },
    ],
  },
  {
    id: 'mp-webhook',
    title: text('Pago con Mercado Pago (webhook)', 'Mercado Pago payment (webhook)'),
    summary: text(
      'Mercado Pago avisa un pago; el backend verifica la firma y consulta el pago él mismo en lugar de confiar en el aviso.',
      'Mercado Pago reports a payment; the backend checks the signature and looks the payment up itself instead of trusting the notice.',
    ),
    hops: [
      {
        kind: 'external',
        name: text('Mercado Pago', 'Mercado Pago'),
        detail: text(
          'Tras el cobro envía POST /api/payments/mercadopago/webhooks/{intento} con las cabeceras x-signature y x-request-id.',
          'After the charge it sends POST /api/payments/mercadopago/webhooks/{attempt} with the x-signature and x-request-id headers.',
        ),
      },
      {
        kind: 'proxy',
        name: text('Caddy', 'Caddy'),
        detail: text(
          'Llega por el proxy de Cloudflare, como cualquier pedido a api.vinnot.com; Caddy termina TLS y reenvía al backend.',
          'Arrives through the Cloudflare proxy, like any request to api.vinnot.com; Caddy terminates TLS and forwards to the backend.',
        ),
      },
      {
        kind: 'app',
        name: text('Firma HMAC', 'HMAC signature'),
        detail: text(
          'Recalcula el HMAC-SHA256 con el secreto del webhook. Si no coincide responde 401 y no registra nada.',
          'Recomputes the HMAC-SHA256 with the webhook secret. On a mismatch it answers 401 and records nothing.',
        ),
      },
      {
        kind: 'data',
        name: text('PostgreSQL', 'PostgreSQL'),
        detail: text(
          'Registra el aviso para ese intento de pago. El cuerpo, el vendedor y el estado que trae el aviso no se usan.',
          'Records the notice for that payment attempt. The body, seller and status in the notice are not used.',
        ),
      },
      {
        kind: 'external',
        name: text('API de Mercado Pago', 'Mercado Pago API'),
        detail: text(
          'El servidor busca el pago en api.mercadopago.com por la referencia del checkout y confirma la inscripción con ese dato.',
          'The server looks the payment up at api.mercadopago.com by the checkout reference and confirms the registration from it.',
        ),
      },
      {
        kind: 'external',
        name: text('Push y correo', 'Push and email'),
        detail: text(
          'La confirmación sale por la outbox: notificación por Expo Push y correo por Amazon SES.',
          'The confirmation leaves through the outbox: a notification through Expo Push and an email through Amazon SES.',
        ),
      },
    ],
  },
  {
    id: 'ota',
    title: text('Actualización OTA', 'OTA update'),
    summary: text(
      'Los cambios de JavaScript llegan a la app instalada por EAS Update, sin pasar por las tiendas ni por AWS.',
      'JavaScript changes reach the installed app through EAS Update, without the stores or AWS.',
    ),
    hops: [
      {
        kind: 'external',
        name: text('Publicación', 'Publishing'),
        detail: text(
          'El release publica el bundle con eas update en el canal production.',
          'The release publishes the bundle with eas update to the production channel.',
        ),
      },
      {
        kind: 'device',
        name: text('App al arrancar', 'App at launch'),
        detail: text(
          'expo-updates pregunta por el canal de su build y su runtime version, que sigue la versión de la app.',
          'expo-updates asks for its build channel and its runtime version, which follows the app version.',
        ),
      },
      {
        kind: 'external',
        name: text('EAS Update (u.expo.dev)', 'EAS Update (u.expo.dev)'),
        detail: text(
          'Devuelve el manifiesto de la última actualización compatible con ese canal y esa runtime version.',
          'Returns the manifest of the latest update compatible with that channel and runtime version.',
        ),
      },
      {
        kind: 'device',
        name: text('Descarga', 'Download'),
        detail: text(
          'La app baja el bundle y los assets nuevos en segundo plano; la versión nueva se aplica en el próximo arranque.',
          'The app downloads the new bundle and assets in the background; the new version applies on the next launch.',
        ),
      },
    ],
  },
];

const LABELS = {
  es: {
    picker: 'Escenario',
    track: 'Recorrido del pedido',
    play: 'Reproducir',
    pause: 'Pausar',
    next: 'Siguiente',
    previous: 'Anterior',
    restart: 'Volver a empezar',
    step: (current, total) => `Paso ${current} de ${total}`,
    reducedMotion: 'Tu sistema pide reducir el movimiento: estos son los pasos, sin animación.',
  },
  en: {
    picker: 'Scenario',
    track: 'Request journey',
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    previous: 'Previous',
    restart: 'Start again',
    step: (current, total) => `Step ${current} of ${total}`,
    reducedMotion: 'Your system asks for reduced motion: here are the steps, without animation.',
  },
};

/** 'en' for any English locale, 'es' for everything else (the site default). */
export function normalizeLocale(locale) {
  return typeof locale === 'string' && locale.toLowerCase().startsWith('en') ? 'en' : 'es';
}

/**
 * The scenarios with their texts resolved for one locale.
 * @param {string | undefined} locale
 * @returns {Scenario[]}
 */
export function scenariosFor(locale) {
  const lang = normalizeLocale(locale);
  return SCENARIOS.map(scenario => ({
    id: scenario.id,
    title: scenario.title[lang],
    summary: scenario.summary[lang],
    hops: scenario.hops.map((hop, index) => ({
      index,
      kind: hop.kind,
      name: hop.name[lang],
      detail: hop.detail[lang],
    })),
  }));
}

/** Interface labels for one locale. */
export function labelsFor(locale) {
  return LABELS[normalizeLocale(locale)];
}

/**
 * One scenario by id, or the first one when the id is unknown.
 * @param {Scenario[]} scenarios
 * @param {string} id
 * @returns {Scenario}
 */
export function scenarioById(scenarios, id) {
  return scenarios.find(scenario => scenario.id === id) ?? scenarios[0];
}

/** A whole step between 0 and count - 1; anything that is not a finite number becomes 0. */
export function clampStep(step, count) {
  if (!Number.isFinite(step) || count < 1) return 0;
  return Math.min(Math.max(Math.trunc(step), 0), count - 1);
}

/**
 * The hop at a step, clamped to the scenario.
 * @param {Scenario} scenario
 * @param {number} step
 * @returns {Hop}
 */
export function hopAt(scenario, step) {
  return scenario.hops[clampStep(step, scenario.hops.length)];
}

/** The next step, which stays on the last hop. */
export function nextStep(step, count) {
  return clampStep(step + 1, count);
}

/** The previous step, which stays on the first hop. */
export function previousStep(step, count) {
  return clampStep(step - 1, count);
}

/** True when the step is the last hop. */
export function isLastStep(step, count) {
  return clampStep(step, count) === Math.max(count - 1, 0);
}

/** Where the dot sits on the track, from 0 to 100 percent. A single hop sits at 0. */
export function progress(step, count) {
  if (count <= 1) return 0;
  return (clampStep(step, count) / (count - 1)) * 100;
}

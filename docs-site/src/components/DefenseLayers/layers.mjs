// Data and pure helpers of the security defense layers (#482, S7 and S10): every layer, its controls with
// their status, and the keyboard and animation steps, kept free of React for node --test.
// Each control mirrors a row of docs/<lang>/security/defense-in-depth.md or known-limitations.md.
// Statuses were reviewed on 2026-10-30: 'mitigated' is in the code and the templates but still waits for the owner
// to apply it in the account; 'accepted' is a deliberate decision with a trigger to revisit it.

/** @typedef {'implemented' | 'mitigated' | 'accepted' | 'pending'} Status */
/** @typedef {[key: string, status: Status, es: string, en: string]} ControlRow */
/** @typedef {{ key: string, es: [string, string], en: [string, string], controls: ControlRow[] }} LayerRow */

/** @type {LayerRow[]} */
const LAYERS = [
  {
    key: 'edge',
    es: ['Borde y red', 'Lo primero que encuentra un request: quién puede llegar y por dónde.'],
    en: ['Edge and network', 'The first thing a request meets: who can reach the platform, and through which door.'],
    controls: [
      ['waf-web', 'implemented', 'AWS WAF con reglas administradas delante de la web', 'AWS WAF with managed rule groups in front of the web app'],
      ['ports', 'implemented', 'Solo 80 y 443 públicos; sin SSH', 'Only ports 80 and 443 are public; no SSH'],
      ['ssm', 'implemented', 'Administración por AWS Systems Manager', 'Administration through AWS Systems Manager'],
      ['imds', 'implemented', 'IMDSv2 obligatorio en la instancia', 'IMDSv2 required on the instance'],
      ['db-private', 'implemented', 'PostgreSQL sin puerto publicado', 'PostgreSQL publishes no port'],
      ['trusted-proxies', 'implemented', 'Caddy toma la IP del cliente solo de Cloudflare', 'Caddy takes the client IP only from Cloudflare'],
      ['waf-api', 'mitigated', 'WAF de Cloudflare delante de la API, con un límite sobre /api/auth/*', 'Cloudflare WAF in front of the API, with a limit on /api/auth/*'],
      ['origin-cloudflare', 'mitigated', '80 y 443 de la API abiertos solo a Cloudflare', 'API ports 80 and 443 open only to Cloudflare'],
    ],
  },
  {
    key: 'transport',
    es: ['Transporte', 'Todo viaja cifrado y los navegadores recuerdan usar HTTPS.'],
    en: ['Transport', 'Everything travels encrypted, and browsers remember to use HTTPS.'],
    controls: [
      ['tls-api', 'implemented', 'TLS automático por ACME en Caddy para la API', 'Automatic ACME TLS at Caddy for the API'],
      ['tls-web', 'implemented', 'CloudFront con TLS 1.2 o superior y redirección a HTTPS', 'CloudFront with TLS 1.2 or later and an HTTPS redirect'],
      ['hsts', 'implemented', 'HSTS: 1 año en la API, 180 días en la web', 'HSTS: 1 year on the API, 180 days on the web app'],
      ['s3-tls', 'implemented', 'Los buckets S3 rechazan accesos sin TLS', 'S3 buckets deny non-TLS access'],
      ['pinning', 'pending', 'Certificate pinning en la app', 'Certificate pinning in the app'],
    ],
  },
  {
    key: 'http',
    es: ['Frontera HTTP', 'Qué orígenes, cookies y cabeceras acepta y envía la plataforma.'],
    en: ['HTTP boundary', 'Which origins, cookies and headers the platform accepts and sends.'],
    controls: [
      ['cors', 'implemented', 'CORS con allowlist exacta de orígenes', 'CORS with an exact origin allowlist'],
      ['cookie', 'implemented', 'Cookie __Host- HttpOnly, Secure y SameSite=Strict', '__Host- cookie, HttpOnly, Secure and SameSite=Strict'],
      ['csrf', 'implemented', 'Origin permitido y cabecera propia en los endpoints de cookie', 'An allowed Origin and a custom header on the cookie endpoints'],
      ['headers', 'implemented', 'nosniff, Referrer-Policy, X-Frame-Options DENY', 'nosniff, Referrer-Policy, X-Frame-Options DENY'],
      ['csp', 'implemented', 'CSP con default-src self y frame-ancestors none', "CSP with default-src 'self' and frame-ancestors 'none'"],
      ['csp-styles', 'pending', "CSP de estilos sin 'unsafe-inline'", "A style CSP without 'unsafe-inline'"],
    ],
  },
  {
    key: 'application',
    es: ['Aplicación', 'Quién eres, qué puedes hacer y cuánto puedes pedir.'],
    en: ['Application', 'Who you are, what you may do, and how much you may ask for.'],
    controls: [
      ['bcrypt', 'implemented', 'Contraseñas con BCrypt (costo 10)', 'Passwords hashed with BCrypt (cost 10)'],
      ['tokens', 'implemented', 'JWT de 15 min y refresh de 7 días rotado y hasheado', '15-minute JWT and a rotated, hashed 7-day refresh token'],
      ['session-version', 'implemented', 'Cada request comprueba cuenta, roles y session_version', 'Every request checks the account, roles and session_version'],
      ['step-up', 'implemented', 'Reautenticación de 5 minutos para acciones sensibles', 'A 5-minute re-authentication for sensitive actions'],
      ['social', 'implemented', 'ID tokens de Google y Apple verificados con JWKS', 'Google and Apple ID tokens verified against JWKS'],
      ['rate-limit', 'implemented', 'Rate limiting por política y cupos diarios', 'Rate limits per policy plus daily quotas'],
      ['sizes', 'implemented', 'Límites de JSON, multipart e imágenes', 'Limits on JSON, multipart and image sizes'],
      ['secure-store', 'implemented', 'Sesión mobile en SecureStore, solo este dispositivo', 'Mobile session in SecureStore, this device only'],
      ['deep-links', 'implemented', 'Deep links validados por host y ruta', 'Deep links validated by host and path'],
      ['lockout', 'implemented', 'Pausa de 15 minutos tras 5 contraseñas incorrectas seguidas', 'A 15-minute pause after 5 wrong passwords in a row'],
      ['timing', 'implemented', 'Hash ficticio para cuentas inexistentes: mismo tiempo de respuesta', 'A dummy hash for unknown accounts: the same response time'],
      ['refresh-reuse', 'implemented', 'Un refresh robado que reaparece cierra todas las sesiones', 'A stolen refresh token that shows up again ends every session'],
      ['instance-limits', 'accepted', 'Contadores de rate limit por instancia: un backend por entorno', 'Per-instance rate-limit counters: one backend per environment'],
    ],
  },
  {
    key: 'data',
    es: ['Datos', 'Cómo se guardan, se validan y se cifran los datos.'],
    en: ['Data', 'How data is stored, validated and encrypted.'],
    controls: [
      ['sql', 'implemented', 'SQL con parámetros enlazados', 'SQL with bound parameters'],
      ['uploads', 'implemented', 'Imágenes validadas, decodificadas y re-codificadas', 'Images validated, decoded and re-encoded'],
      ['at-rest', 'implemented', 'EBS y S3 cifrados, con Block Public Access', 'Encrypted EBS and S3, with Block Public Access'],
      ['aes-gcm', 'implemented', 'Credenciales de Mercado Pago con AES-GCM', 'Mercado Pago credentials under AES-GCM'],
      ['webhook', 'implemented', 'Webhooks de pago con HMAC en tiempo constante', 'Payment webhooks checked with a constant-time HMAC'],
      ['backups', 'implemented', 'Backups diarios cifrados, 30 días', 'Encrypted daily backups, kept 30 days'],
      ['field-encryption', 'pending', 'Cifrado de datos personales por campo', 'Field-level encryption of personal data'],
      ['export', 'pending', 'Exportación de datos en autoservicio', 'Self-service data export'],
    ],
  },
  {
    key: 'supply',
    es: ['Cadena de suministro y operación', 'Qué código y qué secretos llegan a producción, y quién se entera si algo falla.'],
    en: ['Supply chain and operations', 'Which code and secrets reach production, and who finds out when something fails.'],
    controls: [
      ['secrets', 'implemented', 'Secretos en AWS Secrets Manager, archivo 077', 'Secrets in AWS Secrets Manager, written with mode 077'],
      ['oidc', 'implemented', 'Release de producción por OIDC, sin claves fijas', 'Production release through OIDC, with no long-lived keys'],
      ['dependabot', 'implemented', 'Dependabot para Actions, npm, Maven y Docker', 'Dependabot for Actions, npm, Maven and Docker'],
      ['pinning-actions', 'implemented', 'Actions fijadas por SHA revisado', 'Actions pinned to reviewed SHAs'],
      ['scanners', 'implemented', 'gitleaks, Trivy y npm audit', 'gitleaks, Trivy and npm audit'],
      ['provenance', 'implemented', 'SBOM, checksums e imagen por digest', 'SBOM, checksums and a digest-pinned image'],
      ['alarms', 'implemented', 'Alarmas de host y sonda externa', 'Host alarms and an external probe'],
      ['security-events', 'implemented', 'Registro de eventos de seguridad, conservado 180 días', 'A security-event log, kept 180 days'],
      ['iac', 'mitigated', 'Plantillas de infraestructura alineadas con el lanzamiento público', 'Infrastructure templates aligned with the public launch'],
      ['oidc-dev', 'pending', 'OIDC también en los despliegues de desarrollo', 'OIDC for the development deploys too'],
      ['ota-signing', 'pending', 'Firma de código de las actualizaciones OTA', 'Code signing of OTA updates'],
      ['audit-view', 'pending', 'Vista y alertas del registro, con el actor de cada acción administrativa', 'A view and alerts on the log, with the actor of each admin action'],
    ],
  },
];

/** The layer keys, outermost first. */
export const LAYER_KEYS = LAYERS.map(layer => layer.key);

/** @param {string} locale */
const languageOf = locale => (locale === 'en' ? 'en' : 'es');

/**
 * The layers in one language, outermost first.
 * @param {string} locale
 * @returns {{ key: string, title: string, summary: string, controls: { key: string, status: Status, label: string }[] }[]}
 */
export function layersFor(locale) {
  const language = languageOf(locale);
  return LAYERS.map(layer => ({
    key: layer.key,
    title: layer[language][0],
    summary: layer[language][1],
    controls: layer.controls.map(([key, status, es, en]) => ({ key, status, label: language === 'en' ? en : es })),
  }));
}

/**
 * How many controls have each status across the given layers.
 * @param {{ controls: { status: Status }[] }[]} layers
 */
export function statusCounts(layers) {
  const counts = { implemented: 0, mitigated: 0, accepted: 0, pending: 0, total: 0 };
  for (const layer of layers) {
    for (const control of layer.controls) {
      counts[control.status] += 1;
      counts.total += 1;
    }
  }
  return counts;
}

/**
 * The layer the travelling request enters next; it starts again at the edge after the last one.
 * @param {number} index
 * @param {number} count
 */
export function nextLayer(index, count) {
  if (count <= 0) return 0;
  return (index + 1) % count;
}

/**
 * The layer a key moves the selection to, or null when the key does not navigate.
 * @param {string} key a KeyboardEvent.key
 * @param {number} index the selected layer
 * @param {number} count
 */
export function layerForKey(key, index, count) {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return nextLayer(index, count);
    case 'ArrowUp':
    case 'ArrowLeft':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

const LABELS = {
  es: {
    region: 'Capas de defensa de Vinnot',
    hint: 'Toca o selecciona una capa para ver sus controles. El punto muestra un request atravesando las capas.',
    pause: 'Pausar el recorrido',
    play: 'Reanudar el recorrido',
    status: { implemented: 'Implementado', mitigated: 'Mitigado', accepted: 'Decisión aceptada', pending: 'Pendiente' },
    request: 'Request',
    /** @param {{ implemented: number, mitigated: number, accepted: number, pending: number }} counts */
    summary: counts =>
      `Implementados: ${counts.implemented} · Mitigados: ${counts.mitigated} · Decisiones aceptadas: ${counts.accepted} · Pendientes: ${counts.pending}`,
    /** @param {number} position @param {number} count */
    layerPosition: (position, count) => `Capa ${position} de ${count}`,
  },
  en: {
    region: 'Vinnot defense layers',
    hint: 'Tap or select a layer to see its controls. The dot shows a request crossing the layers.',
    pause: 'Pause the journey',
    play: 'Resume the journey',
    status: { implemented: 'Implemented', mitigated: 'Mitigated', accepted: 'Accepted decision', pending: 'Pending' },
    request: 'Request',
    /** @param {{ implemented: number, mitigated: number, accepted: number, pending: number }} counts */
    summary: counts =>
      `Implemented: ${counts.implemented} · Mitigated: ${counts.mitigated} · Accepted decisions: ${counts.accepted} · Pending: ${counts.pending}`,
    /** @param {number} position @param {number} count */
    layerPosition: (position, count) => `Layer ${position} of ${count}`,
  },
};

/** @param {string} locale */
export const labelsFor = locale => LABELS[languageOf(locale)];

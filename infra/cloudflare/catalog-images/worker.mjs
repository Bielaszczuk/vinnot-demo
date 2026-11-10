// Private R2 + Workers Free. Never enable direct public R2 access or a paid plan
// without re-evaluating the monthly cap. At most one R2 GET per request; a video
// byte range adds one metadata read to learn the size.
const KEY = /^wines\/ar\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{64}\.webp$/;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UPLOAD = new RegExp(`^uploads/(development|production)/(?:avatars/avatar_${UUID}_${UUID}|wine-labels/wine_label_${UUID})\\.r2\\.webp$`);
// Rendered social media (#492): the backend's key rule (lowercase segments, at most 160 characters, .jpg or .png) and a
// content hash in every file name, so objects never change.
const SOCIAL = /^uploads\/(development|production)\/social\/([a-z0-9]+(?:[/-][a-z0-9]+)*\.(jpg|png))$/;
const SOCIAL_MAX_KEY_LENGTH = 160;
// Full-size documentation diagrams; the key ends in a hash of the Mermaid source, so objects never change.
const DIAGRAM = /^docs\/diagrams\/v1\/(es|en)\/[a-z0-9-]{1,120}-[0-9a-f]{12}\.svg$/;
// SVG can carry scripts: sandbox it and allow only the inline styles, fonts and images it embeds.
const SVG_POLICY = "default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:; sandbox";
// Documentation demo videos; the key ends in a hash of the file, so objects never change.
const VIDEO = /^docs\/videos\/v1\/(es|en)\/[a-z0-9-]{1,120}-[0-9a-f]{12}\.mp4$/;
const IMMUTABLE = "public, max-age=31536000, immutable";

/** Single "bytes=" range against a known size, or null when it cannot be served. */
function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || size === 0 || (match[1] === "" && match[2] === "")) return null;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    if (suffix === 0) return null;
    const offset = Math.max(size - suffix, 0);
    return { offset, length: size - offset };
  }
  const offset = Number(match[1]);
  const end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (offset >= size || end < offset) return null;
  return { offset, length: end - offset + 1 };
}

async function serveVideoRange(request, bucket, key, cors) {
  const meta = await bucket.head(key);
  if (!meta) return new Response(null, { status: 404, headers: { ...cors, "Cache-Control": "no-store" } });
  const range = parseRange(request.headers.get("Range"), meta.size);
  if (!range) return new Response(null, { status: 416, headers: { ...cors, "Content-Range": `bytes */${meta.size}` } });
  const object = await bucket.get(key, { range });
  if (!object) return new Response(null, { status: 404, headers: { ...cors, "Cache-Control": "no-store" } });
  const last = range.offset + range.length - 1;
  return new Response(object.body, { status: 206, headers: { ...cors, "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes", "Cache-Control": IMMUTABLE, "X-Content-Type-Options": "nosniff",
    "Content-Range": `bytes ${range.offset}-${last}/${meta.size}`, "Content-Length": String(range.length),
    ETag: meta.httpEtag } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD, OPTIONS" } });
    }
    const key = url.pathname.slice(1);
    const upload = UPLOAD.exec(key);
    const socialMatch = SOCIAL.exec(key);
    const social = socialMatch && socialMatch[2].length <= SOCIAL_MAX_KEY_LENGTH ? socialMatch : null;
    const environment = upload ? upload[1] : social ? social[1] : null;
    // Bucket bindings isolate user uploads; immutable catalogue objects remain shared.
    const bucket = environment ? env[environment === "development" ? "DEV_UPLOADS" : "PROD_UPLOADS"] : env.CATALOG_IMAGES;
    const diagram = DIAGRAM.test(key);
    const video = VIDEO.test(key);
    if ((!KEY.test(key) && !upload && !social && !diagram && !video) || !bucket || url.search) return new Response(null, { status: 404 });
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS" };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (video && request.method === "GET" && request.headers.has("Range")) return serveVideoRange(request, bucket, key, cors);
    const cacheKey = new Request(url.toString(), { method: "GET" });
    const cached = await caches.default.match(cacheKey);
    if (cached) return request.method === "HEAD"
      ? new Response(null, { status: cached.status, headers: cached.headers }) : cached;
    const object = await bucket.get(key);
    if (!object) return new Response(null, { status: 404, headers: { ...cors, "Cache-Control": "no-store" } });
    const contentType = video ? "video/mp4" : diagram ? "image/svg+xml; charset=utf-8"
      : social ? (social[3] === "png" ? "image/png" : "image/jpeg") : "image/webp";
    const headers = new Headers({ ...cors, "Content-Type": contentType,
      "Cache-Control": upload ? "public, max-age=60, must-revalidate" : IMMUTABLE,
      "X-Content-Type-Options": "nosniff", "Content-Length": String(object.size), ETag: object.httpEtag });
    if (diagram) headers.set("Content-Security-Policy", SVG_POLICY);
    if (video) headers.set("Accept-Ranges", "bytes");
    if (request.method === "HEAD") return new Response(null, { headers });
    const response = new Response(object.body, { headers });
    ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
    return response;
  },
};

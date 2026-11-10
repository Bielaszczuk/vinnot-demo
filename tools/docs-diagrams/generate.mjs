#!/usr/bin/env node
// Renders every docs Mermaid diagram to a full-size Excalidraw SVG (plus its editable .excalidraw scene).
// Usage: node generate.mjs [--only <substring>] [--force] [--sheets]
//   out/<key> mirrors the R2 key (…/<slug>-<hash>.svg) and its .excalidraw scene sits next to it; existing files are skipped unless --force.
//   --sheets writes out/sheets/*.png contact sheets for visual review.
import { build } from "esbuild";
import { chromium } from "playwright-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { allDiagrams } from "../../scripts/lib/docs-diagrams.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, "../..");
const outDir = path.join(here, "out");
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const force = args.includes("--force");
const sheets = args.includes("--sheets");
const PARALLEL = 4;

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const cache = path.join(os.homedir(), "Library/Caches/ms-playwright");
  const dir = fs.existsSync(cache) ? fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().at(-1) : null;
  const app = dir && path.join(cache, dir, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
  if (app && fs.existsSync(app)) return app;
  throw new Error("Set CHROMIUM_PATH to a Chromium or Chrome for Testing binary.");
}

const bundle = path.join(here, "dist/render-page.js");
await build({
  entryPoints: [path.join(here, "src/render-page.js")],
  bundle: true,
  format: "esm",
  outfile: bundle,
  define: { "process.env.NODE_ENV": '"production"', "import.meta.env": "{}" },
  loader: { ".woff2": "file", ".ttf": "file", ".css": "empty" },
  logLevel: "error",
});

const fontsDir = path.join(here, "node_modules/@excalidraw/excalidraw/dist/prod/fonts");
const pageHtml = `<!doctype html><meta charset="utf-8"><script>window.EXCALIDRAW_ASSET_PATH="http://local/";</script>
<body style="margin:0"><div id="editor" style="position:fixed;left:-5000px;top:0;width:800px;height:600px"></div><div id="mermaid" style="position:fixed;left:-20000px;top:0"></div>
<script type="module" src="http://local/render-page.js"></script></body>`;

async function openRenderer(browser) {
  const page = await browser.newPage();
  // A diagram the converter cannot read falls back to an embedded picture; say why.
  page.on("console", (m) => { if (m.text().startsWith("Error processing Mermaid diagram")) console.log(`  converter: ${m.text().split("\n")[0]}`); });
  await page.route("http://local/**", (route) => {
    const p = new URL(route.request().url()).pathname.slice(1);
    if (p === "index.html") return route.fulfill({ contentType: "text/html", body: pageHtml });
    if (p === "render-page.js") return route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(bundle) });
    const font = path.join(fontsDir, p.replace(/^fonts\//, ""));
    if (font.startsWith(fontsDir) && fs.existsSync(font)) return route.fulfill({ contentType: "font/woff2", body: fs.readFileSync(font) });
    return route.fulfill({ status: 404, body: "" });
  });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.goto("http://local/index.html");
  await page.waitForFunction(() => window.rendererReady, null, { timeout: 120000 });
  await page.evaluate(() => window.rendererReady);
  return page;
}

const diagrams = allDiagrams(path.join(repo, "docs")).filter((d) => !only || d.key.includes(only));
const unique = [...new Map(diagrams.map((d) => [d.key, d])).values()];
// The R2 key already ends in .svg; the editable scene sits next to it as .excalidraw.
const base = (d) => path.join(outDir, d.key.replace(/\.svg$/, ""));
const pending = unique.filter((d) => force || !fs.existsSync(`${base(d)}.svg`));
console.log(`${unique.length} images, ${pending.length} to render`);

const browser = await chromium.launch({ executablePath: chromiumPath() });
const fallbacks = [];
let done = 0;
async function worker(queue) {
  const page = await openRenderer(browser);
  for (let d = queue.shift(); d; d = queue.shift()) {
    const { svg, scene, native } = await page.evaluate(([src, lang]) => window.renderDiagram(src, { lang }), [d.source, d.key.split("/").at(-2)]);
    const file = base(d);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(`${file}.svg`, svg);
    fs.writeFileSync(`${file}.excalidraw`, scene);
    if (!native) fallbacks.push(d.key);
    if (++done % 25 === 0) console.log(`  ${done}/${pending.length}`);
  }
  await page.close();
}
const queue = [...pending];
await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, () => worker(queue)));
if (fallbacks.length) console.log(`embedded as image (Mermaid type without native conversion):\n  ${fallbacks.join("\n  ")}`);

if (sheets) {
  // Contact sheets: 6 diagrams per page with their name and key, for one-by-one visual review.
  const sheetDir = path.join(outDir, "sheets");
  fs.mkdirSync(sheetDir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 2400, height: 1000 } });
  for (let i = 0; i < unique.length; i += 6) {
    const cells = unique.slice(i, i + 6).map((d) => {
      const svg = fs.readFileSync(`${base(d)}.svg`, "utf8");
      return `<figure><figcaption><b>${unique.indexOf(d) + 1}. ${d.name}</b><br><small>${d.key}</small></figcaption><div class="img">${svg}</div></figure>`;
    }).join("");
    await page.setContent(`<style>body{margin:0;padding:20px;font:16px system-ui;background:#fff}.g{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
figure{margin:0;border:1px solid #ddd;border-radius:10px;padding:10px}figcaption{margin-bottom:8px;color:#30262c}small{color:#888}
.img svg{width:100%;height:auto;max-height:640px}</style><div class="g">${cells}</div>`);
    await page.screenshot({ path: path.join(sheetDir, `sheet-${String(i / 6 + 1).padStart(3, "0")}.png`), fullPage: true });
  }
  console.log(`contact sheets in ${sheetDir}`);
}
await browser.close();

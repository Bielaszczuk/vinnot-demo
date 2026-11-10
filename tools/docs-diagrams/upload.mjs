#!/usr/bin/env node
// Uploads the rendered diagrams to the catalogue images bucket, served at images.vinnot.com.
// Usage: node upload.mjs [--only <substring>] [--dry-run]
// Keys that already answer 200 are skipped: a key carries the hash of its Mermaid source (and of the renderer changes that affect it), so it never changes.
// Requires `npx wrangler login` (or CLOUDFLARE_API_TOKEN) with write access to the bucket.
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { allDiagrams, DIAGRAM_BASE_URL } from "../../scripts/lib/docs-diagrams.mjs";

const run = promisify(execFile);
const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, "../..");
const BUCKET = "vinnot-catalog-images";
const PARALLEL = 6;
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const dryRun = args.includes("--dry-run");
const wrangler = path.join(here, "node_modules/.bin/wrangler");

const diagrams = allDiagrams(path.join(repo, "docs")).filter((d) => !only || d.key.includes(only));
const unique = [...new Map(diagrams.map((d) => [d.key, d])).values()];
const missingFiles = unique.filter((d) => !fs.existsSync(path.join(here, "out", d.key)));
if (missingFiles.length) {
  console.error(`${missingFiles.length} diagrams are not rendered yet. Run node generate.mjs first.`);
  process.exit(1);
}

// A failed check counts as not published: uploading a key again writes the same bytes.
async function published(d) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return (await fetch(d.url, { method: "HEAD" })).ok;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return false;
}

const pending = [];
for (let i = 0; i < unique.length; i += 24) {
  const batch = unique.slice(i, i + 24);
  const found = await Promise.all(batch.map(published));
  batch.forEach((d, j) => found[j] || pending.push(d));
}
console.log(`${unique.length} diagrams, ${pending.length} to upload to ${DIAGRAM_BASE_URL}`);
if (dryRun) {
  for (const d of pending) console.log(`  ${d.key}`);
  process.exit(0);
}

let done = 0;
const failed = [];
async function worker(queue) {
  for (let d = queue.shift(); d; d = queue.shift()) {
    try {
      await run(wrangler, ["r2", "object", "put", `${BUCKET}/${d.key}`, "--file", path.join(here, "out", d.key),
        "--content-type", "image/svg+xml; charset=utf-8", "--cache-control", "public, max-age=31536000, immutable", "--remote"]);
    } catch (error) {
      failed.push(`${d.key}: ${error.stderr?.trim() || error.message}`);
    }
    if (++done % 25 === 0) console.log(`  ${done}/${pending.length}`);
  }
}
const queue = [...pending];
await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, () => worker(queue)));
if (failed.length) {
  console.error(`${failed.length} uploads failed:\n  ${failed.join("\n  ")}`);
  process.exit(1);
}
console.log(`${pending.length} diagrams uploaded.`);

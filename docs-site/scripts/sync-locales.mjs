// Docusaurus reads translated docs from i18n/<locale>/docusaurus-plugin-content-docs/current.
// docs/en is the canonical English mirror, so the build copies it there instead of keeping a
// second tracked copy. The target folder is generated and git-ignored.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const localeTargets = siteRoot => ({
  en: {
    source: resolve(siteRoot, '..', 'docs', 'en'),
    target: join(siteRoot, 'i18n', 'en', 'docusaurus-plugin-content-docs', 'current'),
  },
});

export function syncLocale({ source, target }) {
  if (!existsSync(source)) {
    throw new Error(`Missing locale source: ${source}`);
  }
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  return target;
}

export function syncAll(siteRoot = siteDir) {
  return Object.values(localeTargets(siteRoot)).map(syncLocale);
}

// Usage: node scripts/sync-locales.mjs [siteDir]
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const target of syncAll(...process.argv.slice(2, 3).map(dir => resolve(dir)))) {
    console.log(`Synced ${target}`);
  }
}

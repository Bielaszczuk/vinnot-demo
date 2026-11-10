import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'content/public-pages.json'), 'utf8');
const parsed = JSON.parse(source);
const slugs = new Set();
for (const page of parsed.pages) {
  if (!/^[a-z][a-z-]*$/.test(page.slug) || slugs.has(page.slug)) throw new Error('Invalid or duplicate public page');
  slugs.add(page.slug);
  for (const locale of ['es', 'en']) {
    if (!page.title[locale] || !page.summary[locale]) throw new Error('Missing public page locale');
  }
  const sections = new Set();
  for (const section of page.sections) {
    if (!/^[a-z][a-z-]*$/.test(section.id) || sections.has(section.id)) throw new Error('Invalid public section');
    sections.add(section.id);
    for (const locale of ['es', 'en']) {
      if (!section.title[locale] || !section.body[locale]) throw new Error('Missing public section locale');
    }
  }
}
for (const project of ['frontend-react', 'frontend-mobile']) {
  const target = resolve(root, project, 'src/domain/public/generated-content.json');
  if (process.argv.includes('--write')) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, source);
  } else if (!existsSync(target) || readFileSync(target, 'utf8') !== source) {
    throw new Error('Public content out of sync: run node scripts/sync-public-content.mjs --write');
  }
}
console.log('Public content: both languages and clients are in sync.');


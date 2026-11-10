#!/usr/bin/env node
// Every Mermaid diagram in docs/ links to its full-size image. Usage:
//   node scripts/check-docs-diagrams.mjs [--docs <dir>] [--write]
import fs from 'node:fs';
import path from 'node:path';
import { checkPage, LANGUAGES, markdownPages, writeLinks } from './lib/docs-diagrams.mjs';

const args = process.argv.slice(2);
const docsAt = args.indexOf('--docs');
const docsRoot = path.resolve(docsAt >= 0 ? args[docsAt + 1] : new URL('../docs', import.meta.url).pathname);
const write = args.includes('--write');

let problems = 0;
let diagrams = 0;
for (const language of LANGUAGES) {
  for (const { full, relativePath } of markdownPages(docsRoot, language)) {
    let markdown = fs.readFileSync(full, 'utf8');
    if (write) {
      const updated = writeLinks(markdown, language, relativePath);
      if (updated !== markdown) fs.writeFileSync(full, updated);
      markdown = updated;
    }
    const found = checkPage(markdown, language, relativePath);
    diagrams += (markdown.match(/^\s*```mermaid\s*$/gm) ?? []).length;
    const lines = markdown.split('\n');
    for (const diagram of found) {
      const index = lines.slice(0, diagram.fenceStart).filter((line) => line.trim() === '```mermaid').length;
      console.error(`${language}/${relativePath}: ${diagram.problem} for diagram ${index + 1}`);
    }
    problems += found.length;
  }
}
if (problems) {
  console.error(`${problems} diagram links need updating. Run node scripts/check-docs-diagrams.mjs --write, then generate and upload the images (tools/docs-diagrams).`);
  process.exit(1);
}
console.log(`${diagrams} diagrams linked to their full-size images.`);

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkPage, findDiagrams, renderRevision, slugFor, sourceHash, writeLinks } from '../lib/docs-diagrams.mjs';
import {
  CRITICAL_COLOR, ganttBarStyle, ganttLegendKinds, ganttWeekWidth, parseGantt, tint,
} from '../../tools/docs-diagrams/src/gantt-model.js';

const page = `# UC-REV-02 · Publicar reseña

## Diagrama

\`\`\`mermaid
sequenceDiagram
  A->>B: hola
\`\`\`

## Flujo de moderación

\`\`\`js
## not a heading
\`\`\`

\`\`\`mermaid
flowchart LR
  A --> B
\`\`\`
`;

test('every Mermaid block gets a name, a content hash and an image URL', () => {
  const [first, second] = findDiagrams(page, 'es', 'modules/reviews/use-cases/uc-rev-02-publish-review.md');
  assert.equal(first.name, 'UC-REV-02 · Publicar reseña');
  assert.equal(second.name, 'Flujo de moderación');
  assert.equal(first.hash, sourceHash('sequenceDiagram\n  A->>B: hola'));
  assert.equal(first.url, `https://images.vinnot.com/docs/diagrams/v1/es/modules-reviews-use-cases-uc-rev-02-publish-review-${first.hash}.svg`);
  assert.equal(first.expectedLink, `[Ver diagrama de «UC-REV-02 · Publicar reseña» completo](${first.url})`);
  assert.equal(findDiagrams(page, 'en', 'a.md')[1].expectedLink.startsWith('[View the full “Flujo de moderación” diagram]('), true);
});

test('section headings borrow the page title and trailing spaces never change the hash', () => {
  const md = '# Reseñas\n\n## Arquitectura\n\n```mermaid\nflowchart LR  \n  A --> B\n```\n';
  const [diagram] = findDiagrams(md, 'es', 'modules/reviews/README.md');
  assert.equal(diagram.name, 'Reseñas · Arquitectura');
  assert.equal(diagram.hash, sourceHash('flowchart LR\n  A --> B'));
  assert.equal(slugFor('Módulos/Reseñas/README.md'), 'modulos-resenas-readme');
  const same = findDiagrams('# Arquitectura\n\n## Arquitectura\n\n```mermaid\nflowchart LR\n```\n', 'es', 'a.md');
  assert.equal(same[0].name, 'Arquitectura');
});

test('a renderer change gives a new image key only to the diagrams it affects, so cached images are never reused', () => {
  const sha = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
  const plain = 'flowchart LR\n  API --> STORE["R2"]';
  const database = 'flowchart LR\n  API --> DB[(PostgreSQL)]';
  assert.equal(renderRevision(plain), 1);
  assert.equal(sourceHash(plain), sha(plain));
  assert.equal(renderRevision(database), 2);
  assert.equal(sourceHash(database), sha(`r2\n${database}`));
  assert.notEqual(sourceHash(database), sourceHash(database, 1));
  assert.equal(renderRevision('gantt\n  title Plan\n  Task :done, a, 2026-01-05, 2026-01-31'), 3);
});

test('snake_case names in headings keep their underscores; emphasis markers are dropped', () => {
  const md = '# Datos\n\n### `wine_catalog_search` y *vista* _rápida_\n\n```mermaid\nerDiagram\n```\n';
  assert.equal(findDiagrams(md, 'es', 'a.md')[0].name, 'wine_catalog_search y vista rápida');
});

test('the diagram catalog lists every diagram of the docs and is up to date', () => {
  const run = spawnSync(process.execPath, [new URL('../docs-diagram-catalog.mjs', import.meta.url).pathname], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});

test('links are inserted below each block, refreshed when the source changes, and pass the check afterwards', () => {
  assert.deepEqual(checkPage(page, 'es', 'p.md').map((d) => d.problem), ['missing link', 'missing link']);
  const linked = writeLinks(page, 'es', 'p.md');
  assert.deepEqual(checkPage(linked, 'es', 'p.md'), []);
  assert.equal(writeLinks(linked, 'es', 'p.md'), linked);
  assert.match(linked, /```\n\n\[Ver diagrama de «UC-REV-02 · Publicar reseña» completo\]/);
  const edited = linked.replace('A->>B: hola', 'A->>B: chau');
  assert.deepEqual(checkPage(edited, 'es', 'p.md').map((d) => d.problem), ['stale link']);
  assert.deepEqual(checkPage(writeLinks(edited, 'es', 'p.md'), 'es', 'p.md'), []);
});

test('the CLI reports missing links with a non-zero exit and fixes them with --write', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-diagrams-'));
  for (const lang of ['es', 'en']) {
    fs.mkdirSync(path.join(root, 'docs', lang), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs', lang, 'p.md'), page);
  }
  const cli = new URL('../check-docs-diagrams.mjs', import.meta.url).pathname;
  const failed = spawnSync(process.execPath, [cli, '--docs', path.join(root, 'docs')], { encoding: 'utf8' });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /es\/p\.md: missing link for diagram 1/);
  assert.match(failed.stderr, /4 diagram links need updating/);
  execFileSync(process.execPath, [cli, '--docs', path.join(root, 'docs'), '--write']);
  const passed = spawnSync(process.execPath, [cli, '--docs', path.join(root, 'docs')], { encoding: 'utf8' });
  assert.equal(passed.status, 0, passed.stderr);
  assert.match(passed.stdout, /4 diagrams linked/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('the link is always its own paragraph, even when text follows the diagram directly', () => {
  const glued = '# Page\n\n```mermaid\nflowchart LR\n  A --> B\n```\nText right after.\n';
  const linked = writeLinks(glued, 'en', 'p.md');
  assert.match(linked, /```\n\n\[View the full “Page” diagram\]\([^)]+\)\n\nText right after\./);
  assert.deepEqual(checkPage(linked, 'en', 'p.md'), []);
  const stuck = linked.replace(/\)\n\nText/, ')\nText');
  assert.deepEqual(checkPage(stuck, 'en', 'p.md').map((d) => d.problem), ['link not followed by a blank line']);
  assert.equal(writeLinks(stuck, 'en', 'p.md'), linked);
});

const history = `gantt
    title History
    dateFormat YYYY-MM-DD
    section Stages
    Build      :done, a, 2026-01-05, 2026-10-28
    section Milestones
    Release    :milestone, m, 2026-09-29, 0d`;

const roadmap = `gantt
    title Roadmap
    dateFormat YYYY-MM-DD
    section Plan
    Release    :crit, r, 2026-11-09, 2026-11-10
    Audit      :crit, a, after r, 3d
    Build      :b, 2026-12-14, 2026-12-18
    section Milestones
    Launch     :crit, milestone, l, 2027-03-01, 0d`;

const tasksOf = (source) => parseGantt(source).sections.flatMap((section) => section.tasks);

test('gantt tasks without done, active or milestone are planned, and crit tasks are on the critical path', () => {
  const [release, audit, build, launch] = tasksOf(roadmap);
  assert.deepEqual([release.planned, audit.planned, build.planned, launch.planned], [true, true, true, false]);
  assert.deepEqual([release.crit, audit.crit, build.crit, launch.crit], [true, true, false, true]);
  assert.equal(audit.end - audit.start, 3);
  assert.equal(audit.start, release.end);
  const [done, milestone] = tasksOf(history);
  assert.deepEqual([done.planned, done.crit, milestone.planned], [false, false, false]);
});

test('the gantt legend names only the kinds a chart uses: planned and critical path never appear in the history', () => {
  assert.deepEqual(ganttLegendKinds(tasksOf(history)), ['done', 'milestone']);
  assert.deepEqual(ganttLegendKinds(tasksOf(roadmap)), ['planned', 'critical', 'milestone']);
});

test('planned and critical-path bars look different from done bars, and done bars keep their look', () => {
  const color = '#245f7f';
  const [done] = tasksOf(history);
  const [release, , build] = tasksOf(roadmap);
  assert.deepEqual(ganttBarStyle(done, color), { backgroundColor: tint(color, 0.15), fillStyle: 'solid', strokeColor: color, strokeWidth: 2 });
  const planned = ganttBarStyle(build, color);
  assert.equal(planned.strokeStyle, 'dashed');
  assert.notEqual(planned.backgroundColor, ganttBarStyle(done, color).backgroundColor);
  const critical = ganttBarStyle(release, color);
  assert.equal(critical.strokeColor, CRITICAL_COLOR);
  assert.ok(critical.strokeWidth > planned.strokeWidth);
});

test('short gantt horizons get wider weeks so short tasks stay readable; long ones keep the original width', () => {
  assert.equal(ganttWeekWidth(44), 26);
  assert.ok(ganttWeekWidth(18) >= 60);
});

/* global process, fetch, AbortSignal */
// Local dependency freshness report. It shows what is out of date, not what is vulnerable
// (security-checks.yml covers that), and it runs on the developer's machine so it costs no
// GitHub Actions minutes. See docs/en/infra/guides/dependency-updates.md.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const NPM_PROJECTS = ['frontend-mobile', 'frontend-react', 'docs-site', 'tools/docs-diagrams'];
const VERSIONS_PLUGIN = 'org.codehaus.mojo:versions-maven-plugin:2.18.0';
// Pre-releases are not upgrade candidates.
const MAVEN_IGNORE = '(?i).*[-.](alpha|beta|rc|cr|m|milestone|snapshot|preview|ea)[-.]?[0-9]*.*';
const ENDS_SOON_DAYS = 180;
const DAY_MS = 86_400_000;
const BUMP_ORDER = ['major', 'minor', 'patch', 'not installed', 'unknown', 'none'];

function versionParts(value) {
  const match = /^[\^~>=<v\s]*(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(value ?? ''));
  return match ? [match[1], match[2], match[3]].map(part => Number(part ?? 0)) : null;
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

/** Size of the jump from the installed version to the newest one. */
export function classifyBump(current, latest) {
  const from = versionParts(current);
  const to = versionParts(latest);
  if (!from || !to) return 'unknown';
  if (compareVersions(to, from) <= 0) return 'none';
  // Under semver, a 0.x minor release may break compatibility (React Native 0.81 -> 0.84).
  if (to[0] !== from[0] || (from[0] === 0 && to[1] !== from[1])) return 'major';
  return to[1] !== from[1] ? 'minor' : 'patch';
}

const lastLine = text => String(text ?? '').trim().split('\n').filter(Boolean).at(-1) ?? 'no output';
const byName = (left, right) => left.name.localeCompare(right.name);

/** `npm outdated --json` lists only outdated packages; workspaces may return arrays. */
export function parseNpmOutdated(stdout) {
  if (!stdout.trim()) return [];
  const report = JSON.parse(stdout);
  if (report === null || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('Invalid npm outdated report');
  }
  if (report.error) throw new Error(`npm outdated failed: ${report.error.code}`);
  return Object.entries(report).map(([name, value]) => {
    const entry = Array.isArray(value) ? value[0] : value;
    const current = entry.current ?? null;
    return { name, current, latest: entry.latest, bump: current ? classifyBump(current, entry.latest) : 'not installed' };
  }).sort(byName);
}

/** Lines of versions-maven-plugin display goals, including the ones it wraps in two. */
export function parseMavenUpdates(output) {
  const rows = new Map();
  let pending = null;
  for (const line of output.split('\n')) {
    const single = /^\[INFO\]\s+(\$\{[^}]+\}|\S+:\S+)\s+\.*\s*(\S+)\s+->\s+(\S+)\s*$/.exec(line);
    const wrappedName = /^\[INFO\]\s+(\$\{[^}]+\}|\S+:\S+)\s+\.+\s*$/.exec(line);
    const wrappedVersions = /^\[INFO\]\s+(\S+)\s+->\s+(\S+)\s*$/.exec(line);
    if (single) rows.set(single[1], [single[2], single[3]]);
    else if (wrappedName) pending = wrappedName[1];
    else if (wrappedVersions && pending) rows.set(pending, [wrappedVersions[1], wrappedVersions[2]]);
    if (!wrappedName) pending = null;
  }
  return [...rows].map(([name, [current, latest]]) => ({ name, current, latest, bump: classifyBump(current, latest) }))
    .sort(byName);
}

/** Packages `expo install --check` wants aligned with the installed Expo SDK. */
export function parseExpoCheck(output) {
  return [...output.matchAll(/^\s+(\S+)@(\S+)\s+-\s+expected version:\s+(\S+)\s*$/gm)]
    .map(([, name, current, expected]) => ({ name, current, expected }));
}

/** PEP 621 `dependencies` and `optional-dependencies` arrays of a pyproject.toml. */
export function parsePyprojectDependencies(text) {
  const requirements = [];
  let section = '';
  let collecting = false;
  for (const line of text.split('\n')) {
    const header = /^\s*\[([^\]]+)\]\s*$/.exec(line);
    if (header) { section = header[1].trim(); collecting = false; continue; }
    const assignment = /^\s*([\w-]+)\s*=\s*\[(.*)$/.exec(line);
    if (assignment) {
      collecting = (['', 'project'].includes(section) && assignment[1] === 'dependencies')
        || section === 'project.optional-dependencies';
    }
    if (!collecting) continue;
    for (const [, requirement] of line.matchAll(/"([^"]+)"/g)) requirements.push(requirement);
    // Extras such as psycopg[binary] sit inside quotes, so only an unquoted bracket closes the array.
    if (line.replace(/"[^"]*"/g, '').includes(']')) collecting = false;
  }
  return requirements.map(requirement => {
    const [, name, spec] = /^([A-Za-z0-9_.-]+)(?:\[[^\]]*\])?\s*([^;]*)/.exec(requirement);
    return { name, spec: spec.trim() };
  });
}

/** `name==version` pins of a pip freeze style lock; comments, markers and options are skipped. */
export function parseRequirementsLock(text) {
  return [...text.matchAll(/^([A-Za-z0-9_.-]+)==([^\s;]+)/gm)].map(([, name, current]) => ({ name, current }));
}

/** True when the newest release is above the declared upper bound. */
export function isOutsideRange(spec, latest) {
  const newest = versionParts(latest);
  return [...spec.matchAll(/<(=?)\s*([\d.]+)/g)].some(([, inclusive, bound]) => {
    const difference = compareVersions(newest, versionParts(bound));
    return inclusive ? difference > 0 : difference >= 0;
  });
}

function safeReader(read) {
  return path => { try { return read(path); } catch { return ''; } };
}

/** Release cycles of the platforms, read from the files that pin them. */
export function readPlatformCycles(root, read = path => readFileSync(path, 'utf8')) {
  const file = safeReader(read);
  const pom = file(join(root, 'backend/pom.xml'));
  const first = (text, pattern) => pattern.exec(text)?.[1] ?? null;
  return {
    nodejs: first(file(join(root, 'frontend-mobile/.nvmrc')), /^\s*v?(\d+)/),
    'eclipse-temurin': first(pom, /<java\.version>(\d+)<\/java\.version>/),
    'spring-boot': first(pom, /<artifactId>spring-boot-starter-parent<\/artifactId>\s*<version>(\d+\.\d+)/),
    // Production runs compose.postgres.yml; the local stack is the fallback.
    postgresql: first(file(join(root, 'infra/aws-low-cost/compose.postgres.yml')), /postgres:(\d+)/)
      ?? first(file(join(root, 'infra/docker-compose.yml')), /postgres:(\d+)/),
  };
}

/** Where a cycle stands in endoflife.date data, which lists the newest cycle first. */
export function evaluateLifecycle(cycle, cycles, today) {
  const newestCycle = cycles[0]?.cycle ?? null;
  // `lts` is true or the date a cycle becomes LTS, which may still be in the future.
  const isLts = entry => entry.lts === true
    || (typeof entry.lts === 'string' && Date.parse(`${entry.lts}T00:00:00Z`) <= today.getTime());
  const newestLts = cycles.find(isLts)?.cycle ?? null;
  const entry = cycles.find(candidate => String(candidate.cycle) === String(cycle));
  if (!entry) return { cycle, eol: null, daysLeft: null, newestCycle, newestLts, status: 'unknown cycle' };
  const eol = typeof entry.eol === 'string' ? entry.eol : null;
  const daysLeft = eol ? Math.round((Date.parse(`${eol}T00:00:00Z`) - today.getTime()) / DAY_MS) : null;
  let status = 'ok';
  if (entry.eol === true || (daysLeft !== null && daysLeft < 0)) status = 'end of life';
  else if (daysLeft !== null && daysLeft <= ENDS_SOON_DAYS) status = 'ends soon';
  return { cycle: entry.cycle, eol, daysLeft, newestCycle, newestLts, status };
}

function toolError(label, result) {
  return `${label} exited with ${result.status}: ${lastLine(result.stderr || result.stdout)}`;
}

const missingModules = project => `node_modules is missing; run npm ci in ${project} first`;

function npmSection(root, project, run, exists) {
  if (!exists(join(root, project, 'node_modules'))) return { project, error: missingModules(project) };
  const result = run('npm', ['outdated', '--json'], { cwd: join(root, project) });
  if (![0, 1].includes(result.status)) return { project, error: toolError('npm', result) };
  try {
    return { project, rows: parseNpmOutdated(result.stdout) };
  } catch (error) {
    return { project, error: error.message };
  }
}

function expoSection(root, run, exists) {
  if (!exists(join(root, 'frontend-mobile', 'node_modules'))) return { error: missingModules('frontend-mobile') };
  const result = run('npx', ['expo', 'install', '--check'], { cwd: join(root, 'frontend-mobile') });
  const rows = parseExpoCheck(result.stdout);
  if (result.status !== 0 && rows.length === 0) return { error: toolError('expo install --check', result) };
  return { rows };
}

function mavenSection(root, run) {
  const result = run('mvn', ['-B', '-ntp', '-f', join(root, 'backend/pom.xml'),
    `${VERSIONS_PLUGIN}:display-parent-updates`, `${VERSIONS_PLUGIN}:display-dependency-updates`,
    `${VERSIONS_PLUGIN}:display-property-updates`,
    // Only what the POM declares; the Spring Boot parent update covers everything its BOM manages.
    '-DprocessDependencyManagement=false', `-Dmaven.version.ignore=${MAVEN_IGNORE}`], { cwd: root });
  if (result.status !== 0) return { error: toolError('Maven', result) };
  return { rows: parseMavenUpdates(result.stdout) };
}

async function pythonSection(root, readFile, fetchJson) {
  const project = join(root, 'scripts/wine-images');
  const lookups = new Map();
  // Each package is looked up once, even when both the lock and pyproject.toml name it.
  const latestOf = name => {
    if (!lookups.has(name)) {
      lookups.set(name, fetchJson(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`).then(({ info }) => info.version));
    }
    return lookups.get(name);
  };
  const requirements = parsePyprojectDependencies(readFile(join(project, 'pyproject.toml')));
  const rows = await Promise.all(requirements.map(async ({ name, spec }) => {
    try {
      const latest = await latestOf(name);
      return { name, spec, latest, outsideRange: isOutsideRange(spec, latest) };
    } catch (error) {
      return { name, spec, error: error.message };
    }
  }));
  const pins = parseRequirementsLock(safeReader(readFile)(join(project, 'requirements.lock')));
  const results = await Promise.all(pins.map(pin => latestOf(pin.name)
    .then(latest => ({ ...pin, latest, bump: classifyBump(pin.current, latest) }), error => ({ ...pin, error }))));
  const failed = results.filter(result => result.error);
  const locked = failed.length
    ? { error: `PyPI lookup failed for ${failed.map(result => result.name).join(', ')}: ${failed[0].error.message}` }
    : { rows: results.filter(result => result.bump !== 'none').sort(byName) };
  return { rows, locked };
}

async function platformSection(root, readFile, fetchJson, today) {
  const cycles = readPlatformCycles(root, readFile);
  return Promise.all(Object.entries(cycles).map(async ([product, cycle]) => {
    try {
      const data = await fetchJson(`https://endoflife.date/api/${product}.json`);
      return { product, ...evaluateLifecycle(cycle, data, today) };
    } catch (error) {
      return { product, cycle, status: 'lookup failed', error: error.message };
    }
  }));
}

/** Runs every check. A failing tool becomes that section's error, never a crash. */
export async function buildReport(root, { run, fetchJson, readFile, exists, today }) {
  return {
    date: today.toISOString().slice(0, 10),
    npm: NPM_PROJECTS.map(project => npmSection(root, project, run, exists)),
    expo: expoSection(root, run, exists),
    maven: mavenSection(root, run),
    python: await pythonSection(root, readFile, fetchJson),
    platforms: await platformSection(root, readFile, fetchJson, today),
  };
}

const ordered = rows => [...rows].sort((left, right) =>
  BUMP_ORDER.indexOf(left.bump) - BUMP_ORDER.indexOf(right.bump) || left.name.localeCompare(right.name));

function countBumps(rows = []) {
  const count = bump => rows.filter(row => row.bump === bump).length;
  return [count('major'), count('minor'), count('patch'), rows.length - count('major') - count('minor') - count('patch')];
}

function versionTable(section) {
  if (section.error) return `Could not check: ${section.error}\n`;
  if (section.rows.length === 0) return 'Everything is current.\n';
  return ['| Package | Current | Latest | Jump |', '|---|---|---|---|',
    ...ordered(section.rows).map(row => `| \`${row.name}\` | ${row.current ?? '—'} | ${row.latest} | ${row.bump} |`)]
    .join('\n') + '\n';
}

function expoSdkLine(npm) {
  const expo = npm.find(section => section.project === 'frontend-mobile')?.rows?.find(row => row.name === 'expo');
  if (!expo?.current) return '';
  const installed = versionParts(expo.current)[0];
  const latest = versionParts(expo.latest)[0];
  return `\nExpo SDK: ${installed} installed, ${latest} latest — ${latest - installed} SDKs behind.\n`;
}

export function renderReport(report) {
  const summary = [
    ...report.npm.map(section => [`npm \`${section.project}\``, section]),
    ['Maven `backend`', report.maven],
    ['Python `scripts/wine-images`', report.python.locked],
  ].map(([area, section]) => (section.error
    ? `| ${area} | — | — | — | not checked |`
    : `| ${area} | ${countBumps(section.rows).join(' | ')} |`));
  const expo = report.expo.error ? `Could not check: ${report.expo.error}\n`
    : report.expo.rows.length === 0 ? 'Every package matches the installed Expo SDK.\n'
      : ['| Package | Installed | Expected |', '|---|---|---|',
        ...report.expo.rows.map(row => `| \`${row.name}\` | ${row.current} | ${row.expected} |`)].join('\n') + '\n';
  const python = ['| Package | Declared | Latest | Status |', '|---|---|---|---|',
    ...report.python.rows.map(row => (row.error
      ? `| \`${row.name}\` | ${row.spec || 'any'} | — | lookup failed: ${row.error} |`
      : `| \`${row.name}\` | ${row.spec || 'any'} | ${row.latest} | ${row.outsideRange ? 'outside the declared range' : 'within range'} |`))];
  const platforms = ['| Platform | Cycle | End of life | Days left | Newest | Newest LTS | Status |', '|---|---|---|---|---|---|---|',
    ...report.platforms.map(row => `| ${row.product} | ${row.cycle ?? '—'} | ${row.eol ?? '—'} | ${row.daysLeft ?? '—'} | ${row.newestCycle ?? '—'} | ${row.newestLts ?? '—'} | ${row.status} |`)];
  return [
    `# Dependency freshness report — ${report.date}\n`,
    '## Summary\n',
    '| Area | Major | Minor | Patch | Other |', '|---|---|---|---|---|', ...summary,
    expoSdkLine(report.npm),
    ...report.npm.flatMap(section => [`## npm — \`${section.project}\`\n`, versionTable(section)]),
    '## Expo SDK alignment (`expo install --check`)\n', expo,
    '## Maven — `backend`\n', versionTable(report.maven),
    '## Python — `scripts/wine-images`\n',
    '### Locked versions (`requirements.lock`)\n', versionTable(report.python.locked),
    '### Declared ranges (`pyproject.toml`)\n', python.join('\n') + '\n',
    '## Platforms (endoflife.date)\n', platforms.join('\n') + '\n',
  ].join('\n');
}

function defaultEnvironment() {
  return {
    run: (command, args, { cwd }) => {
      const result = spawnSync(command, args, {
        cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, CI: '1' },
      });
      return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr || result.error?.message || '' };
    },
    fetchJson: async url => {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    readFile: path => readFileSync(path, 'utf8'),
    exists: existsSync,
    today: new Date(),
    write: text => process.stdout.write(text),
    writeError: text => process.stderr.write(text),
  };
}

export async function main(argv, environment = defaultEnvironment()) {
  const usage = 'Usage: node scripts/dependency-report.mjs [--output <file>]\n';
  let output = null;
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--output' && output === null && index + 1 < argv.length) output = argv[++index];
    else { environment.writeError(usage); return 2; }
  }
  const markdown = renderReport(await buildReport(repositoryRoot, environment));
  if (output) {
    writeFileSync(output, markdown);
    environment.write(`Report written to ${output}\n`);
  } else {
    environment.write(markdown);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}

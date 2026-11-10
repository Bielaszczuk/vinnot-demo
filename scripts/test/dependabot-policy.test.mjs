import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = readFileSync(new URL('../../.github/dependabot.yml', import.meta.url), 'utf8');
// Each `- package-ecosystem:` item, split on the list marker.
const entries = config.split(/\n  - package-ecosystem: /).slice(1).map(block => ({
  ecosystem: block.split('\n')[0].trim(),
  directories: [...block.matchAll(/^\s+(?:directory: |- )'?(\/[^'\s]*)'?$/gm)].map(match => match[1]),
  block,
}));
const entry = (ecosystem, directory) => entries.find(candidate =>
  candidate.ecosystem === ecosystem && candidate.directories.includes(directory));

test('every dependency manifest has a Dependabot entry', () => {
  for (const [ecosystem, directory] of [
    ['github-actions', '/'],
    ['npm', '/frontend-mobile'], ['npm', '/frontend-react'], ['npm', '/docs-site'], ['npm', '/tools/docs-diagrams'],
    ['maven', '/backend'],
    ['docker', '/backend'], ['docker-compose', '/infra'], ['docker-compose', '/infra/aws-low-cost'],
  ]) assert.ok(entry(ecosystem, directory), `${ecosystem} ${directory}`);
});

test('Python is left to the local report, because Dependabot does not read requirements.lock', () => {
  assert.equal(entries.some(candidate => candidate.ecosystem === 'pip'), false);
});

test('dependency updates are monthly, grouped and only patch or minor', () => {
  for (const candidate of entries.filter(item => item.ecosystem !== 'github-actions')) {
    assert.match(candidate.block, /target-branch: development/, candidate.ecosystem);
    assert.match(candidate.block, /interval: monthly/, candidate.ecosystem);
    assert.match(candidate.block, /update-types: \[minor, patch\]/, candidate.ecosystem);
    assert.match(candidate.block, /- dependency-name: '\*'\n\s+update-types: \['version-update:semver-major'\]/,
      candidate.ecosystem);
  }
});

test('pinned Actions update monthly in one grouped pull request, like every other ecosystem', () => {
  const actions = entry('github-actions', '/');
  // Each Actions bump needs one reviewed commit to infra/security/actions-policy.json; monthly keeps that to one.
  assert.match(actions.block, /interval: monthly/);
  assert.match(actions.block, /target-branch: development/);
  assert.match(actions.block, /groups:\n\s+actions:\n\s+patterns: \['\*'\]/);
});

test('the Maven build image never proposes a JDK jump hidden in its tag', () => {
  // maven:3.9-eclipse-temurin-25 -> -26 reads as a patch update; the JDK is a planned upgrade.
  const images = entry('docker', '/backend').block;
  assert.match(images, /- dependency-name: 'maven'\n\s+update-types: \['version-update:semver-major', 'version-update:semver-minor', 'version-update:semver-patch'\]/);
  // The runtime image keeps its routine updates: only a JDK major (25 -> 26) is ignored there.
  assert.doesNotMatch(images, /dependency-name: 'eclipse-temurin'/);
  assert.match(images, /- dependency-name: '\*'\n\s+update-types: \['version-update:semver-major'\]/);
});

test('packages pinned by the Expo SDK never get a separate Dependabot update', () => {
  const mobile = entry('npm', '/frontend-mobile').block;
  for (const name of ['expo', 'expo-*', '@expo/*', 'react', 'react-dom', 'react-native', 'react-native-*',
    '@react-native/*', '@react-native-async-storage/*', '@react-native-community/*', '@react-navigation/*',
    '@shopify/flash-list', 'jest-expo', 'babel-preset-expo', 'typescript', '@types/react']) {
    assert.ok(mobile.includes(`- dependency-name: '${name}'`), name);
  }
});

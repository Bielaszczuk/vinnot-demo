import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

const project = fileURLToPath(new URL('../..', import.meta.url));

function config(environment) {
  const result = spawnSync(process.execPath, ['-e', `
    const {exp} = require('expo/config').getConfig(process.cwd());
    console.log(JSON.stringify({version:exp.version,plugins:exp.plugins}));
  `], { cwd: project, encoding: 'utf8', env: { ...process.env, EXPO_NO_DOTENV: '1', EXPO_ENV: environment,
    EAS_BUILD_PROFILE: environment, VINNOT_OTA_CHANNEL: environment,
    EXPO_PUBLIC_API_BASE_URL: environment === 'production' ? 'https://api.vinnot.com/api' : 'https://api-dev.vinnot.com/api' } });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

const newer = (version, than) => {
  const [a, b] = [version, than].map(value => value.split('.').map(Number));
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] > b[index];
  return false;
};

for (const environment of ['development', 'production']) {
  test(`${environment} build styles notifications with the brand icon, accent and channel`, () => {
    const plugin = config(environment).plugins.find(entry => Array.isArray(entry) && entry[0] === 'expo-notifications');
    assert.deepEqual(plugin?.[1], { icon: './assets/notification-icon.png', color: '#ab214c', defaultChannel: 'default' });
  });
}

test('an app that links expo-notifications never keeps the 0.1.2 runtime, so no OTA reaches binaries without it', () => {
  const dependencies = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).dependencies;
  assert.ok(dependencies['expo-notifications'], 'expo-notifications is a dependency');
  assert.ok(newer(config('production').version, '0.1.2'), 'the app version must be newer than 0.1.2');
});

test('the notification icon is a white silhouette on transparency', () => {
  const png = readFileSync(new URL('../../assets/notification-icon.png', import.meta.url));
  assert.equal(png.readUInt32BE(16), 96);
  assert.equal(png.readUInt32BE(20), 96);
  assert.equal(png[25], 6, 'RGBA');
});

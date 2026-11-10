import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

const project = fileURLToPath(new URL('../..', import.meta.url));
const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

function config(environment) {
  const result = spawnSync(process.execPath, ['-e', `
    const {exp} = require('expo/config').getConfig(process.cwd());
    console.log(JSON.stringify(exp));
  `], { cwd: project, encoding: 'utf8', env: { ...process.env, EXPO_NO_DOTENV: '1', EXPO_ENV: environment,
    EAS_BUILD_PROFILE: environment, VINNOT_OTA_CHANNEL: environment,
    EXPO_PUBLIC_API_BASE_URL: environment === 'production' ? 'https://api.vinnot.com/api' : 'https://api-dev.vinnot.com/api' } });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

for (const environment of ['development', 'production']) {
  test(`${environment}: the SDK 58 binary gets its own OTA runtime and the SDK's iOS floor`, () => {
    const exp = config(environment);
    assert.match(packageJson.dependencies.expo, /^[~^]58\./);
    // appVersion policy: every native change gets a new version, so older binaries (0.1.x on
    // SDK 54, 0.2.0 and 0.2.1 before later SDK 58 native patches) never receive these bundles.
    assert.equal(exp.version, '0.2.2');
    assert.deepEqual(exp.runtimeVersion, { policy: 'appVersion' });
    // The legacy architecture no longer exists, so the flag is gone rather than set.
    assert.equal(exp.newArchEnabled, undefined);
    const buildProperties = exp.plugins.find(entry => Array.isArray(entry) && entry[0] === 'expo-build-properties');
    assert.equal(buildProperties?.[1].ios.deploymentTarget, '16.4');
    // R8 stays off (SDK 54 behaviour) until a device-tested release proves the minified build.
    assert.equal(buildProperties?.[1].android.enableMinifyInReleaseBuilds, false);
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
for (const environment of ['development', 'production']) {
  test(`native ${environment} build associates public content and the download QR only`, () => {
    const result = spawnSync(process.execPath, ['-e', `
      const {exp} = require('expo/config').getConfig(process.cwd());
      console.log(JSON.stringify({version:exp.version,runtime:exp.runtimeVersion,ios:exp.ios.associatedDomains,android:exp.android.intentFilters}));
    `], { cwd: fileURLToPath(new URL('../..', import.meta.url)), encoding: 'utf8', env: { ...process.env,
      EXPO_NO_DOTENV: '1', EXPO_ENV: environment, EAS_BUILD_PROFILE: environment, VINNOT_OTA_CHANNEL: environment,
      EXPO_PUBLIC_API_BASE_URL: environment === 'production' ? 'https://api.vinnot.com/api' : 'https://api-dev.vinnot.com/api' } });
    assert.equal(result.status, 0, result.stderr);
    const config = JSON.parse(result.stdout);
    const host = environment === 'production' ? 'vinnot.com' : 'dev.vinnot.com';
    assert.equal(config.version, '0.2.2');
    assert.deepEqual(config.runtime, { policy: 'appVersion' });
    assert.deepEqual(config.ios, [`applinks:${host}`]);
    assert.deepEqual(config.android, [{ action: 'VIEW', autoVerify: true, category: ['BROWSABLE', 'DEFAULT'],
      data: [
        ...['/share', '/share/'].map(path => ({ scheme: 'https', host, path })),
        ...['wines', 'events', 'wine-routes'].map(kind => ({ scheme: 'https', host, pathPrefix: `/share/${kind}/` })),
      ] }]);
  });
}

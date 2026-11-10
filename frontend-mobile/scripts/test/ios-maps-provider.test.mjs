import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

const project = fileURLToPath(new URL('../..', import.meta.url));
const IOS_KEY = 'ios-maps-test-key';
const ANDROID_KEY = 'android-maps-test-key';

function config(environment) {
  const result = spawnSync(process.execPath, ['-e', `
    const {exp} = require('expo/config').getConfig(process.cwd());
    console.log(JSON.stringify(exp));
  `], { cwd: project, encoding: 'utf8', env: { ...process.env, EXPO_NO_DOTENV: '1', EXPO_ENV: environment,
    EAS_BUILD_PROFILE: environment, VINNOT_OTA_CHANNEL: environment,
    EXPO_PUBLIC_API_BASE_URL: environment === 'production' ? 'https://api.vinnot.com/api' : 'https://api-dev.vinnot.com/api',
    EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY: IOS_KEY, EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY: ANDROID_KEY } });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

for (const environment of ['development', 'production']) {
  test(`${environment}: iOS keeps Apple Maps and never links the removed react-native-google-maps pod`, () => {
    const exp = config(environment);
    // Expo's legacy ios.config.googleMapsApiKey adds `pod 'react-native-google-maps'`, which
    // react-native-maps 1.29 no longer ships, so pod install fails. iOS renders Apple Maps.
    assert.equal(exp.ios.config?.googleMapsApiKey, undefined);
    // The iOS key still reaches REST geocoding through extra.
    assert.equal(exp.extra.googleMapsIosApiKey, IOS_KEY);
    // Android keeps the native Google Maps SDK key.
    assert.equal(exp.android.config.googleMaps.apiKey, ANDROID_KEY);
  });
}

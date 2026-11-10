import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";

for (const [environment, flag, expected, simulator = false] of [
  ["production", "true", false],
  ["development", "true", true],
  ["development", "false", false],
  ["development", "true", true, true],
  ["development", "false", false, true],
]) {
  test(`Facebook native configuration follows ${environment}/${flag}/simulator=${simulator}`, () => {
    const result = spawnSync(process.execPath, ["-e", `
      const { getConfig } = require('expo/config');
      const { exp } = getConfig(process.cwd());
      console.log(JSON.stringify({
        enabled: exp.extra.facebookLoginEnabled,
        facebookPlugin: exp.plugins.some(p => (Array.isArray(p) ? p[0] : p) === 'react-native-fbsdk-next'),
        facebookExpoExcluded: exp.plugins.some(p => Array.isArray(p) && p[0] === './plugins/withIosExpoModuleExclusions.cjs' && p[1].modules.includes('react-native-fbsdk-next')),
        simulatorOcrExcluded: exp.plugins.some(p => Array.isArray(p) && p[0] === './plugins/withIosExpoModuleExclusions.cjs' && p[1].modules.includes('@infinitered/react-native-mlkit-text-recognition') && p[1].modules.includes('@infinitered/react-native-mlkit-core')),
        applePlugin: exp.plugins.includes('expo-apple-authentication'),
        cameraAndLocation: ['ACCESS_FINE_LOCATION', 'CAMERA'].every(p => exp.android.permissions.includes(p)),
        androidBlockedPermissions: exp.android.blockedPermissions ?? []
      }));
    `], { cwd: fileURLToPath(new URL("../..", import.meta.url)), encoding: "utf8",
      env: { ...process.env, EXPO_NO_DOTENV: "1", EXPO_ENV: environment,
        EAS_BUILD_PROFILE: environment, VINNOT_OTA_CHANNEL: environment,
        EXPO_PUBLIC_API_BASE_URL: environment === "production" ? "https://api.vinnot.com/api" : "https://api-dev.vinnot.com/api",
        EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED: flag, EXPO_PUBLIC_FACEBOOK_APP_ID: "fixture-id",
        VINNOT_IOS_SIMULATOR: simulator ? "1" : "0", FACEBOOK_CLIENT_TOKEN: "fixture-token" } });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { enabled: expected, facebookPlugin: expected, facebookExpoExcluded: !expected, simulatorOcrExcluded: simulator, applePlugin: true, cameraAndLocation: true,
      androidBlockedPermissions: environment === "production"
        ? ["android.permission.RECORD_AUDIO", "android.permission.SYSTEM_ALERT_WINDOW"] : [] });
  });
}

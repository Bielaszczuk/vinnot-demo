/* global process, URL */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const project = fileURLToPath(new URL("../../", import.meta.url));
const autolinking = fileURLToPath(new URL("../../node_modules/.bin/expo-modules-autolinking", import.meta.url));

function nativeDependencies(platform, overrides) {
  const env = { ...process.env };
  for (const key of ["EXPO_ENV", "EAS_BUILD_PROFILE", "VINNOT_OTA_CHANNEL",
    "EXPO_PUBLIC_API_BASE_URL", "EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED"]) delete env[key];
  const output = execFileSync(autolinking, ["react-native-config", "--platform", platform, "--json"], {
    cwd: project, env: { ...env, ...overrides }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(output).dependencies;
}

for (const platform of ["ios", "android"]) {
  for (const [name, env, facebookLinked] of [
    ["production profile", { EAS_BUILD_PROFILE: "production" }, false],
    ["production cannot opt Facebook back in", { EXPO_ENV: "production", EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED: "true" }, false],
    ["preview", { EAS_BUILD_PROFILE: "preview" }, true],
    ["preview with Facebook disabled", { EAS_BUILD_PROFILE: "preview", EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED: "false" }, false],
  ]) {
    test(`${platform} ${name} resolves actual native modules without removing Google or Maps`, () => {
      const dependencies = nativeDependencies(platform, env);
      const linked = name => Boolean(dependencies[name]?.platforms?.[platform]);
      assert.equal(linked("react-native-fbsdk-next"), facebookLinked);
      assert.equal(linked("@react-native-google-signin/google-signin"), true);
      assert.equal(linked("react-native-maps"), true);
    });
  }
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import { assertDisabledFacebookPodsAbsent } from "../native-ios-policy.mjs";

const require = createRequire(import.meta.url);
const { excludeExpoModules } = require("../../plugins/withIosExpoModuleExclusions.cjs");
const template = "target 'Vinnot' do\n  use_expo_modules!\n  config = use_native_modules!\nend\n";
const exclusions = ["react-native-fbsdk-next", "@infinitered/react-native-mlkit-core", "@infinitered/react-native-mlkit-text-recognition"];

test("generated Podfile excludes Facebook and simulator OCR together, idempotently", () => {
  const updated = excludeExpoModules(template, exclusions);
  assert.match(updated, /use_native_modules!/);
  for (const name of exclusions) assert.ok(updated.includes(`'${name}'`));
  assert.equal(excludeExpoModules(updated, exclusions), updated);
});

test("Podfile template drift cannot silently retain unwanted SDKs", () => {
  for (const podfile of ["", template + "use_expo_modules!\n", "use_expo_modules!({ :other => true })\n"]) {
    assert.throws(() => excludeExpoModules(podfile, exclusions));
  }
});

test("actual Expo autolinker excludes adapter while preserving Apple and camera", () => {
  const executable = fileURLToPath(new URL("../../node_modules/.bin/expo-modules-autolinking", import.meta.url));
  const cwd = fileURLToPath(new URL("../..", import.meta.url));
  const resolve = (args) => JSON.parse(execFileSync(executable, ["resolve", "--platform", "ios", "--json", ...args], { cwd, encoding: "utf8" }));
  const enabled = resolve([]).modules.map((module) => module.packageName);
  assert.ok(enabled.includes("react-native-fbsdk-next"), "regression fixture must detect the Expo adapter");
  const disabled = resolve(["--exclude", ...exclusions]).modules.map((module) => module.packageName);
  for (const name of exclusions) assert.ok(!disabled.includes(name));
  assert.ok(disabled.includes("expo-apple-authentication"));
  assert.ok(disabled.includes("expo-camera"));
});

test("preflight rejects CoreKit-only residue even without React Native Facebook pods", () => {
  for (const pod of ["ExpoAdapterFBSDKNext", "FBAEMKit", "FBSDKCoreKit", "FBSDKCoreKit_Basics", "FBSDKLoginKit"]) {
    assert.throws(() => assertDisabledFacebookPodsAbsent(`PODS:\n  - ${pod} (18.1.1)`, false));
    assert.doesNotThrow(() => assertDisabledFacebookPodsAbsent(`PODS:\n  - ${pod} (18.1.1)`, true));
  }
  assert.doesNotThrow(() => assertDisabledFacebookPodsAbsent("PODS:\n  - GoogleSignIn (9.0.0)", false));
});

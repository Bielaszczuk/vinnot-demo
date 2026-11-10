import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";

const require = createRequire(import.meta.url);
const { qualifyMlkitText, patchInstalledPackage } = require("../../plugins/withIosMlkitTextQualifier.cjs");
const project = fileURLToPath(new URL("../..", import.meta.url));
const packageDir = join(project, "node_modules/@infinitered/react-native-mlkit-text-recognition");
const installed = readFileSync(join(packageDir, "ios/RNMLKitTextRecord.swift"), "utf8");

test("the installed ML Kit source gets its Text parameter qualified, idempotently", () => {
  const patched = qualifyMlkitText(installed);
  assert.match(patched, /func mapTextToRecord\(_ text: MLKitTextRecognition\.Text\) -> TextRecord \{/);
  assert.doesNotMatch(patched, /\(_ text: Text\)/);
  assert.equal(qualifyMlkitText(patched), patched);
});

test("source drift fails instead of shipping an unpatched module", () => {
  for (const source of ["", "func other() {}\n"]) assert.throws(() => qualifyMlkitText(source));
});

test("a different package version must be reviewed before the patch applies", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mlkit-qualifier-"));
  try {
    const target = join(dir, "node_modules/@infinitered/react-native-mlkit-text-recognition");
    mkdirSync(join(target, "ios"), { recursive: true });
    cpSync(join(packageDir, "ios/RNMLKitTextRecord.swift"), join(target, "ios/RNMLKitTextRecord.swift"));
    writeFileSync(join(target, "package.json"), JSON.stringify({ name: "@infinitered/react-native-mlkit-text-recognition", version: "5.0.2" }));
    await assert.rejects(patchInstalledPackage(dir), /Review withIosMlkitTextQualifier/);
    writeFileSync(join(target, "package.json"), JSON.stringify({ name: "@infinitered/react-native-mlkit-text-recognition", version: "5.0.1" }));
    await patchInstalledPackage(dir);
    assert.match(readFileSync(join(target, "ios/RNMLKitTextRecord.swift"), "utf8"), /MLKitTextRecognition\.Text/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function plugins(simulator) {
  const result = spawnSync(process.execPath, ["-e", `
    const {exp} = require('expo/config').getConfig(process.cwd());
    console.log(JSON.stringify(exp.plugins));
  `], { cwd: project, encoding: "utf8", env: { ...process.env, EXPO_NO_DOTENV: "1", EXPO_ENV: "production",
    EAS_BUILD_PROFILE: "production", VINNOT_OTA_CHANNEL: "production", VINNOT_IOS_SIMULATOR: simulator ? "1" : "0",
    EXPO_PUBLIC_API_BASE_URL: "https://api.vinnot.com/api" } });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).map((entry) => (Array.isArray(entry) ? entry[0] : entry));
}

test("device builds run the qualifier; simulator builds exclude the OCR module instead", () => {
  assert.ok(plugins(false).includes("./plugins/withIosMlkitTextQualifier.cjs"));
  assert.ok(!plugins(true).includes("./plugins/withIosMlkitTextQualifier.cjs"));
});

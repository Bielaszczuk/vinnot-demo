/* global module, require */
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs/promises");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

const PACKAGE = "@infinitered/react-native-mlkit-text-recognition";
const VERSION = "5.0.1";
const FILE = "ios/RNMLKitTextRecord.swift";
const BEFORE = "func mapTextToRecord(_ text: Text) -> TextRecord {";
const AFTER = "func mapTextToRecord(_ text: MLKitTextRecognition.Text) -> TextRecord {";

/**
 * SDK 58's ExpoModulesCore makes SwiftUI.Text visible next to ML Kit's Text, so the
 * unqualified parameter type no longer compiles ("'Text' is ambiguous"). Qualify the
 * one use; fail on any other source so an upgrade is reviewed instead of skipped.
 */
function qualifyMlkitText(source) {
  if (source.includes(AFTER) && !source.includes(BEFORE)) return source;
  if (source.split(BEFORE).length !== 2) {
    throw new Error(`Expected one unqualified ML Kit Text parameter in ${PACKAGE}/${FILE}`);
  }
  return source.replace(BEFORE, AFTER);
}

async function patchInstalledPackage(projectRoot) {
  const manifest = require.resolve(`${PACKAGE}/package.json`, { paths: [projectRoot] });
  const { version } = JSON.parse(await fs.readFile(manifest, "utf8"));
  if (version !== VERSION) {
    throw new Error(`Review withIosMlkitTextQualifier after updating ${PACKAGE} to ${version}`);
  }
  const target = path.join(path.dirname(manifest), FILE);
  const source = await fs.readFile(target, "utf8");
  const patched = qualifyMlkitText(source);
  if (patched !== source) await fs.writeFile(target, patched);
}

// Device builds only: simulator builds exclude the OCR module, so there is nothing to patch.
module.exports = function withIosMlkitTextQualifier(config) {
  return withDangerousMod(config, ["ios", async (modConfig) => {
    await patchInstalledPackage(modConfig.modRequest.projectRoot);
    return modConfig;
  }]);
};
module.exports.qualifyMlkitText = qualifyMlkitText;
module.exports.patchInstalledPackage = patchInstalledPackage;

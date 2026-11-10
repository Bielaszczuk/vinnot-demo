/* global module, require */
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs/promises");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

/** Only modify Expo's generated, argument-free call; fail on template drift. */
function excludeExpoModules(podfile, modules) {
  if (!modules.length || modules.some((name) => !/^[@a-zA-Z0-9_/-]+$/.test(name))) {
    throw new Error("Expected non-empty Expo module package names");
  }
  const names = [...new Set(modules)].sort();
  const replacement = `use_expo_modules!({ :exclude => [${names.map((name) => `'${name}'`).join(", ")}] })`;
  const calls = podfile.match(/^\s*use_expo_modules!.*$/gm) ?? [];
  if (calls.length !== 1) {
    throw new Error("Expected one generated use_expo_modules! call in the iOS Podfile");
  }
  if (calls[0].trim() === replacement) return podfile;
  if (calls[0].trim() !== "use_expo_modules!") {
    throw new Error("Unsupported use_expo_modules! arguments in the iOS Podfile");
  }
  return podfile.replace(/^(\s*)use_expo_modules!\s*$/m, `$1${replacement}`);
}

// Combine all exclusions in one mod: simulator-only OCR and disabled Facebook
// use the same Expo autolinker, separately from React Native autolinking.
module.exports = function withIosExpoModuleExclusions(config, { modules }) {
  return withDangerousMod(config, ["ios", async (modConfig) => {
    const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, "Podfile");
    const podfile = await fs.readFile(podfilePath, "utf8");
    await fs.writeFile(podfilePath, excludeExpoModules(podfile, modules));
    return modConfig;
  }]);
};
module.exports.excludeExpoModules = excludeExpoModules;

/* global process */

import {
  closeSync,
  cpSync,
  existsSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { assertDisabledFacebookPodsAbsent } from "./native-ios-policy.mjs";

const require = createRequire(import.meta.url);
const { resolveMobileEnvironment } = require("../config/mobile-environment-policy.cjs");
const { environment } = resolveMobileEnvironment({
  environment: process.env.EXPO_ENV,
  profile: process.env.EAS_BUILD_PROFILE,
  channel: process.env.VINNOT_OTA_CHANNEL,
  apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
});
const facebookEnabled = environment !== "production"
  && process.env.EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED !== "false";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const nodeModulesDirectory = join(projectDirectory, "node_modules");
const temporaryRoot = mkdtempSync(join(tmpdir(), "vinnot-ios-preflight-"));
const temporaryProject = join(temporaryRoot, "project");
const excludedDirectories = new Set([
  "node_modules",
  "ios",
  ".expo",
  "coverage",
  "dist",
]);

function run(command, args, cwd, environment = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...environment },
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function runWithFailureLog(command, args, cwd, logFile) {
  const output = openSync(logFile, "w");
  let result;
  try {
    result = spawnSync(command, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", output, output],
    });
  } finally {
    closeSync(output);
  }

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const lines = readFileSync(logFile, "utf8").trimEnd().split("\n");
    process.stderr.write(`${lines.slice(-120).join("\n")}\n`);
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function shouldCopy(source) {
  const relativePath = source.slice(projectDirectory.length + 1);
  const firstSegment = relativePath.split("/")[0];
  return !excludedDirectories.has(firstSegment);
}

function findWorkspace(iosDirectory) {
  const workspace = readdirSync(iosDirectory).find((entry) =>
    entry.endsWith(".xcworkspace"),
  );
  if (!workspace) {
    throw new Error("Expo prebuild did not generate an iOS workspace");
  }
  return workspace;
}

if (process.platform !== "darwin") {
  throw new Error("The native iOS preflight requires macOS and Xcode");
}
if (!existsSync(nodeModulesDirectory)) {
  throw new Error("Run npm ci before the native iOS preflight");
}

try {
  cpSync(projectDirectory, temporaryProject, {
    recursive: true,
    filter: shouldCopy,
  });
  symlinkSync(nodeModulesDirectory, join(temporaryProject, "node_modules"), "dir");

  const expoExecutable = join(nodeModulesDirectory, ".bin", "expo");
  run(
    expoExecutable,
    ["prebuild", "--platform", "ios", "--clean", "--no-install"],
    temporaryProject,
  );

  const iosDirectory = join(temporaryProject, "ios");
  run("pod", ["install", "--repo-update"], iosDirectory);
  assertDisabledFacebookPodsAbsent(
    readFileSync(join(iosDirectory, "Podfile.lock"), "utf8"), facebookEnabled,
  );
  process.stdout.write("Native iOS dependency policy verified.\n");

  const workspace = findWorkspace(iosDirectory);
  const scheme = basename(workspace, ".xcworkspace");
  runWithFailureLog(
    "xcodebuild",
    [
      "-workspace",
      workspace,
      "-scheme",
      scheme,
      "-configuration",
      "Debug",
      "-sdk",
      "iphoneos",
      "-derivedDataPath",
      join(temporaryRoot, "derived-data"),
      "CODE_SIGNING_ALLOWED=NO",
      "build",
    ],
    iosDirectory,
    join(temporaryRoot, "xcodebuild.log"),
  );
  process.stdout.write("Native iOS compilation succeeded.\n");
} finally {
  if (process.env.VINNOT_KEEP_NATIVE_PREFLIGHT !== "1") {
    rmSync(temporaryRoot, { recursive: true, force: true });
  } else {
    process.stdout.write(`Native preflight files kept at ${temporaryRoot}\n`);
  }
}

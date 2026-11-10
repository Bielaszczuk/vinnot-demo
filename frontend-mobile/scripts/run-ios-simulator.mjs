/* global console, process */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const iosRoot = path.join(projectRoot, "ios");
const derivedDataPath = path.join(iosRoot, "build");
const simulatorEnvironment = {
  ...process.env,
  VINNOT_IOS_SIMULATOR: "1",
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: simulatorEnvironment,
    stdio: "inherit",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}.`);
  }
}

function getBootedSimulatorId() {
  const output = execFileSync(
    "xcrun",
    ["simctl", "list", "devices", "booted", "--json"],
    { encoding: "utf8" },
  );
  const simulatorCatalog = JSON.parse(output);
  const bootedSimulator = Object.values(simulatorCatalog.devices)
    .flat()
    .find((device) => device.state === "Booted" && device.isAvailable !== false);

  if (!bootedSimulator) {
    throw new Error(
      "No booted iOS Simulator was found. Open Simulator and boot an iPhone first.",
    );
  }
  return bootedSimulator.udid;
}

function getNativeProject() {
  const workspaceName = readdirSync(iosRoot).find(
    (entry) => entry.endsWith(".xcworkspace") && entry !== "Pods.xcworkspace",
  );
  if (!workspaceName) {
    throw new Error("The generated iOS workspace was not found.");
  }

  return {
    workspacePath: path.join(iosRoot, workspaceName),
    scheme: workspaceName.slice(0, -".xcworkspace".length),
  };
}

function readBundleIdentifier(appPath) {
  return execFileSync(
    "plutil",
    ["-extract", "CFBundleIdentifier", "raw", path.join(appPath, "Info.plist")],
    { encoding: "utf8" },
  ).trim();
}

const simulatorId = getBootedSimulatorId();

run("npx", ["expo", "prebuild", "--platform", "ios"]);

const { workspacePath, scheme } = getNativeProject();
run("xcodebuild", [
  "-workspace",
  workspacePath,
  "-scheme",
  scheme,
  "-configuration",
  "Debug",
  "-destination",
  `platform=iOS Simulator,id=${simulatorId}`,
  "-derivedDataPath",
  derivedDataPath,
  "build",
  "-quiet",
]);

const appPath = path.join(
  derivedDataPath,
  "Build",
  "Products",
  "Debug-iphonesimulator",
  `${scheme}.app`,
);
if (!existsSync(appPath)) {
  throw new Error(`The simulator app was not generated at ${appPath}.`);
}

const bundleIdentifier = readBundleIdentifier(appPath);
run("xcrun", ["simctl", "install", simulatorId, appPath]);
run("xcrun", ["simctl", "launch", simulatorId, bundleIdentifier]);

console.log(`Installed ${scheme} on simulator ${simulatorId}.`);

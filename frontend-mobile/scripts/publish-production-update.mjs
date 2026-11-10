/* global console, process, fetch, URL, AbortSignal */
import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  assertNoUndeployedBackendChanges, assertReleaseApiRevision, assertReleaseApiUrl, releaseApiVersionUrl,
  undeployedChangesDiffArgs,
} from "../config/release-api-policy.cjs";

const { values } = parseArgs({
  options: {
    message: { type: "string" },
    "api-revision": { type: "string" },
    platform: { type: "string", default: "all" },
    "dry-run": { type: "boolean", default: false },
  },
});
if (!values.message?.trim()) throw new Error("Provide --message with the update purpose.");
const apiRevision = values["api-revision"] ?? "";
if (!/^[0-9a-f]{40}$/.test(apiRevision)) {
  throw new Error("Provide --api-revision with the full commit the production API reports in /api/version.");
}
if (!["ios", "android", "all"].includes(values.platform)) throw new Error("Invalid --platform.");

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const git = (...args) => execFileSync("git", args, { cwd: projectRoot, encoding: "utf8" }).trim();

// The OTA bundles the working tree, so it must be a clean commit that is already on main.
git("fetch", "--quiet", "origin", "main");
if (git("status", "--porcelain", "--", ".")) {
  throw new Error("Commit or discard local mobile changes first; an OTA bundles the working tree.");
}
if (spawnSync("git", ["merge-base", "--is-ancestor", "HEAD", "origin/main"], { cwd: projectRoot }).status !== 0) {
  throw new Error("Production OTAs publish only commits that are already on main.");
}
assertNoUndeployedBackendChanges(git(...undeployedChangesDiffArgs(apiRevision)).split("\n").filter(Boolean));

const { build } = JSON.parse(readFileSync(new URL("../eas.json", import.meta.url), "utf8"));
const profile = build.production;
const apiUrl = profile.env.EXPO_PUBLIC_API_BASE_URL;
assertReleaseApiUrl(apiUrl, { publishing: true });
if (profile.channel !== "production" || profile.environment !== "production") {
  throw new Error("Production publication requires the production channel and EAS environment.");
}

// Production catalog routes need a session; /version is public and names the live commit.
const version = await fetch(releaseApiVersionUrl(apiUrl), { signal: AbortSignal.timeout(15000) });
assertReleaseApiRevision(version.status, await version.json().catch(() => null), apiRevision);

const head = git("rev-parse", "HEAD");
console.log(`Production API runs ${apiRevision}; app commit ${head} is on main.`);
if (values["dry-run"]) {
  console.log("Dry run: all checks passed, nothing was published.");
  process.exit(0);
}
console.log(`Publishing ${values.platform} OTA to production using ${apiUrl}; no native build.`);
const result = spawnSync("npx", [
  "--yes", "eas-cli@25.3.0", "update", "--channel", "production", "--environment", "production",
  "--platform", values.platform, "--message", values.message, "--clear-cache", "--non-interactive",
], {
  cwd: projectRoot,
  stdio: "inherit",
  env: { ...process.env, ...profile.env, EXPO_NO_DOTENV: "1", VINNOT_OTA_CHANNEL: "production" },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

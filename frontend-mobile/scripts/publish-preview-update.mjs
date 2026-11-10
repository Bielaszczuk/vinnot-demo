/* global console, process, fetch, URL, AbortSignal */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { assertReleaseApiHealthy, assertReleaseApiUrl, releaseApiHealthUrl } from "../config/release-api-policy.cjs";

const { values } = parseArgs({
  options: { message: { type: "string" }, platform: { type: "string", default: "ios" } },
});
if (!values.message?.trim()) throw new Error("Provide --message with the update purpose.");
if (!["ios", "android", "all"].includes(values.platform)) throw new Error("Invalid --platform.");

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const { build } = JSON.parse(readFileSync(new URL("../eas.json", import.meta.url), "utf8"));
const profile = build.preview;
const apiUrl = profile.env.EXPO_PUBLIC_API_BASE_URL;
assertReleaseApiUrl(apiUrl, { publishing: true });
if (profile.channel !== "preview" || profile.environment !== "preview") {
  throw new Error("Preview publication requires the preview channel and EAS environment.");
}

const health = await fetch(releaseApiHealthUrl(apiUrl), { signal: AbortSignal.timeout(15000) });
assertReleaseApiHealthy(health.status, await health.json().catch(() => null));
console.log(`Publishing ${values.platform} OTA to preview using ${apiUrl}; no native build.`);
const result = spawnSync("npx", [
  "--yes", "eas-cli@25.3.0", "update", "--channel", "preview", "--environment", "preview",
  "--platform", values.platform, "--message", values.message, "--clear-cache", "--non-interactive",
], {
  cwd: projectRoot,
  stdio: "inherit",
  env: { ...process.env, ...profile.env, EXPO_NO_DOTENV: "1", VINNOT_OTA_CHANNEL: "preview" },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

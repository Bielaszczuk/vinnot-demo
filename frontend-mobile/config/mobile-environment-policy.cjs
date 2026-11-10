/* global module, require */
/* eslint-disable @typescript-eslint/no-require-imports -- Expo loads this build-time policy as CommonJS. */
const { build: profiles } = require("../eas.json");
const { assertReleaseApiUrl } = require("./release-api-policy.cjs");

const environments = ["development", "staging", "production"];
const productionApi = "https://api.vinnot.com/api";

function buildProfile(name) {
  const visited = new Set();
  function resolve(current) {
    if (!Object.hasOwn(profiles, current) || visited.has(current)) {
      throw new Error("Unknown or cyclic EAS build profile.");
    }
    visited.add(current);
    const profile = profiles[current];
    const parent = profile.extends ? resolve(profile.extends) : {};
    return { ...parent, ...profile, env: { ...parent.env, ...profile.env } };
  }
  return resolve(name);
}

/** Resolve at the build boundary; no runtime fallback can change environment. */
function resolveMobileEnvironment({ environment, profile, channel, apiUrl, publishing = false } = {}) {
  const selectedBuild = profile === undefined ? undefined : buildProfile(profile);
  const selectedChannel = channel === undefined ? undefined
    : Object.values(profiles).find(candidate => candidate.channel === channel);
  if (channel !== undefined && !selectedChannel) {
    throw new Error("Unknown EAS update channel.");
  }
  if (selectedBuild && selectedChannel && selectedBuild.channel !== channel) {
    throw new Error("EAS build profile and update channel do not match.");
  }
  const selected = selectedBuild ?? selectedChannel;
  const resolved = environment ?? selected?.env?.EXPO_ENV ?? "development";
  if (!environments.includes(resolved)) {
    throw new Error("EXPO_ENV must be development, staging or production.");
  }
  if (selected && resolved !== selected.env.EXPO_ENV) {
    throw new Error("EXPO_ENV does not match the selected EAS build profile or update channel.");
  }
  // Staging has no provisioned default destination: it requires an explicit URL.
  const expectedUrl = resolved === "production" ? productionApi
    : selected?.env?.EXPO_PUBLIC_API_BASE_URL;
  const resolvedApi = apiUrl ?? expectedUrl
    ?? (resolved === "development" ? "http://localhost:8080/api" : undefined);
  if (!resolvedApi) {
    throw new Error("This environment requires EXPO_PUBLIC_API_BASE_URL.");
  }
  assertReleaseApiUrl(resolvedApi, {
    publishing: publishing || Boolean(selected) || resolved !== "development",
    expectedUrl,
  });
  return { environment: resolved, apiBaseUrl: resolvedApi };
}

/** EAS project and OTA endpoint are part of the environment boundary. */
function resolveMobileProjectId(environment, explicitId) {
  const production = profiles.production.env.EAS_PROJECT_ID;
  const development = profiles.development.env.EAS_PROJECT_ID;
  if (!environments.includes(environment)) throw new Error("Unknown mobile environment.");
  const expected = environment === "production" ? production
    : environment === "development" ? development : undefined;
  const selected = explicitId ?? expected;
  if (!selected || (expected && selected !== expected)
      || (environment === "staging" && [production, development].includes(selected))) {
    throw new Error("EAS project does not match the mobile environment.");
  }
  return selected;
}

module.exports = { resolveMobileEnvironment, resolveMobileProjectId };

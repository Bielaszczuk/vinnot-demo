/* global module, URL */

/** Build/export boundary: local HTTP remains available only for Metro development. */
function assertReleaseApiUrl(value, { publishing = false, expectedUrl } = {}) {
  if (!publishing) return;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Published mobile apps require a valid EXPO_PUBLIC_API_BASE_URL.");
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const localHost = !host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":")
    || /\.(localhost|local|internal|test|invalid)$/.test(host);
  if (url.protocol !== "https:" || localHost || url.username || url.password
      || url.search || url.hash || url.pathname !== "/api") {
    throw new Error("Refusing mobile publication: API must be a public HTTPS domain ending in /api, without credentials, query or fragment.");
  }
  if (expectedUrl && value !== expectedUrl) {
    throw new Error("Refusing mobile publication: API URL does not match the selected EAS channel.");
  }
}

/** Public health endpoint of a release API; catalog routes need a session, so they cannot prove reachability. */
function releaseApiHealthUrl(apiUrl) {
  return `${apiUrl}/actuator/health`;
}

/** The API answered its health check with HTTP 200 and status UP. */
function assertReleaseApiHealthy(status, body) {
  if (status !== 200 || body?.status !== "UP") {
    throw new Error(`Release API health check failed: HTTP ${status}, status ${body?.status ?? "unknown"}.`);
  }
}

/** Public endpoint that names the commit a release API runs. */
function releaseApiVersionUrl(apiUrl) {
  return `${apiUrl}/version`;
}

/** The API answered /version with HTTP 200 and runs exactly the expected commit. */
function assertReleaseApiRevision(status, body, expectedRevision) {
  if (status !== 200 || body?.revision !== expectedRevision) {
    throw new Error(
      `Release API check failed: HTTP ${status}, it runs ${body?.revision ?? "unknown"}, not ${expectedRevision}.`,
    );
  }
}

/**
 * Git diff arguments that list the files HEAD changed since it split from the live API revision.
 * Diffing from the merge-base skips commits the API already runs, even ones newer than HEAD.
 */
function undeployedChangesDiffArgs(apiRevision) {
  return ["diff", "--name-only", `${apiRevision}...HEAD`];
}

/** An OTA only ships app code, so it must not rely on backend changes the live API lacks. */
function assertNoUndeployedBackendChanges(changedPaths) {
  const backend = changedPaths.filter((path) => path.startsWith("backend/"));
  if (backend.length > 0) {
    throw new Error(
      `Refusing OTA: backend files changed since the live API revision and are not deployed: ${backend.join(", ")}.`,
    );
  }
}

module.exports = {
  assertReleaseApiUrl,
  releaseApiHealthUrl,
  assertReleaseApiHealthy,
  releaseApiVersionUrl,
  assertReleaseApiRevision,
  undeployedChangesDiffArgs,
  assertNoUndeployedBackendChanges,
};

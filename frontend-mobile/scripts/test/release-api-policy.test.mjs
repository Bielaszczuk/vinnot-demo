import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  assertNoUndeployedBackendChanges, assertReleaseApiHealthy, assertReleaseApiRevision, assertReleaseApiUrl,
  releaseApiHealthUrl, releaseApiVersionUrl, undeployedChangesDiffArgs,
} from "../../config/release-api-policy.cjs";

test("Metro may use a local HTTP backend", () => {
  assert.doesNotThrow(() => assertReleaseApiUrl("http://localhost:8080/api"));
});

test("release allows a public HTTPS API matching the chosen channel", () => {
  const value = "https://api-dev.vinnot.com/api";
  assert.doesNotThrow(() => assertReleaseApiUrl(value, { publishing: true, expectedUrl: value }));
});

for (const url of [
  "", "not a url", "http://api-dev.vinnot.com/api", "http://localhost:8080/api",
  "https://localhost/api", "https://LOCALHOST/api", "https://127.0.0.1/api", "https://[::1]/api",
  "https://localhost./api", "https://api.local./api", "https://0x7f000001/api",
  "https://192.168.1.5/api", "https://10.0.2.2/api", "https://cbielaszczuk.local/api",
  "https://api.localhost/api", "https://api.internal/api", "https://api.test/api",
  "https://api.invalid/api", "https://user:pass@api.vinnot.com/api",
  "https://api.vinnot.com/", "https://api.vinnot.com/api?key=secret", "https://api.vinnot.com/api#fragment",
]) {
  test(`release rejects ${url || "missing URL"}`, () => {
    assert.throws(() => assertReleaseApiUrl(url, { publishing: true }));
  });
}

test("a remote EAS environment cannot silently target a different API", () => {
  assert.throws(() => assertReleaseApiUrl("https://api.vinnot.com/api", {
    publishing: true, expectedUrl: "https://api-dev.vinnot.com/api",
  }), /selected EAS channel/);
});

test("the publication preflight reads the public health endpoint, not a session-only route", () => {
  assert.equal(releaseApiHealthUrl("https://api-dev.vinnot.com/api"), "https://api-dev.vinnot.com/api/actuator/health");
  assert.doesNotThrow(() => assertReleaseApiHealthy(200, { status: "UP" }));
  assert.throws(() => assertReleaseApiHealthy(200, { status: "DOWN" }), /status DOWN/);
  assert.throws(() => assertReleaseApiHealthy(401, null), /HTTP 401/);
  assert.throws(() => assertReleaseApiHealthy(200, null), /status unknown/);
});

const liveRevision = "0f86fcc61bc3f96d5cb45720f0a7691c874a95a8";

test("a production OTA reads the public version endpoint and requires the expected live revision", () => {
  assert.equal(releaseApiVersionUrl("https://api.vinnot.com/api"), "https://api.vinnot.com/api/version");
  assert.doesNotThrow(() => assertReleaseApiRevision(200, { revision: liveRevision }, liveRevision));
  assert.throws(() => assertReleaseApiRevision(200, { revision: "cc0da7351ac091678542c52310bb58b5237a0e79" }, liveRevision),
    /runs cc0da7351ac091678542c52310bb58b5237a0e79, not 0f86fcc61bc3f96d5cb45720f0a7691c874a95a8/);
  assert.throws(() => assertReleaseApiRevision(503, null, liveRevision), /HTTP 503/);
  assert.throws(() => assertReleaseApiRevision(200, {}, liveRevision), /runs unknown/);
});

test("a production OTA refuses backend changes the live API does not run yet", () => {
  assert.doesNotThrow(() => assertNoUndeployedBackendChanges([
    "frontend-mobile/src/presentation/components/ui/BottomSheet.tsx", "docs/en/index.md", "frontend-react/src/main.tsx",
  ]));
  assert.doesNotThrow(() => assertNoUndeployedBackendChanges([]));
  assert.throws(() => assertNoUndeployedBackendChanges([
    "frontend-mobile/app/_layout.tsx", "backend/src/main/java/App.java", "backend/pom.xml",
  ]), /backend\/src\/main\/java\/App\.java, backend\/pom\.xml/);
});

/** Scratch repository with isolated identity and hooks, so the user's git config cannot interfere. */
function scratchRepository(t) {
  const root = mkdtempSync(join(tmpdir(), "vinnot-ota-guard-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", [
    "-c", "user.name=Release Test", "-c", "user.email=release@test.invalid",
    "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args,
  ], { cwd: root, encoding: "utf8" }).trim();
  const commit = (path, message) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), `${message}\n`);
    git("add", "--all");
    git("commit", "--quiet", "-m", message);
    return git("rev-parse", "HEAD");
  };
  git("init", "--quiet", "-b", "main");
  return { git, commit };
}

const undeployedPaths = (git, apiRevision) =>
  git(...undeployedChangesDiffArgs(apiRevision)).split("\n").filter(Boolean);

test("an OTA may ship an app commit the live API already contains, even when the API is newer", (t) => {
  const { git, commit } = scratchRepository(t);
  commit("frontend-mobile/app.tsx", "base");
  const appCommit = commit("frontend-mobile/screen.tsx", "app change");
  const liveApi = commit("backend/src/main/java/App.java", "backend refactor already deployed");
  git("checkout", "--quiet", appCommit);

  assert.deepEqual(undeployedPaths(git, liveApi), []);
  assert.doesNotThrow(() => assertNoUndeployedBackendChanges(undeployedPaths(git, liveApi)));
});

test("an OTA still refuses backend changes the app commit has and the live API lacks", (t) => {
  const { commit, git } = scratchRepository(t);
  const liveApi = commit("frontend-mobile/app.tsx", "base");
  commit("backend/src/main/java/App.java", "backend change not deployed");
  commit("frontend-mobile/screen.tsx", "app change");

  assert.deepEqual(undeployedPaths(git, liveApi), ["backend/src/main/java/App.java", "frontend-mobile/screen.tsx"]);
  assert.throws(() => assertNoUndeployedBackendChanges(undeployedPaths(git, liveApi)),
    /backend\/src\/main\/java\/App\.java/);
});

test("an OTA refuses backend changes from a branch that diverged from the live API", (t) => {
  const { commit, git } = scratchRepository(t);
  const base = commit("frontend-mobile/app.tsx", "base");
  const liveApi = commit("backend/src/main/java/Live.java", "live-only backend change");
  git("checkout", "--quiet", "-b", "app", base);
  commit("backend/src/main/java/Pending.java", "app-side backend change");

  assert.deepEqual(undeployedPaths(git, liveApi), ["backend/src/main/java/Pending.java"]);
});

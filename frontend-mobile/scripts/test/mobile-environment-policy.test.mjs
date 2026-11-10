import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveMobileEnvironment, resolveMobileProjectId } from "../../config/mobile-environment-policy.cjs";

test("local Metro keeps its development default and explicit LAN override", () => {
  assert.deepEqual(resolveMobileEnvironment(), {
    environment: "development", apiBaseUrl: "http://localhost:8080/api",
  });
  assert.equal(resolveMobileEnvironment({ apiUrl: "http://192.168.0.2:8080/api" }).apiBaseUrl,
    "http://192.168.0.2:8080/api");
});

for (const profile of ["development", "preview", "ios-simulator", "production"]) {
  test(`${profile} resolves its inherited environment and exact destination`, () => {
    assert.deepEqual(resolveMobileEnvironment({ profile }), {
      environment: profile === "production" ? "production" : "development",
      apiBaseUrl: profile === "production" ? "https://api.vinnot.com/api" : "https://api-dev.vinnot.com/api",
    });
  });
}

for (const channel of ["development", "preview", "production"]) {
  test(`${channel} OTA uses the same contract as its EAS build`, () => {
    assert.deepEqual(resolveMobileEnvironment({ channel }), resolveMobileEnvironment({ profile: channel }));
    assert.deepEqual(resolveMobileEnvironment({ channel, profile: channel }), resolveMobileEnvironment({ channel }));
  });
}

test("production is guarded even during config inspection without NODE_ENV", () => {
  assert.equal(resolveMobileEnvironment({ environment: "production" }).apiBaseUrl, "https://api.vinnot.com/api");
  for (const apiUrl of ["https://api.vinnot.app/api", "https://api-dev.vinnot.com/api", "http://localhost:8080/api"]) {
    assert.throws(() => resolveMobileEnvironment({ environment: "production", apiUrl }));
  }
});

test("unprovisioned staging has no invented domain or local fallback", () => {
  assert.throws(() => resolveMobileEnvironment({ environment: "staging" }), /requires/);
  assert.equal(resolveMobileEnvironment({ environment: "staging", apiUrl: "https://staging.example.org/api" }).environment, "staging");
  assert.throws(() => resolveMobileEnvironment({ environment: "staging", apiUrl: "http://localhost:8080/api" }));
});

for (const options of [
  { environment: "prod" }, { environment: "" }, { profile: "unknown" }, { profile: "toString" },
  { channel: "unknown" }, { channel: "" },
  { profile: "production", environment: "development" },
  { channel: "preview", environment: "production" },
  { profile: "production", channel: "preview" },
  { profile: "preview", apiUrl: "https://api.vinnot.com/api" },
  { channel: "production", apiUrl: "https://api-dev.vinnot.com/api" },
  { publishing: true },
]) {
  test(`rejects ambiguous or cross-environment publication: ${JSON.stringify(options)}`, () => {
    assert.throws(() => resolveMobileEnvironment(options));
  });
}

test("public release without a named profile preserves explicit development destination", () => {
  assert.equal(resolveMobileEnvironment({ publishing: true, apiUrl: "https://api-dev.vinnot.com/api" }).environment, "development");
});

test("production and development resolve independent EAS projects and reject crossed overrides", () => {
  const prod = resolveMobileProjectId('production');
  const dev = resolveMobileProjectId('development');
  assert.notEqual(prod, dev);
  assert.equal(prod, '63ad50dd-2111-4c64-9150-ddbb9cb76d06');
  assert.equal(dev, 'a66f49b9-eadc-4597-921f-df58219bcc37');
  assert.equal(resolveMobileProjectId('production', prod), prod);
  assert.equal(resolveMobileProjectId('development', dev), dev);
  for (const [environment, id] of [['production', dev], ['development', prod], ['production', ''], ['unknown', prod], ['staging', prod], ['staging', dev], ['staging', undefined]]) {
    assert.throws(() => resolveMobileProjectId(environment, id));
  }
  assert.equal(resolveMobileProjectId('staging', 'separate-staging-project'), 'separate-staging-project');
});

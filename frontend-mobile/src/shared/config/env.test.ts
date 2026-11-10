import { resolveApiBaseUrl, resolveGoogleMapsApiKey } from "./env";

describe("Google Maps platform isolation", () => {
  it.each([
    ["ios", true, "ios-key"], ["android", true, "android-key"],
    ["web", true, null], ["web", false, "legacy-key"],
  ])("selects %s production=%s without crossing platforms", (platform, production, expected) => {
    expect(resolveGoogleMapsApiKey(platform as string, production as boolean, {
      ios: " ios-key ", android: "android-key", legacy: "legacy-key",
    })).toBe(expected);
  });

  it.each(["ios", "android", "web"])("never inherits the shared development key in production (%s)", platform => {
    expect(resolveGoogleMapsApiKey(platform, true, { legacy: "dev-key" })).toBeNull();
    expect(resolveGoogleMapsApiKey(platform, false, { legacy: "dev-key" })).toBe("dev-key");
    expect(resolveGoogleMapsApiKey(platform, false, {})).toBeNull();
  });

  it("handles blank platform values without treating them as usable credentials", () => {
    expect(resolveGoogleMapsApiKey("ios", true, { ios: " ", legacy: "dev-key" })).toBeNull();
    expect(resolveGoogleMapsApiKey("ios", false, { ios: " ", legacy: "dev-key" })).toBe("dev-key");
  });
});

describe("resolveApiBaseUrl", () => {
  it("prefers the runtime app configuration over a statically loaded public value", () => {
    expect(
      resolveApiBaseUrl(
        "http://vinnot-device.local:8080/api",
        "http://localhost:8080/api",
      ),
    ).toBe("http://vinnot-device.local:8080/api");
  });

  it("falls back to the public value when runtime configuration is absent", () => {
    expect(resolveApiBaseUrl(undefined, "https://api.vinnot.app/api")).toBe(
      "https://api.vinnot.app/api",
    );
  });

  it("uses the local default when neither source is configured", () => {
    expect(resolveApiBaseUrl(undefined, undefined)).toBe("http://localhost:8080/api");
  });
});

describe("Facebook environment isolation", () => {
  const originalFlag = process.env.EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED;
  afterEach(() => {
    jest.dontMock("expo-constants");
    if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED;
    else process.env.EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED = originalFlag;
  });

  it.each([
    ["production", true, "true", false],
    ["development", true, "true", true],
    ["development", false, "true", false],
    ["development", true, "false", false],
    ["development", undefined, undefined, true],
  ])("resolves %s manifest=%s flag=%s as %s", (environment, manifestFlag, publicFlag, expected) => {
    if (publicFlag === undefined) delete process.env.EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED;
    else process.env.EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED = publicFlag;
    jest.isolateModules(() => {
      jest.doMock("expo-constants", () => ({ __esModule: true, default: {
        expoConfig: { name: "test", slug: "test",
          extra: { EXPO_ENV: environment, facebookLoginEnabled: manifestFlag } },
      } }));
      expect(jest.requireActual<typeof import("./env")>("./env").env.facebookLoginEnabled).toBe(expected);
    });
  });
});


describe("Event payment presentation flag", () => {
  const originalEnabled = process.env.EXPO_PUBLIC_EVENT_PAYMENTS_ENABLED;
  const originalSandbox = process.env.EXPO_PUBLIC_EVENT_PAYMENTS_SANDBOX;
  afterEach(() => {
    jest.dontMock("expo-constants");
    if (originalEnabled === undefined) delete process.env.EXPO_PUBLIC_EVENT_PAYMENTS_ENABLED;
    else process.env.EXPO_PUBLIC_EVENT_PAYMENTS_ENABLED = originalEnabled;
    if (originalSandbox === undefined) delete process.env.EXPO_PUBLIC_EVENT_PAYMENTS_SANDBOX;
    else process.env.EXPO_PUBLIC_EVENT_PAYMENTS_SANDBOX = originalSandbox;
  });

  it.each([
    ["production", undefined, undefined, false],
    ["development", undefined, undefined, false],
    ["production", "true", undefined, true],
    ["production", undefined, "true", false],
    ["development", undefined, "true", true],
  ])("resolves %s enabled=%s sandbox=%s as %s", (environment, enabled, sandbox, expected) => {
    if (enabled === undefined) delete process.env.EXPO_PUBLIC_EVENT_PAYMENTS_ENABLED;
    else process.env.EXPO_PUBLIC_EVENT_PAYMENTS_ENABLED = enabled;
    if (sandbox === undefined) delete process.env.EXPO_PUBLIC_EVENT_PAYMENTS_SANDBOX;
    else process.env.EXPO_PUBLIC_EVENT_PAYMENTS_SANDBOX = sandbox;
    jest.isolateModules(() => {
      jest.doMock("expo-constants", () => ({ __esModule: true, default: {
        expoConfig: { name: "test", slug: "test", extra: { EXPO_ENV: environment } },
      } }));
      expect(jest.requireActual<typeof import("./env")>("./env").env.eventPaymentsEnabled).toBe(expected);
    });
  });
});

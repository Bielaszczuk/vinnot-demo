import { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from "axios";
import { http, configureHttpAuth } from "./http";
const mock = jest;
const success = (config: InternalAxiosRequestConfig): AxiosResponse => ({
  config,
  data: { ok: true },
  status: 200,
  statusText: "OK",
  headers: {},
});
const denied = (config: InternalAxiosRequestConfig): never => {
  throw new AxiosError("Confirm identity", "ERR_BAD_REQUEST", config, undefined, {
    ...success(config),
    status: 403,
    data: { code: "REAUTHENTICATION_REQUIRED" },
  });
};
const originalAdapter = http.defaults.adapter;
afterEach(() => {
  http.defaults.adapter = originalAdapter;
  mock.restoreAllMocks();
});

describe("session-bound sensitive requests", () => {
  it("shares one confirmation across concurrent failures and reuses a valid proof", async () => {
    const reauthenticate = mock.fn(async () => "proof");
    configureHttpAuth({
      getAccessToken: () => "access",
      refreshToken: async () => "access",
      getSessionGeneration: () => 1,
      reauthenticate,
    });
    http.defaults.adapter = async (config) =>
      config.headers.get("X-Admin-Reauthentication") === "proof" ? success(config) : denied(config);
    const results = await Promise.all([
      http.delete("/admin/wines/one"),
      http.delete("/admin/wines/two"),
    ]);
    expect(results.map((value) => value.status)).toEqual([200, 200]);
    expect(reauthenticate).toHaveBeenCalledTimes(1);
    await http.delete("/admin/wines/three");
    expect(reauthenticate).toHaveBeenCalledTimes(1);
  });
  it("does not execute the mutation when confirmation is cancelled or remains invalid", async () => {
    const attempts = mock.fn(async (config: InternalAxiosRequestConfig) => denied(config));
    http.defaults.adapter = attempts;
    configureHttpAuth({
      getAccessToken: () => "access",
      refreshToken: async () => "access",
      getSessionGeneration: () => 1,
      reauthenticate: async () => {
        throw new Error("cancelled");
      },
    });
    await expect(http.delete("/admin/wines/one")).rejects.toThrow("cancelled");
    expect(attempts).toHaveBeenCalledTimes(1);
    configureHttpAuth({
      getAccessToken: () => "access",
      refreshToken: async () => "access",
      getSessionGeneration: () => 1,
      reauthenticate: async () => "invalid",
    });
    await expect(http.delete("/admin/wines/one")).rejects.toThrow();
    expect(attempts).toHaveBeenCalledTimes(3);
  });
  it("discards late responses and challenges belonging to a previous session", async () => {
    let generation = 1;
    configureHttpAuth({
      getAccessToken: () => "access",
      refreshToken: async () => "access",
      getSessionGeneration: () => generation,
      reauthenticate: async () => {
        generation++;
        return "late";
      },
    });
    http.defaults.adapter = async (config) => denied(config);
    await expect(http.delete("/admin/wines/one")).rejects.toThrow("Session changed");
    http.defaults.adapter = async (config) => {
      generation++;
      return success(config);
    };
    await expect(http.get("/cellar")).rejects.toThrow("Session changed");
  });
});

it("keeps the explicit restored bearer instead of replacing it with stale Redux credentials", async () => {
  configureHttpAuth({ getAccessToken: () => "stale", refreshToken: async () => "unused" });
  const received: unknown[] = [];
  http.defaults.adapter = async (config) => {
    received.push(config.headers.Authorization);
    return success(config);
  };
  await http.get("/auth/me", { headers: { Authorization: "Bearer restored" } });
  await http.get("/wines");
  expect(received).toEqual(["Bearer restored", "Bearer stale"]);
});

it("retries sensitive requests with the renewed bearer used to confirm identity", async () => {
  let accessToken = "before-confirmation";
  const reauthenticate = mock.fn(async () => {
    accessToken = "renewed-before-password-prompt";
    return "proof-for-renewed-session";
  });
  configureHttpAuth({
    getAccessToken: () => accessToken,
    refreshToken: async () => accessToken,
    getSessionGeneration: () => 1,
    reauthenticate,
  });
  let appliedChanges = 0;
  http.defaults.adapter = async (config) => {
    const proof = config.headers.get("X-Admin-Reauthentication");
    if (
      proof !== "proof-for-renewed-session" ||
      config.headers.Authorization !== `Bearer ${accessToken}`
    ) {
      return denied(config);
    }
    appliedChanges++;
    return success(config);
  };
  const results = await Promise.all([
    http.put("/admin/users/one/role"),
    http.put("/admin/users/two/role"),
  ]);
  expect(results.map((result) => result.status)).toEqual([200, 200]);
  expect(appliedChanges).toBe(2);
  expect(reauthenticate).toHaveBeenCalledTimes(1);
});

it.each([
  "/admin/events/one",
  "/admin/wines/one",
  "/admin/wineries/one",
  "/admin/wine-routes/one",
  "/admin/users/one",
  "/events/one",
])("confirms and performs deletion at %s once without another user action", async (path) => {
  let token = "before";
  let applied = 0;
  let requested = 0;
  const reauthenticate = mock.fn(async () => {
    token = "renewed";
    return "proof";
  });
  configureHttpAuth({
    getAccessToken: () => token,
    refreshToken: async () => token,
    getSessionGeneration: () => 1,
    reauthenticate,
  });
  http.defaults.adapter = async (config) => {
    requested++;
    if (
      config.headers.get("X-Admin-Reauthentication") !== "proof" ||
      config.headers.Authorization !== "Bearer renewed"
    )
      return denied(config);
    applied++;
    return success(config);
  };
  await http.delete(path);
  expect(requested).toBe(2);
  expect(applied).toBe(1);
  expect(reauthenticate).toHaveBeenCalledTimes(1);
});
it("application requests cannot preserve a stale explicit bearer while auth restoration can", async () => {
  configureHttpAuth({ getAccessToken: () => "current", refreshToken: async () => "current" });
  http.defaults.adapter = async (config) => {
    expect(config.headers.Authorization).toBe("Bearer current");
    return success(config);
  };
  await http.delete("/admin/events/one", { headers: { Authorization: "Bearer stale" } });
});

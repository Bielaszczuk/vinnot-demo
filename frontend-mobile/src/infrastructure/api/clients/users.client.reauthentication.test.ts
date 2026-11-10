import { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from "axios";
import { http, configureHttpAuth } from "@/infrastructure/api/http";
import { usersApiClient } from "./users.client";

const success = (config: InternalAxiosRequestConfig, status = 200): AxiosResponse => ({
  config,
  data: { message: "sent" },
  status,
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
});

describe("own-account changes that require identity confirmation", () => {
  it.each([
    ["email change", () => usersApiClient.requestEmailChange({ newEmail: "new@example.test" }), "/users/me/email-change"],
    ["permanent deletion", () => usersApiClient.deleteAccount({}), "/users/me/permanent"],
  ])("asks for the password once and repeats the %s with the renewed session proof", async (_name, call, path) => {
    let bearer = "before-confirmation";
    const reauthenticate = jest.fn(async () => {
      bearer = "renewed-access";
      return "session-proof";
    });
    configureHttpAuth({
      getAccessToken: () => bearer,
      refreshToken: async () => bearer,
      getSessionGeneration: () => 0,
      reauthenticate,
    });
    const attempts: (string | undefined)[] = [];
    http.defaults.adapter = async (config) => {
      expect(config.url).toBe(path);
      const proof = config.headers.get("X-Admin-Reauthentication") as string | undefined;
      attempts.push(proof ?? undefined);
      return proof === "session-proof" && config.headers.Authorization === "Bearer renewed-access"
        ? success(config)
        : denied(config);
    };

    await call();

    expect(reauthenticate).toHaveBeenCalledTimes(1);
    expect(attempts).toEqual([undefined, "session-proof"]);
  });

  it("does not repeat the deletion when the person cancels the confirmation", async () => {
    configureHttpAuth({
      getAccessToken: () => "access",
      refreshToken: async () => "access",
      getSessionGeneration: () => 0,
      reauthenticate: async () => {
        throw new Error("Identity confirmation cancelled");
      },
    });
    const attempts = jest.fn(async (config: InternalAxiosRequestConfig) => denied(config));
    http.defaults.adapter = attempts;

    await expect(usersApiClient.deleteAccount({})).rejects.toThrow();
    expect(attempts).toHaveBeenCalledTimes(1);
  });

  it("keeps account deactivation free of the confirmation prompt", async () => {
    const reauthenticate = jest.fn(async () => "proof");
    configureHttpAuth({
      getAccessToken: () => "access",
      refreshToken: async () => "access",
      getSessionGeneration: () => 0,
      reauthenticate,
    });
    http.defaults.adapter = async (config) => success(config, 204);

    await usersApiClient.deactivateAccount();

    expect(reauthenticate).not.toHaveBeenCalled();
  });
});

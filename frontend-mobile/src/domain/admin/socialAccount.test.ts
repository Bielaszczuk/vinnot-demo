import { describe, expect, it } from "@jest/globals";
import { accountState, type SocialAccount } from "./socialAccount";

function account(overrides: Partial<SocialAccount> = {}): SocialAccount {
  return {
    network: "THREADS",
    mode: "OAUTH",
    configured: true,
    connected: true,
    accountId: "123",
    displayName: "vinnot",
    status: "CONNECTED",
    expiresAt: null,
    lastError: null,
    ...overrides,
  };
}

describe("social account state", () => {
  it("is connected when the network has a working token", () => {
    expect(accountState(account())).toBe("CONNECTED");
    expect(accountState(account({ mode: "CONFIG", status: null }))).toBe("CONNECTED");
  });

  it("needs a reconnect when the token refresh failed or the stored token expired", () => {
    expect(accountState(account({ status: "REFRESH_FAILED" }))).toBe("NEEDS_RECONNECT");
    expect(accountState(account({ status: "REFRESH_FAILED", connected: false }))).toBe("NEEDS_RECONNECT");
    expect(accountState(account({ status: "CONNECTED", connected: false }))).toBe("NEEDS_RECONNECT");
  });

  it("is not connected when configured but without an account, and not configured without credentials", () => {
    expect(accountState(account({ connected: false, status: null }))).toBe("NOT_CONNECTED");
    expect(accountState(account({ configured: false, connected: false, status: null }))).toBe("NOT_CONFIGURED");
  });
});

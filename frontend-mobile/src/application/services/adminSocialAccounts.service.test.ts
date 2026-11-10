import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { adminSocialAccountsClient } from "@/infrastructure/api/clients/adminSocialAccounts.client";
import { adminSocialAccountsService } from "./adminSocialAccounts.service";

jest.mock("@/infrastructure/api/clients/adminSocialAccounts.client", () => ({
  adminSocialAccountsClient: { list: jest.fn() },
}));

const client = adminSocialAccountsClient as jest.Mocked<typeof adminSocialAccountsClient>;

describe("adminSocialAccountsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps the accounts in network order, leaving out unknown networks and modes", async () => {
    client.list.mockResolvedValue([
      {
        network: "TIKTOK",
        mode: "OAUTH",
        configured: true,
        connected: true,
        accountId: "open-1",
        displayName: "Vinnot",
        status: "CONNECTED",
        expiresAt: "2027-11-05T00:00:00Z",
        lastError: null,
      },
      { network: "MYSPACE", mode: "OAUTH", configured: true, connected: true },
      { network: "THREADS", mode: "MAGIC", configured: true, connected: true },
      { network: "INSTAGRAM", mode: "CONFIG", configured: false, connected: false },
    ]);

    await expect(adminSocialAccountsService.getAccounts()).resolves.toEqual([
      {
        network: "INSTAGRAM",
        mode: "CONFIG",
        configured: false,
        connected: false,
        accountId: null,
        displayName: null,
        status: null,
        expiresAt: null,
        lastError: null,
      },
      {
        network: "TIKTOK",
        mode: "OAUTH",
        configured: true,
        connected: true,
        accountId: "open-1",
        displayName: "Vinnot",
        status: "CONNECTED",
        expiresAt: "2027-11-05T00:00:00Z",
        lastError: null,
      },
    ]);
  });
});

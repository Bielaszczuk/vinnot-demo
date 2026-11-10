import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { http } from "@/infrastructure/api/http";
import { adminSocialAccountsClient } from "./adminSocialAccounts.client";

jest.mock("@/infrastructure/api/http", () => ({
  http: { get: jest.fn() },
}));

const httpMock = http as jest.Mocked<typeof http>;

describe("adminSocialAccountsClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists the network connections as the bare body the backend answers", async () => {
    const accounts = [{ network: "THREADS", mode: "OAUTH", configured: true, connected: false }];
    httpMock.get.mockResolvedValue({ data: accounts } as never);

    await expect(adminSocialAccountsClient.list()).resolves.toEqual(accounts);
    expect(httpMock.get).toHaveBeenCalledWith("/admin/social-accounts");
  });
});

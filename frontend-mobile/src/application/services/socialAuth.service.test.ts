import { describe, expect, it, jest } from "@jest/globals";
import { socialAuthService } from "./socialAuth.service";
import { socialIdentityGateway } from "@/infrastructure/identity/socialIdentity.gateway";

jest.mock("@/infrastructure/identity/socialIdentity.gateway", () => ({
  socialIdentityGateway: {
    acquire: jest.fn(),
    acquireAppleAccountDeletionCredential: jest.fn(),
  },
}));

const gateway = socialIdentityGateway as jest.Mocked<typeof socialIdentityGateway>;

describe("socialAuth.service", () => {
  it("delegates provider credential acquisition", async () => {
    gateway.acquire.mockResolvedValue({ provider: "GOOGLE", idToken: "token" } as never);

    await socialAuthService.acquire("GOOGLE");
    expect(gateway.acquire).toHaveBeenCalledWith("GOOGLE");
  });

  it("maps Apple revocation data to the account-deletion contract", async () => {
    gateway.acquireAppleAccountDeletionCredential.mockResolvedValue({
      authorizationCode: "code",
      clientId: "client",
    });

    await expect(socialAuthService.acquireAppleAccountDeletionCredential()).resolves.toEqual({
      appleAuthorizationCode: "code",
      appleClientId: "client",
    });
  });
});

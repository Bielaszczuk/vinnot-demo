import { socialIdentityGateway } from "./socialIdentity.gateway";
import { env } from "@/shared/config/env";
import { Settings } from "react-native-fbsdk-next";

jest.mock("@/shared/config/env", () => ({ env: { facebookLoginEnabled: false } }));
jest.mock("react-native-fbsdk-next", () => ({ Settings: { initializeSDK: jest.fn() } }));

describe("Facebook production isolation", () => {
  const originalId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
  afterEach(() => {
    env.facebookLoginEnabled = false;
    if (originalId === undefined) delete process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
    else process.env.EXPO_PUBLIC_FACEBOOK_APP_ID = originalId;
  });

  it("rejects a direct call before initializing the SDK even with inherited credentials", async () => {
    process.env.EXPO_PUBLIC_FACEBOOK_APP_ID = "development-id";
    await expect(socialIdentityGateway.acquire("FACEBOOK")).rejects.toThrow("authErrors.facebookNotConfigured");
    expect(Settings.initializeSDK).not.toHaveBeenCalled();
  });

  it("requires a configured app ID in an enabled environment", async () => {
    env.facebookLoginEnabled = true;
    delete process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
    await expect(socialIdentityGateway.acquire("FACEBOOK")).rejects.toThrow("authErrors.facebookNotConfigured");
  });
});

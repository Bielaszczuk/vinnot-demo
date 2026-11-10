import { appVersionService } from "./appVersion.service";
import { appVersionsClient } from "@/infrastructure/api/clients/appVersions.client";
import { appBuildGateway } from "@/infrastructure/device/appBuild.gateway";

jest.mock("@/infrastructure/api/clients/appVersions.client", () => ({ appVersionsClient: { minimum: jest.fn() } }));
jest.mock("@/infrastructure/device/appBuild.gateway", () => ({
  appBuildGateway: { version: jest.fn(), platform: jest.fn() },
}));

const minimum = jest.mocked(appVersionsClient.minimum);
const version = jest.mocked(appBuildGateway.version);
const platform = jest.mocked(appBuildGateway.platform);

beforeEach(() => {
  jest.clearAllMocks();
  version.mockReturnValue("0.2.0");
  platform.mockReturnValue("ios");
});

describe("appVersionService.requirement", () => {
  it("requires the update and points to the platform store when the build is older", async () => {
    minimum.mockResolvedValue({ ios: "0.3.0", android: null });
    await expect(appVersionService.requirement()).resolves.toEqual({
      required: true,
      storeUrl: "https://apps.apple.com/app/vinnot/id6817992780",
    });

    platform.mockReturnValue("android");
    minimum.mockResolvedValue({ ios: null, android: "0.10.0" });
    await expect(appVersionService.requirement()).resolves.toEqual({
      required: true,
      storeUrl: "https://play.google.com/store/apps/details?id=com.vinnot.app",
    });
  });

  it("does not block a current build, a null minimum or the other platform's minimum", async () => {
    minimum.mockResolvedValue({ ios: "0.2.0", android: null });
    await expect(appVersionService.requirement()).resolves.toEqual({ required: false });

    minimum.mockResolvedValue({ ios: null, android: "9.0.0" });
    await expect(appVersionService.requirement()).resolves.toEqual({ required: false });
  });

  it("treats unreadable minimums, a missing build version and unknown platforms as no minimum", async () => {
    minimum.mockResolvedValue({ ios: "latest", android: 3 } as never);
    await expect(appVersionService.requirement()).resolves.toEqual({ required: false });

    minimum.mockResolvedValue({ ios: "0.3.0", android: "0.3.0" });
    version.mockReturnValue(undefined);
    await expect(appVersionService.requirement()).resolves.toEqual({ required: false });

    version.mockReturnValue("0.2.0");
    platform.mockReturnValue("web");
    await expect(appVersionService.requirement()).resolves.toEqual({ required: false });
  });

  it("rejects a response without a policy object so the caller can fail open", async () => {
    minimum.mockResolvedValue(null as never);
    await expect(appVersionService.requirement()).rejects.toThrow("INVALID_APP_VERSION_POLICY");
    minimum.mockResolvedValue("0.3.0" as never);
    await expect(appVersionService.requirement()).rejects.toThrow("INVALID_APP_VERSION_POLICY");
  });

  it("propagates transport failures", async () => {
    minimum.mockRejectedValue(new Error("offline"));
    await expect(appVersionService.requirement()).rejects.toThrow("offline");
  });
});

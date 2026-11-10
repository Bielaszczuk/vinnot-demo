import Constants from "expo-constants";
import { Platform } from "react-native";
import { appBuildGateway } from "./appBuild.gateway";

jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { version: "0.2.0" } } }));

describe("appBuildGateway", () => {
  it("reports the configured binary version and the running platform", () => {
    expect(appBuildGateway.version()).toBe("0.2.0");
    expect(appBuildGateway.platform()).toBe(Platform.OS);
  });

  it("reports no version when the configuration is missing", () => {
    (Constants as { expoConfig: unknown }).expoConfig = null;
    expect(appBuildGateway.version()).toBeUndefined();
  });
});

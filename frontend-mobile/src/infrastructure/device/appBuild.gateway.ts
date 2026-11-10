import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * The installed build. With the `appVersion` runtime policy, the configured
 * version equals the store binary version, so an OTA update never changes it.
 */
export const appBuildGateway = {
  version(): string | undefined {
    return Constants.expoConfig?.version;
  },
  platform(): string {
    return Platform.OS;
  },
};

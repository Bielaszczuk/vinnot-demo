import { appVersionsClient } from "@/infrastructure/api/clients/appVersions.client";
import { appBuildGateway } from "@/infrastructure/device/appBuild.gateway";
import type { MinimumAppVersionsDto } from "@/infrastructure/api/dto/appVersions.dto";
import {
  isUpdateRequired,
  minimumVersionFor,
  parseAppVersion,
  storeUrlFor,
  type MinimumAppVersions,
} from "@/domain/app/appVersion";

export interface AppUpdateRequirement {
  required: boolean;
  storeUrl?: string;
}

export const appVersionService = {
  /** Fetches the policy and compares it with the installed build. Errors propagate to the caller. */
  async requirement(): Promise<AppUpdateRequirement> {
    const minimums = minimumsFrom(await appVersionsClient.minimum());
    const platform = appBuildGateway.platform();
    const storeUrl = storeUrlFor(platform);
    const required = !!storeUrl && isUpdateRequired(appBuildGateway.version(), minimumVersionFor(minimums, platform));
    return required ? { required, storeUrl } : { required: false };
  },
};

/** An unreadable field means "no minimum": a malformed policy must never lock users out. */
function minimumsFrom(value: MinimumAppVersionsDto | null | undefined): MinimumAppVersions {
  if (!value || typeof value !== "object") throw new Error("INVALID_APP_VERSION_POLICY");
  return { ios: versionOrNull(value.ios), android: versionOrNull(value.android) };
}

function versionOrNull(value: unknown): string | null {
  return parseAppVersion(value) ? (value as string) : null;
}

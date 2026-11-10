import { hapticsGateway } from "@/infrastructure/device/haptics.gateway";
import { featureFlags } from "@/shared/config/featureFlags";

export type HapticImpact = "light" | "medium" | "heavy";
export type HapticNotification = "success" | "warning" | "error";

function execute(feedback: () => Promise<void>): void {
  if (!featureFlags.haptics) return;
  void feedback().catch(() => undefined);
}

export const hapticsService = {
  impact(style: HapticImpact = "light"): void {
    execute(() => hapticsGateway.impact(style));
  },

  selection(): void {
    execute(() => hapticsGateway.selection());
  },

  notification(type: HapticNotification): void {
    execute(() => hapticsGateway.notification(type));
  },
};

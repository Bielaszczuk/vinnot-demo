import type { ReactNode } from "react";
import { useAppUpdateRequirement } from "@/presentation/hooks/useAppUpdateRequirement";
import { UpdateRequiredScreen } from "./UpdateRequiredScreen";

/**
 * Wraps the whole navigator. When the installed build is below the minimum
 * for its platform, the update screen replaces every route; otherwise, and
 * while the check is pending or failed, the app renders unchanged.
 */
export function AppUpdateGate({ children }: { children: ReactNode }) {
  const { required, storeUrl } = useAppUpdateRequirement();
  if (required && storeUrl) return <UpdateRequiredScreen storeUrl={storeUrl} />;
  return <>{children}</>;
}

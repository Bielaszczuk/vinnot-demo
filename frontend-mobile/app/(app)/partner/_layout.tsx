/**
 * Partner routes — partners can manage their own event catalog.
 */
import { Stack } from "expo-router";
import { useStackAnimation } from "@/presentation/components/ui/motion/reducedMotion";
import { ROLES } from "@/shared/config/roles";
import { RoleGuard } from "@/presentation/navigation/guards";

export default function PartnerLayout() {
  // The platform default push slides; under Reduce Motion it cross-dissolves.
  const animation = useStackAnimation();
  return (
    <RoleGuard requiredRoles={[ROLES.PARTNER, ROLES.ADMIN]}>
      <Stack screenOptions={{ headerShown: false, animation }} />
    </RoleGuard>
  );
}

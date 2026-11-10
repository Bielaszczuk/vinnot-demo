/**
 * Admin layout — role-guarded.
 */
import { Stack } from "expo-router";
import { useStackAnimation } from "@/presentation/components/ui/motion/reducedMotion";
import { RoleGuard } from "@/presentation/navigation/guards";
import { ROLES } from "@/shared/config/roles";

export default function AdminLayout() {
  // The platform default push slides; under Reduce Motion it cross-dissolves.
  const animation = useStackAnimation();
  return (
    <RoleGuard requiredRoles={[ROLES.ADMIN, ROLES.MODERATOR]}>
      <Stack screenOptions={{ headerShown: false, animation }} />
    </RoleGuard>
  );
}

import { Stack } from "expo-router";
import { authColors } from "@/presentation/features/auth";
import { useStackAnimation } from "@/presentation/components/ui/motion/reducedMotion";

export default function AuthLayout() {
  const animation = useStackAnimation("slide_from_bottom");
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation,
        contentStyle: { backgroundColor: authColors.background },
      }}
    />
  );
}

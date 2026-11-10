import { Stack } from "expo-router";
import { useStackAnimation } from "@/presentation/components/ui/motion/reducedMotion";

export const unstable_settings = { initialRouteName: "index" };

export default function RoutesLayout() {
  // The platform default push slides; under Reduce Motion it cross-dissolves.
  const animation = useStackAnimation();
  return <Stack screenOptions={{ headerShown: false, animation }} />;
}

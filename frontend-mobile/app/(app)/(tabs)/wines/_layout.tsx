/**
 * Wines nested Stack — keeps the tab bar visible on all wines screens.
 */
import { Stack } from "expo-router";
import { lightTokens } from "@/shared/theme/tokens";
import { useStackAnimation } from "@/presentation/components/ui/motion/reducedMotion";

export default function WinesLayout() {
  const animation = useStackAnimation("slide_from_right");
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: lightTokens.bgBase },
        animation,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="compare" />
      <Stack.Screen name="scan" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="submissions" />
    </Stack>
  );
}

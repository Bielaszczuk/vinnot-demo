/**
 * Events nested Stack — keeps the tab bar visible on all events screens.
 */
import { Stack } from "expo-router";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { useStackAnimation } from "@/presentation/components/ui/motion/reducedMotion";

export const unstable_settings = { initialRouteName: "index" };

export default function EventsLayout() {
  const animation = useStackAnimation("slide_from_right");
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: vinnotColors.canvas },
        animation,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}

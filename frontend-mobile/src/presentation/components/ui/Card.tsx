/**
 * Card — elevated surface with wine-tinted shadow.
 * Optionally pressable (PressableCard variant).
 */
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { shadows } from "@/shared/theme/shadows";
import { motionPresets } from "@/shared/theme/motion";
import { hapticsService } from "@/application/services/haptics.service";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevation?: "none" | "sm" | "md" | "lg";
  padding?: number;
  radius?: number;
}

interface PressableCardProps extends CardProps {
  onPress: () => void;
  onLongPress?: () => void;
  testID?: string;
}

export function Card({ children, style, elevation = "sm", padding = 16, radius = radii.md }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevation !== "none" && shadows[elevation],
        { padding, borderRadius: radius },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PressableCard({
  children,
  style,
  elevation = "sm",
  padding = 16,
  radius = radii.md,
  onPress,
  onLongPress,
  testID,
}: PressableCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(motionPresets.cardPress.scaleDown, {
      duration: motionPresets.cardPress.duration,
    });
    hapticsService.selection();
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: motionPresets.cardPress.duration });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID}
        accessibilityRole="button"
      >
        <View
          style={[
            styles.card,
            elevation !== "none" && shadows[elevation],
            { padding, borderRadius: radius },
            style,
          ]}
        >
          {children}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightTokens.surfaceDefault,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    overflow: "hidden",
  },
});

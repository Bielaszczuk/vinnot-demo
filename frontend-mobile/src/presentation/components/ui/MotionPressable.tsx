import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type MotionPressableProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
};

const springConfig = {
  damping: 18,
  stiffness: 260,
  mass: 0.7,
} as const;

export function MotionPressable({
  children,
  onPressIn,
  onPressOut,
  pressedScale = 0.975,
  style,
  ...props
}: MotionPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        scale.value = withSpring(pressedScale, springConfig);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, springConfig);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

import { useEffect } from "react";
import { Image, View } from "react-native";
import Animated, {
  cancelAnimation, Easing, Extrapolation, interpolate,
  useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from "react-native-reanimated";
import brandMark from "../../../../assets/brand/mark.png";
import { vinnotColors } from "@/shared/theme/vinnotTheme";

type WineGlassMarkProps = { size?: number; animated?: boolean; color?: string };
const phaseStops = [0, 0.08, 0.22, 0.36, 0.50, 0.64, 0.74, 0.85, 0.98, 1];
const fillStops = [0, 0, 0.15, 0.32, 0.49, 0.66, 1, 1, 1, 1];

/** Compatibility name: the supplied grape cluster paints upward in a quiet loading cycle. */
export function WineGlassMark({ size = 86, animated = false, color = vinnotColors.brand }: WineGlassMarkProps) {
  const reduceMotion = useReducedMotion();
  const running = animated && !reduceMotion;
  const phase = useSharedValue(0);
  const width = size * 338 / 431;
  const imageStyle = { width, height: size, tintColor: color };
  useEffect(() => {
    phase.value = 0;
    if (running) phase.value = withRepeat(withTiming(1, { duration: 3400, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(phase);
  }, [running, phase]);
  const fillStyle = useAnimatedStyle(() => ({
    height: size * interpolate(phase.value, phaseStops, fillStops, Extrapolation.CLAMP),
    opacity: interpolate(phase.value, [0, 0.85, 0.98, 1], [1, 1, 0, 0], Extrapolation.CLAMP),
  }));
  return <View style={{ width: size, height: size, alignItems: "center" }}
    accessible accessibilityRole="image" accessibilityLabel="Vinnot">
    <Image source={brandMark} resizeMode="contain" style={[imageStyle, { opacity: running ? 0.18 : 1 }]} />
    {running && <>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", bottom: 0, width, overflow: "hidden" }, fillStyle]}>
        <Image source={brandMark} resizeMode="contain" style={[imageStyle, { position: "absolute", bottom: 0 }]} />
      </Animated.View>
    </>}
  </View>;
}

/**
 * A thermometer whose mercury rises from the bulb to the recommended serving temperature on appear.
 * Still at that temperature with reduced motion.
 */
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { ServingTemperature } from "@/domain/wine/wine.profile-art";
import { profileArtStyles as styles, THERMOMETER_TUBE_HEIGHT } from "./profileArt.styles";
import { useAppearProgress } from "./useAppearProgress";

export { THERMOMETER_TUBE_HEIGHT };

/** Top of the scale: serving temperatures run from about 0 to 25 °C. */
export const THERMOMETER_MAX_C = 25;

/** Fraction of the tube the mercury fills: the middle of the recommended range. */
export function thermometerLevel({ min, max }: ServingTemperature): number {
  return Math.min(1, Math.max(0, (min + max) / 2 / THERMOMETER_MAX_C));
}

export function temperatureLabel({ min, max }: ServingTemperature): string {
  return min === max ? `${min} °C` : `${min}–${max} °C`;
}

export function ServingThermometer({ temperature }: { temperature: ServingTemperature }) {
  const progress = useAppearProgress(1200);
  const height = THERMOMETER_TUBE_HEIGHT * thermometerLevel(temperature);
  const mercury = useAnimatedStyle(() => ({ height: height * progress.value }));

  return (
    <View testID="serving-thermometer" style={styles.thermometer}>
      <View style={styles.thermometerBody}>
        <View style={styles.tube}>
          <Animated.View testID="serving-thermometer-mercury" style={[styles.mercury, mercury]} />
        </View>
        <View style={styles.bulb} />
      </View>
      <Text style={styles.thermometerLabel}>{temperatureLabel(temperature)}</Text>
    </View>
  );
}

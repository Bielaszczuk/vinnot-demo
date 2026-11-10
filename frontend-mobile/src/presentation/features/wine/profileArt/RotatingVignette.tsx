/**
 * One watercolor note at a time, changing in place to the next (coffee -> wild herbs -> lemon -> ...).
 * Decorative: the card text already lists every note, so screen readers skip it.
 * With reduced motion nothing moves: the first notes stand still in a row.
 */
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, Keyframe, useReducedMotion } from "react-native-reanimated";
import { profileArtStyles as styles } from "./profileArt.styles";

export interface Vignette {
  key: string;
  label: string;
  source: number;
}

/** Time each note stays on screen, its change included. */
export const VIGNETTE_ROTATE_MS = 4500;
/**
 * The leaving note is gone before the next one shows (it disappears, then the next appears), so their two
 * captions never overlap mid-change.
 */
const CHANGE_MS = 1300;
const STILL_MAX = 3;

const enter = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.97 }] },
  45: { opacity: 0, transform: [{ scale: 0.97 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.inOut(Easing.sin) },
}).duration(CHANGE_MS);

const exit = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  45: { opacity: 0, transform: [{ scale: 1.01 }], easing: Easing.inOut(Easing.sin) },
  100: { opacity: 0, transform: [{ scale: 1.01 }] },
}).duration(CHANGE_MS);

interface RotatingVignetteProps {
  items: Vignette[];
  testID?: string;
}

export function RotatingVignette({ items, testID }: RotatingVignetteProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const rotates = !reduceMotion && items.length > 1;
  const advance = useCallback(() => setIndex((current) => current + 1), []);

  useEffect(() => {
    if (!rotates) return;
    const timer = setInterval(advance, VIGNETTE_ROTATE_MS);
    return () => clearInterval(timer);
  }, [advance, rotates]);

  if (!items.length) return null;

  if (reduceMotion) {
    return (
      <View testID={testID} style={styles.stillRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {items.slice(0, STILL_MAX).map((item) => (
          <VignetteFrame key={item.key} item={item} still />
        ))}
      </View>
    );
  }

  const current = items[index % items.length]!;
  return (
    <View testID={testID} style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View key={`${current.key}-${index}`} entering={enter} exiting={exit} style={styles.layer}>
        <VignetteFrame item={current} />
      </Animated.View>
    </View>
  );
}

function VignetteFrame({ item, still = false }: { item: Vignette; still?: boolean }) {
  return (
    <View testID={`vignette-${item.key}`} style={still ? styles.stillFrame : styles.frame}>
      <Image
        testID={`vignette-image-${item.key}`}
        source={item.source}
        style={still ? styles.stillImage : styles.image}
        contentFit="contain"
      />
      <Text style={styles.label} numberOfLines={2}>
        {item.label}
      </Text>
    </View>
  );
}

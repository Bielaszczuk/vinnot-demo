/**
 * One illustrated answer of the taste quiz: the watercolor on the cream stage and its label.
 * The selected card gets a gentle brand outline and lifts slightly (at once under Reduce Motion).
 * The style stays a plain array: NativeWind drops function styles on Pressable on devices.
 */
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { Check } from "lucide-react-native";
import { editorial, radii } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";

const SELECT_MS = 180;
const SELECTED_SCALE = 1.02;

interface TasteQuizOptionCardProps {
  label: string;
  art: number;
  selected: boolean;
  /** Two options share a row as tall cards; four make a 2x2 grid of square ones. */
  tall: boolean;
  onPress: () => void;
  testID?: string;
}

export function TasteQuizOptionCard({ label, art, selected, tall, onPress, testID }: TasteQuizOptionCardProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    const target = selected ? SELECTED_SCALE : 1;
    scale.value = reduceMotion ? target : withTiming(target, { duration: SELECT_MS });
  }, [reduceMotion, scale, selected]);

  const lift = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.cell, lift]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        testID={testID}
        style={[styles.card, selected && styles.cardSelected]}
      >
        <View style={[styles.stage, tall ? styles.stageTall : styles.stageSquare]}>
          <Image accessible={false} source={art} style={styles.art} contentFit="contain" />
          {selected ? (
            <View style={styles.check}>
              <Check size={14} color={vinnotColors.white} strokeWidth={2.6} />
            </View>
          ) : null}
        </View>
        <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={3}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: { width: "48%" },
  card: {
    gap: 10,
    padding: 8,
    paddingBottom: 12,
    borderRadius: radii["2xl"],
    borderWidth: 1.5,
    borderColor: vinnotColors.borderSoft,
    backgroundColor: vinnotColors.surface,
  },
  cardSelected: {
    borderColor: vinnotColors.brand,
    backgroundColor: vinnotColors.brandTint,
  },
  stage: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.xl,
    backgroundColor: editorial.cream,
    overflow: "hidden",
  },
  stageSquare: { aspectRatio: 1 },
  stageTall: { aspectRatio: 0.78 },
  art: { width: "86%", height: "86%" },
  check: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vinnotColors.brand,
  },
  label: {
    paddingHorizontal: 4,
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    textAlign: "center",
    color: vinnotColors.ink,
  },
  labelSelected: { fontFamily: vinnotFonts.semibold, color: vinnotColors.brandDeep },
});

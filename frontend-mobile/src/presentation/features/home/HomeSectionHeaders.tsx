/**
 * Home section headings, shared by the Home sections and the social sections on Home.
 * Kept apart from the section bodies so a heading does not pull in cards, maps or images.
 */
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { styles } from "./HomeScreenView.styles";

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function HomeListHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  /** Without an action the heading stands alone, in the same style. */
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.homeListHeader}>
      <View style={styles.homeListCopy}>
        <Text style={styles.homeListEyebrow}>Vinnot</Text>
        <Text style={styles.homeListTitle}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <MotionPressable
          onPress={onAction}
          style={styles.homeListAction}
          pressedScale={0.965}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.homeListActionText}>{actionLabel}</Text>
        </MotionPressable>
      ) : null}
    </View>
  );
}

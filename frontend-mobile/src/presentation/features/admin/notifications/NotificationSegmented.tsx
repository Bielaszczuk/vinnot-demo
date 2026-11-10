import { Pressable, Text, View } from "react-native";
import { notificationStyles as styles } from "./notificationStyles";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  /** Shows a dot, for example on a language that already has text. */
  marked?: boolean;
  markedLabel?: string;
}

/** One-tap choice among a few options (tabs, languages, metric windows); `fill` shares the full width evenly. */
export function NotificationSegmented<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  role = "button",
  fill = false,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  role?: "button" | "tab";
  /** Long labels (the section tabs) wrap to two lines instead of running off the screen. */
  fill?: boolean;
}) {
  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole={role === "tab" ? "tablist" : undefined} style={[styles.segment, fill && styles.segmentFill]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole={role}
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.marked && option.markedLabel ? `${option.label}, ${option.markedLabel}` : option.label}
            onPress={() => onChange(option.value)}
            style={[styles.segmentItem, fill && styles.segmentItemFill, active && styles.segmentItemActive]}
          >
            <Text
              numberOfLines={fill ? 2 : undefined}
              style={[styles.segmentText, fill && styles.segmentTextFill, active && styles.segmentTextActive]}
            >
              {option.label}
            </Text>
            {option.marked && <View style={styles.dot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Switch — the native switch in brand colours. ToggleRow — a labelled row that
 * toggles from anywhere on it and reads as one switch to assistive technology.
 */
import type { ReactNode } from "react";
import {
  Pressable,
  Switch as NativeSwitch,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type SwitchProps as NativeSwitchProps,
  type ViewStyle,
} from "react-native";
import { lightTokens } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

export type SwitchProps = Omit<NativeSwitchProps, "trackColor" | "thumbColor" | "ios_backgroundColor">;

const TRACK = { false: lightTokens.borderStrong, true: lightTokens.brandPrimary };

export function Switch(props: SwitchProps) {
  return (
    <NativeSwitch
      {...props}
      trackColor={TRACK}
      thumbColor={lightTokens.surfaceDefault}
      ios_backgroundColor={lightTokens.borderStrong}
    />
  );
}

export interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Optional leading icon or mark. */
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ToggleRow({ label, description, value, onValueChange, disabled = false, icon, style, testID }: ToggleRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      testID={testID}
      style={[styles.row, disabled && styles.disabled, style]}
    >
      {icon}
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {!!description && <Text style={styles.description}>{description}</Text>}
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Switch value={value} onValueChange={onValueChange} disabled={disabled} importantForAccessibility="no-hide-descendants" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  disabled: { opacity: 0.55 },
  copy: { flex: 1, gap: 2 },
  label: { ...textStyles.titleSmall, color: lightTokens.textPrimary },
  description: { ...textStyles.caption, color: lightTokens.textTertiary },
});

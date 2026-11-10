import { useState, type ComponentType } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound, type LucideProps } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { authColors, authFonts } from "./authTheme";
import { fontSizes } from "@/shared/theme/typography";
import { radii, iconStrokes, lightTokens } from "@/shared/theme/tokens";

type AuthFieldIcon = "user" | "mail" | "lock";

type AuthTextFieldProps = TextInputProps & {
  label: string;
  icon?: AuthFieldIcon;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

const icons: Record<AuthFieldIcon, ComponentType<LucideProps>> = {
  user: UserRound,
  mail: Mail,
  lock: LockKeyhole,
};

export function AuthTextField({
  label,
  icon = "user",
  error,
  hint,
  containerStyle,
  secureTextEntry,
  editable = true,
  onFocus,
  onBlur,
  ...inputProps
}: AuthTextFieldProps) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const Icon = icons[icon];
  const isSecure = Boolean(secureTextEntry);

  return (
    <View style={containerStyle}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error && styles.fieldError,
          !editable && styles.fieldDisabled,
        ]}
      >
        <Icon
          size={19}
          strokeWidth={iconStrokes.thin}
          color={focused ? authColors.ink : authColors.placeholder}
        />
        <TextInput
          {...inputProps}
          editable={editable}
          secureTextEntry={isSecure && !revealed}
          placeholderTextColor={authColors.placeholder}
          selectionColor={authColors.brand}
          cursorColor={authColors.brand}
          style={styles.input}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {isSecure ? (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={revealed ? t("common.hidePassword") : t("common.showPassword")}
          >
            {revealed ? (
              <EyeOff size={19} color={authColors.muted} />
            ) : (
              <Eye size={19} color={authColors.muted} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: authColors.ink,
    fontFamily: authFonts.medium,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    marginBottom: 7,
    letterSpacing: 0,
  },
  field: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: radii.md,
    paddingHorizontal: 15,
    backgroundColor: authColors.background,
  },
  fieldFocused: {
    borderColor: authColors.borderFocused,
  },
  fieldError: {
    borderColor: authColors.danger,
  },
  fieldDisabled: {
    backgroundColor: lightTokens.bgSubtle,
    opacity: 0.75,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: authColors.ink,
    fontFamily: authFonts.regular,
    fontSize: fontSizes.base,
    lineHeight: 21,
    letterSpacing: 0,
  },
  error: {
    color: authColors.danger,
    fontFamily: authFonts.regular,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    marginTop: 5,
    letterSpacing: 0,
  },
  hint: {
    color: authColors.muted,
    fontFamily: authFonts.regular,
    fontSize: fontSizes["2xs"],
    lineHeight: 15,
    marginTop: 5,
    letterSpacing: 0,
  },
});

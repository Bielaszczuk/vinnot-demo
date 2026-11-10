import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { SheetInputContext, SheetFieldFocusContext } from "./SheetInputContext";
/**
 * TextField & SearchField — form input components with animated focus ring.
 */
import { forwardRef, useContext, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
  type TextInputInstance,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Search, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { lightTokens, iconStrokes, radii } from "@/shared/theme/tokens";
import { textStyles, fontFamilies, fontSizes } from "@/shared/theme/typography";
import { shadows } from "@/shared/theme/shadows";
import { type ReactNode } from "react";

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
  required?: boolean;
}

/**
 * Gorhom types its input ref with React Native's legacy component type, but at runtime both
 * inputs hand over the same host instance.
 */
type SheetOrNativeInput = TextInputInstance | TextInput | null | undefined;
const asInputInstance = (input: SheetOrNativeInput) => (input ?? null) as TextInputInstance | null;

export const TextField = forwardRef<TextInputInstance, TextFieldProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      containerStyle,
      required,
      style,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const inSheet = useContext(SheetInputContext);
    const focusSheetField = useContext(SheetFieldFocusContext);
    const nativeInput = useRef<TextInputInstance | null>(null);
    const Input = inSheet ? BottomSheetTextInput : TextInput;
    const [focused, setFocused] = useState(false);
    const glowOpacity = useSharedValue(0);
    const borderAnim = useSharedValue(0);

    // Evaluate platform check outside the worklet — Platform.select() is not
    // worklet-compatible and running it on the UI thread causes a Hermes crash.
    const isIos = Platform.OS === "ios";

    const animatedBorderStyle = useAnimatedStyle(() => {
      const base = {
        borderColor:
          borderAnim.value === 1
            ? lightTokens.borderFocus
            : error
              ? lightTokens.danger
              : lightTokens.inputBorder,
      };
      if (!isIos) return base;
      return {
        ...base,
        shadowOpacity: glowOpacity.value,
        shadowColor: lightTokens.borderFocus,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      };
    });

    const handleFocus = (e: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
      setFocused(true);
      glowOpacity.value = withTiming(0.18, { duration: 200 });
      borderAnim.value = withTiming(1, { duration: 200 });
      focusSheetField(nativeInput.current);
      onFocus?.(e);
    };

    const handleBlur = (e: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
      setFocused(false);
      glowOpacity.value = withTiming(0, { duration: 150 });
      borderAnim.value = withTiming(0, { duration: 150 });
      focusSheetField(null);
      onBlur?.(e);
    };

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label && (
          <Text style={[styles.label, focused && styles.labelFocused]}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}
        <Animated.View
          style={[styles.inputContainer, !!error && styles.inputError, animatedBorderStyle]}
        >
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Input
            ref={(input: SheetOrNativeInput) => {
              const instance = asInputInstance(input);
              nativeInput.current = instance;
              if (typeof ref === "function") ref(instance);
              else if (ref) ref.current = instance;
            }}
            accessibilityLabel={label}
            accessibilityHint={[hint, error].filter(Boolean).join(". ") || undefined}
            style={[styles.input, leftIcon ? styles.inputWithLeftIcon : undefined, style]}
            placeholderTextColor={lightTokens.inputPlaceholder}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </Animated.View>
        {error ? (
          <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : null}
      </View>
    );
  },
);
TextField.displayName = "TextField";

// ─── SearchField ───────────────────────────────────────────────────────────────
interface SearchFieldProps extends Omit<TextInputProps, "style"> {
  onClear?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export function SearchField({
  onClear,
  containerStyle,
  inputStyle,
  value,
  ...props
}: SearchFieldProps) {
  const inSheet = useContext(SheetInputContext);
  const Input = inSheet ? BottomSheetTextInput : TextInput;
  const focusSheetField = useContext(SheetFieldFocusContext);
  const nativeInput = useRef<TextInputInstance | null>(null);
  const { t } = useTranslation();

  return (
    <View style={[styles.searchContainer, shadows.sm, containerStyle]}>
      <Search
        size={19}
        color={lightTokens.textTertiary}
        strokeWidth={iconStrokes.regular}
        accessibilityElementsHidden
      />
      <Input
        ref={(input: SheetOrNativeInput) => {
          nativeInput.current = asInputInstance(input);
        }}
        style={[styles.searchInput, inputStyle]}
        placeholderTextColor={lightTokens.inputPlaceholder}
        value={value}
        clearButtonMode="never"
        returnKeyType="search"
        {...props}
        onFocus={(event) => {
          focusSheetField(nativeInput.current);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          focusSheetField(null);
          props.onBlur?.(event);
        }}
      />
      {!!value && onClear && (
        <TouchableOpacity
          onPress={onClear}
          style={styles.clearBtn}
          accessibilityLabel={t("common.clearSearch")}
        >
          <X size={18} color={lightTokens.textTertiary} strokeWidth={iconStrokes.strong} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label: {
    ...textStyles.bodyMedium,
    color: lightTokens.textSecondary,
    fontSize: fontSizes.ui,
    lineHeight: 18,
    fontFamily: fontFamilies.medium,
    letterSpacing: 0,
  },
  labelFocused: { color: lightTokens.brandPrimary },
  required: { color: lightTokens.danger },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: lightTokens.inputBg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: lightTokens.inputBorder,
    minHeight: 48,
    overflow: "hidden",
  },
  inputError: { borderColor: lightTokens.danger },

  input: {
    flex: 1,
    fontFamily: textStyles.bodyMedium.fontFamily,
    fontSize: fontSizes.base,
    lineHeight: 20,
    letterSpacing: 0,
    color: lightTokens.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  inputWithLeftIcon: { paddingLeft: 8 },

  iconLeft: { paddingLeft: 14 },
  iconRight: { paddingRight: 14 },

  error: { ...textStyles.caption, color: lightTokens.danger, lineHeight: 17 },
  hint: { ...textStyles.caption, color: lightTokens.textTertiary, lineHeight: 17 },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: lightTokens.inputBg,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    gap: 10,
    height: 48,
    borderWidth: 1,
    borderColor: lightTokens.inputBorder,
  },
  searchInput: {
    flex: 1,
    ...textStyles.bodyMedium,
    color: lightTokens.textPrimary,
  },
  clearBtn: { padding: 4 },
});

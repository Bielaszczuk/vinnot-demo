import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet } from "react-native";
import { Button } from "@/presentation/components/ui/Button";

type AuthButtonProps = {
  children: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline";
  style?: StyleProp<ViewStyle>;
};

/** The auth screens' call to action: the shared large `Button`, always full width. */
export function AuthButton({ children, onPress, loading = false, disabled = false, variant = "primary", style }: AuthButtonProps) {
  return (
    <Button
      variant={variant}
      size="lg"
      fullWidth
      loading={loading}
      disabled={disabled}
      onPress={onPress}
      style={StyleSheet.flatten(style) ?? undefined}
    >
      {children}
    </Button>
  );
}

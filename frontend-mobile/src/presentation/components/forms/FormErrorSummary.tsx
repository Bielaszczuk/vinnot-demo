import { StyleSheet, Text, View } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { lightTokens, radii, spacing } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

/** Banner above a form that failed validation; the sections with errors open themselves. */
export function FormErrorSummary({ message }: { message: string }) {
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <AlertCircle size={18} color={lightTokens.dangerText} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2.5],
    padding: spacing[3],
    borderRadius: radii.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: lightTokens.dangerBorder,
    backgroundColor: lightTokens.dangerLight,
  },
  text: { ...textStyles.bodySmall, flex: 1, color: lightTokens.dangerText },
});

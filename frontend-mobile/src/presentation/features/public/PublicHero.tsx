import { StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { ImageWithFallback } from "@/presentation/components/ui/ImageWithFallback";
import { illustrations } from "@/shared/illustrations";
import { editorial, lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

export function PublicHero({ eyebrow, title, summary, image = "legal", children }: {
  eyebrow: string; title: string; summary: string; image?: "legal" | "privacy" | "winery"; children?: ReactNode;
}) {
  return <View style={styles.hero}>
    <Text style={styles.eyebrow}>VINNOT · {eyebrow}</Text>
    <ImageWithFallback fallbackSource={illustrations[image]} style={styles.art} />
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <View style={styles.rule}><View style={styles.accent} /></View>
    <Text style={styles.summary}>{summary}</Text>
    {children}
  </View>;
}
const styles = StyleSheet.create({
  hero: { backgroundColor: lightTokens.surfacePaper, borderWidth: 1, borderColor: lightTokens.borderSoft, borderRadius: radii["3xl"], padding: 24, gap: 18 },
  eyebrow: { ...textStyles.caption, color: editorial.brand, letterSpacing: 1.6, textTransform: "uppercase" },
  art: { width: "100%", height: 190, borderRadius: radii["2xl"] },
  title: { ...textStyles.headingLarge, color: lightTokens.textPrimary },
  rule: { height: 1, backgroundColor: lightTokens.borderStrong, width: 140, marginVertical: 4 },
  accent: { height: 1, backgroundColor: editorial.brand, width: 45 },
  summary: { ...textStyles.bodyMedium, color: lightTokens.textSecondary, lineHeight: 27 },
});

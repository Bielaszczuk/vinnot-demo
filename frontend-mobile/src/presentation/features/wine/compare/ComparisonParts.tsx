/**
 * ComparisonParts — small building blocks shared by the comparison sections.
 */
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Card } from "@/presentation/components/ui/Card";
import { radii } from "@/shared/theme/tokens";
import { sectionStyles as styles, WINE_TINTS } from "./compareSections.styles";

export type WineSide = "A" | "B";

export interface WineNames {
  wineAName: string;
  wineBName: string;
}

export function wineNameFor(side: WineSide, names: WineNames): string {
  return side === "A" ? names.wineAName : names.wineBName;
}

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card radius={radii["2xl"]} elevation="sm" style={styles.card}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card>
  );
}

export function Callout({ eyebrow, text }: { eyebrow: string; text: string }) {
  return (
    <Card radius={radii["2xl"]} elevation="none" style={styles.callout}>
      <Text accessibilityRole="header" style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.calloutText}>{text}</Text>
    </Card>
  );
}

export function WinePill({ label, tint }: { label: string; tint: keyof typeof WINE_TINTS }) {
  const { bg, text, border } = WINE_TINTS[tint];
  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: border }]}>
      <Text numberOfLines={1} style={[styles.pillText, { color: text }]}>{label}</Text>
    </View>
  );
}

export function TagRow({ tags, tint }: { tags: string[]; tint: WineSide }) {
  const { bg, text, border } = WINE_TINTS[tint];
  return (
    <View style={styles.tagRow}>
      {tags.map((tag) => (
        <View key={tag} style={[styles.pill, { backgroundColor: bg, borderColor: border }]}>
          <Text style={[styles.tagText, { color: text }]}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

export function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export function DetailItem({ title, detail, shared = false }: { title: string; detail?: string; shared?: boolean }) {
  return (
    <View style={[styles.item, shared && styles.itemSharedBorder]}>
      <Text style={styles.fieldValue}>{title}</Text>
      {!!detail && <Text style={styles.bodyText}>{detail}</Text>}
    </View>
  );
}

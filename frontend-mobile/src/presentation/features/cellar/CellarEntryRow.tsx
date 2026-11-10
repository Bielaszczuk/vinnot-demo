/**
 * CellarEntryRow — swipeable cellar entry row. Its actions live in a three-dots
 * menu on the right; swiping left still deletes the entry.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WineGlassIcon } from "@/presentation/components/ui/WineGlassIcon";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { WineImage } from "@/presentation/features/wine/WineImage";
import { wineTypeLabel } from "@/presentation/features/wine/wineTypeLabel";
import { RatingGlasses } from "@/presentation/features/wine/rating/RatingGlasses";
import { toWineType } from "@/domain/wine/wine.types";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { VintagePill } from "@/presentation/components/ui/VintagePill";
import { shadows } from "@/shared/theme/shadows";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import type { CellarEntry } from "@/domain/cellar/cellar.types";
import { formatAddedDate, formatCurrency } from "./cellarPresentation";
import { CellarEntryActionsMenu } from "./CellarEntryActionsMenu";
import { fontSizes } from "@/shared/theme/typography";
import { radii } from "@/shared/theme/tokens";

interface CellarEntryRowProps {
  entry: CellarEntry;
  onPress: () => void;
  onEdit: () => void;
  onPublishReview: () => void;
  onDelete: () => void;
}

export function CellarEntryRow({ entry, onPress, onEdit, onPublishReview, onDelete }: CellarEntryRowProps) {
  const { t, i18n } = useTranslation();
  const wineInfo = entry.wine;

  return (
    <Swipeable
      renderRightActions={() => (
        <DeleteAction onPress={onDelete} label={t("cellar.removeEntry", { name: entry.wine.name })} />
      )}
    >
      <MotionPressable onPress={onPress} style={styles.card}>
        <View style={styles.imageBox}>
          <WineImage
            uri={wineInfo.imageUrl} wineType={wineInfo.type}
            alt={wineInfo.name}
            style={styles.image}
            containerStyle={styles.image}
            contentFit="contain"
          />
        </View>

        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.titleBlock}>
              <Text numberOfLines={2} style={styles.name}>
                {wineInfo.vintage ? `${wineInfo.name} ${wineInfo.vintage}` : wineInfo.name}
              </Text>
              <Text numberOfLines={1} style={styles.winery}>
                {wineInfo.winery}{wineInfo.type ? ` · ${wineTypeLabel(t, wineInfo.type)}` : ""}
              </Text>
            </View>
            <CellarEntryActionsMenu
              wineName={wineInfo.name}
              hasReview={!!entry.reviewId}
              onEdit={onEdit}
              onReview={onPublishReview}
              onOpenWine={onPress}
              onDelete={onDelete}
            />
          </View>

          <Text style={styles.privateLabel}>{t("cellar.privateNotes")}</Text>
          <View style={styles.metaRow}>
            {entry.rating ? (
              <RatingGlasses rating={entry.rating} wineType={toWineType(entry.wine.type)} size={26} showLabel />
            ) : (
              <View style={styles.unrated}>
                <WineGlassIcon fill={0} size={12} />
                <Text style={styles.unratedText}>{t("cellar.unrated")}</Text>
              </View>
            )}
            {entry.vintage != null && <VintagePill year={entry.vintage} style={styles.vintagePill} />}
          </View>

          {!!entry.notes && <Text numberOfLines={2} style={styles.notes}>“{entry.notes}”</Text>}

          <View style={styles.footer}>
            <Text style={styles.price}>{formatCurrency(entry.purchasePrice, i18n?.language)}</Text>
            <Text style={styles.added}>{t("cellar.added")} {formatAddedDate(entry.addedAt, i18n?.language)}</Text>
          </View>
        </View>
      </MotionPressable>
    </Swipeable>
  );
}

function DeleteAction({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} style={styles.deleteAction} accessibilityRole="button" accessibilityLabel={label}>
      <Trash2 size={20} color={vinnotColors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: vinnotColors.border,
    borderRadius: radii["2xl"],
    backgroundColor: vinnotColors.surface,
    ...shadows.sm,
  },
  imageBox: {
    width: 104,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    backgroundColor: vinnotColors.brandSoft,
  },
  image: { width: "100%", height: 132 },
  body: { flex: 1, gap: 8, padding: 14 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  privateLabel: { fontFamily: vinnotFonts.medium, fontSize: fontSizes["2xs"], color: vinnotColors.muted },
  titleBlock: { flex: 1 },
  name: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.lg,
    lineHeight: 23,
    color: vinnotColors.ink,
  },
  winery: {
    marginTop: 2,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    color: vinnotColors.muted,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  vintagePill: { alignSelf: "center" },
  unrated: { flexDirection: "row", alignItems: "center", gap: 5 },
  unratedText: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.meta,
    color: vinnotColors.muted,
  },
  notes: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: vinnotColors.muted,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: vinnotColors.borderSoft,
    paddingTop: 8,
  },
  price: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.xs,
    color: vinnotColors.ink,
  },
  added: {
    flex: 1,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes["2xs"],
    color: vinnotColors.muted,
    textAlign: "right",
  },
  deleteAction: {
    width: 76,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    borderRadius: radii["2xl"],
    backgroundColor: vinnotColors.danger,
  },
});

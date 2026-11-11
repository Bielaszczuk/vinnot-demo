/**
 * ProfileCellarList — the wines of a visible cellar on a public profile: wine, vintage
 * and rating only (never notes or purchase price).
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Wine as WineIcon } from "lucide-react-native";
import type { PublicCellarWine } from "@/domain/social/social.types";
import { Button } from "@/presentation/components/ui/Button";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { VintagePill } from "@/presentation/components/ui/VintagePill";
import { RatingGlasses } from "@/presentation/features/wine/rating/RatingGlasses";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

interface CellarListState {
  items: PublicCellarWine[];
  isLoading: boolean;
  isFetching: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

export function ProfileCellarList({
  list,
  onWinePress,
}: {
  list: CellarListState;
  onWinePress: (wineId: string) => void;
}) {
  const { t } = useTranslation();
  if (list.isLoading) return <Skeleton height={140} radius={radii.lg} />;
  if (list.items.length === 0) return <Text style={styles.empty}>{t("social.cellarEmpty")}</Text>;
  return (
    <View style={styles.list}>
      {list.items.map((item) => (
        <Pressable
          key={item.id}
          style={styles.row}
          onPress={() => onWinePress(item.wine.id)}
          accessibilityRole="link"
          accessibilityLabel={item.wine.name}
        >
          <View style={styles.image}>
            {item.wine.imageUrl ? (
              <Image source={{ uri: item.wine.imageUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
            ) : (
              <WineIcon size={18} color={lightTokens.textTertiary} />
            )}
          </View>
          <View style={styles.text}>
            <Text style={styles.name} numberOfLines={1}>
              {item.wine.name}
            </Text>
            {item.wine.wineryName ? (
              <Text style={styles.winery} numberOfLines={1}>
                {item.wine.wineryName}
              </Text>
            ) : null}
            {item.vintage != null ? <VintagePill year={item.vintage} /> : null}
          </View>
          {item.rating != null ? <RatingGlasses rating={item.rating} wineType={item.wine.type} size={20} /> : null}
        </Pressable>
      ))}
      {list.hasMore ? (
        <Button variant="ghost" size="sm" loading={list.isFetching} onPress={list.loadMore}>
          {t("social.loadMore")}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  image: {
    width: 40,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
    backgroundColor: lightTokens.bgMuted,
    overflow: "hidden",
  },
  text: { flex: 1, minWidth: 0, gap: 3, alignItems: "flex-start" },
  name: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
  winery: { ...textStyles.caption, color: lightTokens.textSecondary },
  empty: { ...textStyles.bodySmall, color: lightTokens.textTertiary, textAlign: "center", paddingVertical: 16 },
});

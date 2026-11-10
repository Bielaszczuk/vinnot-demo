import { CELLAR_ROUTE, createWineryDetailRoute } from "@/presentation/navigation/discoveryNavigation";
/**
 * Wine Detail Screen — connected detail tabs.
 */
import { useState } from "react";
import { hasTasteScores, wineQuickInfo } from "@/domain/wine/wine.quick-info";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BookOpenText,
  Check,
  ClipboardList,
  GitCompareArrows,
  Plus,
  Share2,
  SquarePen,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";
import { Badge } from "@/presentation/components/ui/Atoms";
import { RatingGlasses } from "@/presentation/features/wine/rating/RatingGlasses";
import { ModalScreenSheetHost } from "@/presentation/components/ui/BottomSheet";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { EmptyState, Spinner } from "@/presentation/components/ui/Feedback";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { retryableLoadError } from "@/presentation/feedback/illustratedState";
import { WineImage } from "@/presentation/features/wine/WineImage";
import { CellarAddSheet } from "@/presentation/features/cellar";
import { AiProfileSections, ReviewsList, WineTasteProfile } from "@/presentation/features/wine";
import { ReviewFormSheet } from "@/presentation/features/wine/ReviewFormSheet";
import type { WineReview } from "@/domain/wine/wine.types";
import {
  useAiProfileStatus,
  useAiWineProfile,
  useWineDetail,
} from "@/presentation/hooks/queries/wine/useWines";
import { useCellar } from "@/presentation/hooks/queries/cellar";
import { useDetailViewTracking } from "@/presentation/hooks/useDetailViewTracking";
import { useShareLink } from "@/presentation/hooks/useShareLink";
import { useAuth } from "@/presentation/hooks/useAuth";
import {
  exitWineDetail,
  isOpenedFromWineScanner,
  opensWineReviewsTab,
} from "@/presentation/navigation/wineNavigation";
import { useWineReviewFocus, useWineReviewShortcut } from "@/presentation/hooks/ui/useWineReviewFocus";
import { layout, radii, spacing } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { BackButton } from "@/presentation/components/ui/BackButton";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { fontSizes } from "@/shared/theme/typography";

export default function WineDetailScreen() {
  const { id, returnTo, scanReturnTo, review, tab: tabParam } = useLocalSearchParams<{
    id: string;
    returnTo?: string;
    scanReturnTo?: string | string[];
    review?: string;
    tab?: string;
  }>();
  const router = useRouter();
  const shareLink = useShareLink();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { formatRating } = useFormatters();
  const { tab, setTab, focusOwnReview, scrollRef, onSectionLayout, onOwnReviewLayout, focusReviews } =
    useWineReviewFocus(id, review === "mine", opensWineReviewsTab(tabParam));
  // The review sheet writes a new review (review null) or edits the reader's own one.
  const [reviewSheet, setReviewSheet] = useState<{ review: WineReview | null } | null>(null);
  const reviewShortcut = useWineReviewShortcut(id, focusReviews, () => setReviewSheet({ review: null }));
  const [cellarSheetOpen, setCellarSheetOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const wineQuery = useWineDetail(id);
  useDetailViewTracking("WINE", id);
  const cellarQuery = useCellar({ enabled: isAuthenticated });
  const aiProfileStatusQuery = useAiProfileStatus(id);
  const aiProfileQuery = useAiWineProfile(id, tab === "ai");
  const wine = wineQuickInfo(wineQuery.data, i18n.language);
  const cellarEntries = cellarQuery.data ?? [];
  const aiProfileStatus = aiProfileStatusQuery.data;
  const aiProfile = aiProfileQuery.data;
  const isLoading = wineQuery.isLoading;
  const isAiLoading = aiProfileQuery.isLoading;
  const isInCellar = cellarEntries.some((entry) => entry.wine.id === id);
  const openWinery = (wineryId: string | null) => {
    if (wineryId) router.push(createWineryDetailRoute(wineryId));
  };
  const aiProfileExists = aiProfileStatus?.status === "GENERATED";
  const isRefreshing =
    wineQuery.isFetching ||
    cellarQuery.isFetching ||
    aiProfileStatusQuery.isFetching ||
    aiProfileQuery.isFetching;

  const refreshWine = () => {
    void Promise.all([
      wineQuery.refetch(),
      aiProfileStatusQuery.refetch(),
      ...(isAuthenticated ? [cellarQuery.refetch()] : []),
      ...(tab === "ai" ? [aiProfileQuery.refetch()] : []),
    ]);
  };

  const goBack = () => exitWineDetail(router, { returnTo, scanReturnTo });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Spinner size="lg" />
      </View>
    );
  }

  if (!wine) {
    const loadError = retryableLoadError(wineQuery.isError, wineQuery.error);
    return (
      <View style={styles.centered}>
        {loadError ? (
          <>
            <QueryErrorState error={loadError} onRetry={() => void wineQuery.refetch()} />
            <Button variant="ghost" onPress={goBack}>{t("common.back")}</Button>
          </>
        ) : (
          <EmptyState
            illustration="noWines"
            title={t("wineDetails.notFound")}
            action={{ label: t("common.back"), onPress: goBack }}
          />
        )}
      </View>
    );
  }

  return (
    <ModalScreenSheetHost inModal={isOpenedFromWineScanner(scanReturnTo)}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 32 }]}
        refreshControl={<BrandRefreshControl refreshing={isRefreshing} onRefresh={refreshWine} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={goBack} />

        <Card padding={0} radius={radii.md} style={styles.heroCard}>
          <View style={styles.imageArea}>
            <WineImage
              uri={wine.imageUrl ?? wine.bottleImageUrl}
              wineType={wine.type}
              alt={wine.name}
              style={styles.image}
              containerStyle={styles.imageFallback}
            />
          </View>
          <View style={styles.heroInfo}>
            <View style={styles.badges}>
              <Badge label={t(`wines.types.${wine.type}`, wine.type)} variant="brand" />
              {!!wine.vintage && <Badge label={String(wine.vintage)} />}
            </View>
            <Text style={styles.name}>{wine.name}</Text>
            {!!wine.grapeVarieties.length && (
              <Text style={styles.grapes}>{wine.grapeVarieties.join(" · ")}</Text>
            )}
            {wine.wineryId ? (
              <Text
                accessibilityRole="link"
                style={[styles.location, styles.wineryLink]}
                onPress={() => openWinery(wine.wineryId)}
              >
                {wine.winery}
              </Text>
            ) : (
              <Text style={styles.location}>{wine.winery}</Text>
            )}
            <Text style={styles.location}>
              {[wine.region, wine.country].filter(Boolean).join(", ")}
            </Text>

            <View style={styles.ratingRow}>
              {wine.reviewCount > 0 && wine.rating != null ? (
                <>
                  <Text style={styles.ratingNumber}>{formatRating(wine.rating)}</Text>
                  <RatingGlasses rating={wine.rating} wineType={wine.type} size={34} />
                  <Text style={styles.ratingMeta}>
                    {t("wineDetails.ratingCount", { count: wine.reviewCount })}
                  </Text>
                </>
              ) : (
                <Text style={styles.ratingMeta}>{t("wineDetails.noRatings")}</Text>
              )}
            </View>

            {/* 2x2 grid: the two primary actions first, the two sharing tools below, all equal width. */}
            <View style={styles.heroActions}>
              <View style={styles.heroActionRow}>
                <Button
                  size="sm"
                  variant={isInCellar ? "secondary" : "primary"}
                  style={styles.heroAction}
                  leftIcon={
                    isInCellar ? (
                      <Check size={16} color={vinnotColors.brand} />
                    ) : (
                      <Plus size={16} color={vinnotColors.white} />
                    )
                  }
                  onPress={() => {
                    if (isInCellar) {
                      router.push(CELLAR_ROUTE);
                      return;
                    }
                    if (!isAuthenticated) {
                      router.push("/(auth)/login");
                      return;
                    }
                    setCellarSheetOpen(true);
                  }}
                >
                  {isInCellar
                    ? t("wines.inCellar")
                    : t("wineDetails.addToCellar")}
                </Button>
                <Button variant="outline" size="sm" style={styles.heroAction}
                  leftIcon={<SquarePen size={16} color={vinnotColors.brand} />} onPress={reviewShortcut.open}>
                  {reviewShortcut.hasOwnReview ? t("reviews.yourReview") : t("reviews.writeReview")}
                </Button>
              </View>
              <View style={styles.heroActionRow}>
                <Button variant="outline" size="sm" style={styles.heroAction}
                  leftIcon={<Share2 size={16} color={vinnotColors.brand} />}
                  onPress={() => { void shareLink({ kind: "wines", id: wine.id, title: wine.name }); }}>
                  {t("common.share")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  style={styles.heroAction}
                  leftIcon={<GitCompareArrows size={16} color={vinnotColors.brand} />}
                  onPress={() => {
                    router.push({
                      pathname: "/(app)/(tabs)/wines/compare",
                      params: { wineAId: wine.id },
                    });
                  }}
                >
                  {t("wines.compare")}
                </Button>
              </View>
            </View>
          </View>
        </Card>

        <Card style={styles.aiCallout} elevation="none" radius={radii.md}>
          <View style={styles.aiIcon}>
            <BookOpenText size={20} color={vinnotColors.brand} />
          </View>
          <View style={styles.aiText}>
            <Text style={styles.aiTitle}>{t("wineDetails.aiSommelier")}</Text>
            <Text style={styles.aiDescription}>{t("wineDetails.consultAi")}</Text>
          </View>
          <Button
            variant={aiProfileExists ? "secondary" : "primary"}
            size="sm"
            leftIcon={
              <ClipboardList
                size={15}
                color={aiProfileExists ? vinnotColors.brand : vinnotColors.white}
              />
            }
            onPress={() =>
              router.push({
                pathname: "/(app)/(tabs)/wines/[id]/ai-profile",
                params: {
                  id: wine.id,
                  ...(aiProfileExists ? {} : { generate: "1" }),
                },
              })
            }
          >
            {aiProfileExists
              ? t("wineDetails.viewProfile")
              : t("wineDetails.generateProfile", "Generar perfil")}
          </Button>
        </Card>

        <View style={styles.tabs}>
          {(["info", "reviews", "ai"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              style={[styles.tab, tab === item && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
                {t(`wines.tabs.${item}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === "info" && (
          <View style={styles.sectionStack}>
            {!!wine.description && (
              <Card radius={radii.md} style={styles.infoCard}>
                <Text style={styles.sectionEyebrow}>{t("wines.description")}</Text>
                <Text style={styles.description}>{wine.description}</Text>
              </Card>
            )}
            <Card radius={radii.md} style={styles.infoCard}>
              <Text style={styles.sectionEyebrow}>{t("wineDetails.wineInfo")}</Text>
              <InfoLine
                label={t("wines.winery")}
                value={wine.winery}
                onPress={wine.wineryId ? () => openWinery(wine.wineryId) : undefined}
              />
              <InfoLine label={t("wines.grapeVariety")} value={wine.grapeVarieties.join(", ")} />
              <InfoLine
                label={t("wines.region")}
                value={[wine.country, wine.region].filter(Boolean).join(" / ")}
              />
              <InfoLine
                label={t("wineDetails.alcohol")}
                value={wine.alcoholContent ? `${wine.alcoholContent}%` : ""}
              />
            </Card>
            {hasTasteScores(wine) && (
              <Card radius={radii.md} style={styles.infoCard}>
                <Text style={styles.sectionEyebrow}>{t("wineDetails.tasteProfile")}</Text>
                <WineTasteProfile wine={wine} />
              </Card>
            )}
            {!!wine.foodPairing && (
              <Card radius={radii.md} style={styles.infoCard}>
                <Text style={styles.sectionEyebrow}>{t("wines.foodPairings")}</Text>
                <Text style={styles.description}>{wine.foodPairing}</Text>
              </Card>
            )}
          </View>
        )}

        {tab === "reviews" && <View testID="wine-reviews-section" onLayout={onSectionLayout}>
          <ReviewsList wineId={wine.id} focusOwnReview={focusOwnReview} onOwnReviewLayout={onOwnReviewLayout}
            wineType={wine.type} onWriteReview={() => setReviewSheet({ review: null })}
            onEditReview={(ownReview) => setReviewSheet({ review: ownReview })} />
        </View>}
        {tab === "ai" && <AiProfileSections profile={aiProfile} isLoading={isAiLoading} />}

        <ReviewFormSheet
          wineId={wine.id}
          review={reviewSheet?.review}
          visible={!!reviewSheet}
          onClose={() => setReviewSheet(null)}
        />
        <CellarAddSheet
          visible={cellarSheetOpen}
          initialWine={wine}
          onClose={() => setCellarSheetOpen(false)}
        />
      </KeyboardAwareScrollView>
    </ModalScreenSheetHost>
  );
}

function InfoLine({ label, value, onPress }: { label: string; value?: string | null; onPress?: () => void }) {
  if (!value) return null;
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      {onPress ? (
        <Text accessibilityRole="link" style={[styles.infoValue, styles.wineryLink]} onPress={onPress}>
          {value}
        </Text>
      ) : (
        <Text style={styles.infoValue}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vinnotColors.canvas },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vinnotColors.canvas,
  },
  content: {
    paddingHorizontal: layout.screenHorizontalPadding,
    gap: 20,
  },
  heroCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    backgroundColor: vinnotColors.surface,
  },
  imageArea: {
    height: 270,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vinnotColors.brandSoft,
  },
  image: { width: "82%", height: "90%" },
  imageFallback: { width: "100%", height: "100%" },
  heroInfo: { gap: 10, padding: 20, backgroundColor: vinnotColors.surface },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  name: {
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes["3xl"],
    lineHeight: 33,
    color: vinnotColors.ink,
  },
  grapes: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.base,
    color: vinnotColors.brand,
  },
  wineryLink: { color: vinnotColors.brand, textDecorationLine: "underline" },
  location: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.ui,
    lineHeight: 20,
    color: vinnotColors.muted,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  ratingNumber: {
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes.lg,
    color: vinnotColors.ink,
  },
  ratingMeta: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    color: vinnotColors.muted,
  },
  heroActions: { gap: spacing[2.5], marginTop: spacing[1.5] },
  heroActionRow: { flexDirection: "row", gap: spacing[2.5] },
  // Equal halves; a tighter inset keeps the longest label ("Agregar a Bodega") on one line.
  heroAction: { flex: 1, paddingHorizontal: spacing[2.5], gap: spacing[1.5] },
  aiCallout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    backgroundColor: vinnotColors.brandSoft,
  },
  aiIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: vinnotColors.brandTint,
    backgroundColor: vinnotColors.surface,
  },
  aiText: { flex: 1 },
  aiTitle: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.ui,
    color: vinnotColors.ink,
  },
  aiDescription: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: vinnotColors.muted,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    borderRadius: radii.full,
    padding: 4,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    backgroundColor: vinnotColors.brandSoft,
  },
  tab: { flex: 1, alignItems: "center", borderRadius: radii.full, paddingVertical: 10 },
  tabActive: {
    backgroundColor: vinnotColors.surface,
    shadowColor: vinnotColors.brandDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 1,
  },
  tabText: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.sm,
    color: vinnotColors.muted,
  },
  tabTextActive: { color: vinnotColors.brand },
  sectionStack: { gap: 14 },
  infoCard: {
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    backgroundColor: vinnotColors.surface,
  },
  sectionEyebrow: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.xs,
    letterSpacing: 0,
    textTransform: "uppercase",
    color: vinnotColors.brand,
    marginBottom: 10,
  },
  description: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.ui,
    lineHeight: 22,
    color: vinnotColors.muted,
  },
  infoLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: vinnotColors.border,
    paddingVertical: 10,
  },
  infoLabel: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    color: vinnotColors.muted,
  },
  infoValue: {
    flex: 1,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.sm,
    color: vinnotColors.ink,
    textAlign: "right",
  },
});

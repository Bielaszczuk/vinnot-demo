import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { BookMarked, CalendarDays, MapPinned, ScanLine, Wine } from "lucide-react-native";
import type { Event } from "@/domain/event/event.types";
import type { WineRoute } from "@/domain/route/route.types";
import type { WineSummary } from "@/domain/wine/wine.types";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { useImageTransition } from "@/presentation/components/ui/motion/reducedMotion";
import { VinnotBrand } from "@/presentation/features/auth";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import HeroImage from "../../../../assets/images/common/main.webp";
import { SCREEN_BG, styles } from "./HomeScreenView.styles";
import {
  FeatureCard,
  GlassHeroButton,
  GrapePill,
  HomeCtaBanner,
  HomeEventsSection,
  HomeFeaturedWinesSection,
  HomeRoutesSection,
  POPULAR_GRAPES,
  PrimaryHeroButton,
  SectionTitle,
  WINE_TYPE_CARDS,
  type WineTypeKey,
} from "./HomeScreenView.parts";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { FocusAwareStatusBar } from "@/presentation/components/layout/FocusAwareStatusBar";
import { iconStrokes } from "@/shared/theme/tokens";

type HomeScreenViewProps = {
  insetsTop: number;
  isAuthenticated: boolean;
  winesLoading: boolean;
  winesError?: unknown;
  onRetryWines?: () => void;
  eventsError?: unknown;
  onRetryEvents?: () => void;
  routesError?: unknown;
  onRetryRoutes?: () => void;
  featuredWines: WineSummary[];
  eventsLoading: boolean;
  homeEvents: Event[];
  routesLoading: boolean;
  routes: WineRoute[];
  refreshing: boolean;
  onRefresh: () => void;
  onExploreWines: () => void;
  onScanWine: () => void;
  onCellar: () => void;
  onRegister: () => void;
  onWineTypePress: (key: WineTypeKey) => void;
  onGrapePress: (grape: string) => void;
  onCtaPress: () => void;
  onSeeAllWines: () => void;
  onWinePress: (id: string) => void;
  /** Opens a featured wine straight on its reviews from the card's review count. */
  onWineReviewsPress?: (id: string) => void;
  onSeeAllEvents: () => void;
  onEventPress: (id: string) => void;
  onSeeAllRoutes: () => void;
  onRoutePress: (id: string) => void;
};

export function HomeScreenView({
  insetsTop,
  isAuthenticated,
  winesLoading,
  winesError,
  onRetryWines,
  eventsError,
  onRetryEvents,
  routesError,
  onRetryRoutes,
  featuredWines,
  eventsLoading,
  homeEvents,
  routesLoading,
  routes,
  refreshing,
  onRefresh,
  onExploreWines,
  onScanWine,
  onCellar,
  onRegister,
  onWineTypePress,
  onGrapePress,
  onCtaPress,
  onSeeAllWines,
  onWinePress,
  onWineReviewsPress,
  onSeeAllEvents,
  onEventPress,
  onSeeAllRoutes,
  onRoutePress,
}: HomeScreenViewProps) {
  const { t } = useTranslation();
  const typeImageTransition = useImageTransition(180);

  return (
    <>
      {/* The hero is dark under the status bar: light content while Home is focused. */}
      <FocusAwareStatusBar style="light" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: 36 }]}
        refreshControl={<BrandRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.hero}>
          <View style={styles.heroImage}>
            <Image
              source={HeroImage}
              contentFit="cover"
              allowDownscaling
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={["rgba(23,23,23,0.24)", "rgba(68,11,30,0.48)", "rgba(68,11,30,0.88)"]}
              style={[styles.heroOverlay, { paddingTop: insetsTop + 18 }]}
            >
              <Animated.View entering={FadeInDown.duration(550).delay(60)} style={styles.brandRow}>
                <VinnotBrand compact color={vinnotColors.white} />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(700).delay(140)} style={styles.heroCopy}>
                <Text style={styles.heroTitle}>
                  {t("home.heroTitle")}
                  {"\n"}
                  <Text style={styles.heroTitleHighlight}>{t("home.heroTitleHighlight")}</Text>
                </Text>
                <Text style={styles.heroDescription}>{t("home.heroDescription")}</Text>
              </Animated.View>

              <View style={styles.ctaStack}>
                <Animated.View
                  entering={FadeInDown.duration(700).delay(280)}
                  style={styles.heroButtonWrap}
                >
                  <GlassHeroButton
                    label={t("home.exploreWines")}
                    icon={<Wine size={20} color={vinnotColors.white} strokeWidth={iconStrokes.regular} />}
                    onPress={onExploreWines}
                  />
                </Animated.View>
                <Animated.View
                  entering={FadeInDown.duration(700).delay(360)}
                  style={styles.heroButtonWrap}
                >
                  <PrimaryHeroButton
                    label={t("home.scanWine")}
                    icon={<ScanLine size={19} color={vinnotColors.brandDeep} strokeWidth={iconStrokes.regular} />}
                    onPress={onScanWine}
                  />
                </Animated.View>
                <Animated.View
                  entering={FadeInDown.duration(700).delay(440)}
                  style={styles.heroButtonWrap}
                >
                  {isAuthenticated ? (
                    <GlassHeroButton
                      label={t("home.cellarCta")}
                      icon={<BookMarked size={19} color={vinnotColors.white} strokeWidth={iconStrokes.regular} />}
                      onPress={onCellar}
                    />
                  ) : (
                    <GlassHeroButton label={t("home.getStartedFree")} onPress={onRegister} />
                  )}
                </Animated.View>
              </View>
            </LinearGradient>
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(250,250,250,0)", SCREEN_BG]}
              style={styles.heroBottomFade}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(120)} style={styles.section}>
          <SectionTitle>{t("home.exploreByType")}</SectionTitle>
          <View style={styles.typeGrid}>
            {WINE_TYPE_CARDS.map((item, index) => (
              <Animated.View
                key={item.key}
                entering={FadeInDown.duration(420).delay(180 + index * 70)}
                style={styles.typeCardWrap}
              >
                <MotionPressable
                  onPress={() => onWineTypePress(item.key)}
                  style={styles.typePressable}
                  pressedScale={0.97}
                  accessibilityRole="button"
                  accessibilityLabel={t(`wines.types.${item.key}`)}
                >
                  <View style={styles.typeCardSurface}>
                    <View style={styles.typeIcon}>
                      <Image
                        source={item.image}
                        style={styles.typeImage}
                        contentFit="contain"
                        transition={typeImageTransition}
                      />
                    </View>
                    <Text style={styles.typeLabel}>{t(`wines.types.${item.key}`)}</Text>
                  </View>
                </MotionPressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(180)} style={styles.section}>
          <SectionTitle>{t("home.popularGrapes")}</SectionTitle>
          <View style={styles.grapeWrap}>
            {POPULAR_GRAPES.map((grape, index) => (
              <Animated.View
                key={grape}
                entering={FadeInDown.duration(360).delay(220 + index * 32)}
                style={styles.grapePillWrap}
              >
                <MotionPressable
                  onPress={() => onGrapePress(grape)}
                  style={styles.grapePressable}
                  pressedScale={0.965}
                  accessibilityRole="button"
                  accessibilityLabel={grape}
                >
                  <GrapePill grape={grape} />
                </MotionPressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(220)} style={styles.section}>
          <SectionTitle>{t("home.featuresTitle")}</SectionTitle>
          <Text style={styles.sectionSubtitle}>{t("home.featuresSubtitle")}</Text>
          <View style={styles.featureGrid}>
            <FeatureCard
              delay={0}
              icon={<Wine size={27} color={vinnotColors.brand} strokeWidth={iconStrokes.regular} />}
              title={t("home.featureDiscover")}
              description={t("home.featureDiscoverDesc")}
              onPress={onExploreWines}
            />
            <FeatureCard
              delay={70}
              icon={<ScanLine size={27} color={vinnotColors.brand} strokeWidth={iconStrokes.regular} />}
              title={t("home.featureScan")}
              description={t("home.featureScanDesc")}
              onPress={onScanWine}
            />
            <FeatureCard
              delay={140}
              icon={<CalendarDays size={27} color={vinnotColors.brand} strokeWidth={iconStrokes.regular} />}
              title={t("home.featureEvents")}
              description={t("home.featureEventsDesc")}
              onPress={onSeeAllEvents}
            />
            <FeatureCard
              delay={210}
              icon={<MapPinned size={27} color={vinnotColors.brand} strokeWidth={iconStrokes.regular} />}
              title={t("home.featureRoutes")}
              description={t("home.featureRoutesDesc")}
              onPress={onSeeAllRoutes}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(560).delay(260)} style={styles.section}>
          <HomeCtaBanner
            title={t("home.ctaTitle")}
            description={t("home.ctaDescription")}
            buttonLabel={isAuthenticated ? t("home.startExploring") : t("home.createFreeAccount")}
            onPress={onCtaPress}
          />
        </Animated.View>

        <HomeFeaturedWinesSection
          title={t("home.featuredWines")}
          actionLabel={t("common.seeAll")}
          winesLoading={winesLoading}
          featuredWines={featuredWines}
          error={winesError}
          onRetry={onRetryWines}
          onSeeAll={onSeeAllWines}
          onWinePress={onWinePress}
          onWineReviewsPress={onWineReviewsPress}
        />

        <HomeEventsSection
          title={t("home.nearbyEvents")}
          actionLabel={t("common.seeAll")}
          eventsLoading={eventsLoading}
          homeEvents={homeEvents}
          error={eventsError}
          onRetry={onRetryEvents}
          onSeeAll={onSeeAllEvents}
          onEventPress={onEventPress}
        />

        <HomeRoutesSection
          title={t("home.wineRoutes")}
          actionLabel={t("common.seeAll")}
          routesLoading={routesLoading}
          routes={routes}
          error={routesError}
          onRetry={onRetryRoutes}
          onSeeAll={onSeeAllRoutes}
          onRoutePress={onRoutePress}
        />
      </ScrollView>
    </>
  );
}

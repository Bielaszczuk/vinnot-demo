import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, MapPin } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { radii, iconStrokes } from "@/shared/theme/tokens";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { grapeGradient } from "./grapeColors";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { EventCard } from "@/presentation/features/event";
import { WineCard } from "@/presentation/features/wine";
import { WineRouteCard } from "@/presentation/features/wineRoute";
import type { Event } from "@/domain/event/event.types";
import type { WineRoute } from "@/domain/route/route.types";
import type { WineSummary } from "@/domain/wine/wine.types";
import RedGlassImage from "../../../../assets/images/common/redglass.webp";
import WhiteGlassImage from "../../../../assets/images/common/whiteglass.webp";
import RoseGlassImage from "../../../../assets/images/common/roseglass.webp";
import SparklingGlassImage from "../../../../assets/images/common/sparklinglass.webp";
import { styles } from "./HomeScreenView.styles";
import { HomeListHeader } from "./HomeSectionHeaders";

export { HomeListHeader, SectionTitle } from "./HomeSectionHeaders";

export type WineTypeKey = "red" | "white" | "rose" | "sparkling";

type WineTypeCard = {
  key: WineTypeKey;
  image: number;
};

export const WINE_TYPE_CARDS: WineTypeCard[] = [
  { key: "red", image: RedGlassImage },
  { key: "white", image: WhiteGlassImage },
  { key: "rose", image: RoseGlassImage },
  { key: "sparkling", image: SparklingGlassImage },
];

export const POPULAR_GRAPES = [
  "Malbec",
  "Cabernet Sauvignon",
  "Merlot",
  "Pinot Noir",
  "Chardonnay",
  "Sauvignon Blanc",
  "Torrontés",
  "Syrah",
];

/** Grape chip painted with the colour of its wine; falls back to the neutral chip. */
export function GrapePill({ grape }: { grape: string }) {
  const gradient = grapeGradient(grape);
  if (!gradient) {
    return (
      <View style={styles.grapePillSurface}>
        <Text style={styles.grapeText}>{grape}</Text>
      </View>
    );
  }
  return (
    <LinearGradient
      colors={gradient.colors}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[styles.grapePillSurface, styles.grapePillTinted]}
    >
      <Text style={[styles.grapeText, styles.grapeTextTinted, { color: gradient.textColor }]}>
        {grape}
      </Text>
    </LinearGradient>
  );
}

export function FeatureCard({
  icon,
  title,
  description,
  onPress,
  delay = 0,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(420).delay(260 + delay)}
      style={styles.featureCardWrap}
    >
      <MotionPressable
        onPress={onPress}
        style={styles.featureCard}
        pressedScale={0.97}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={description}
      >
        <View style={styles.featureCardTop}>
          <View style={styles.featureIcon}>{icon}</View>
          <ArrowRight size={16} color={vinnotColors.brand} strokeWidth={iconStrokes.regular} />
        </View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </MotionPressable>
    </Animated.View>
  );
}

export function PrimaryHeroButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      onPress={onPress}
      style={styles.heroButtonPressable}
      pressedScale={0.975}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.heroButtonSurface, styles.heroButtonPrimary]}>
        <View style={styles.heroButtonIconSlot}>{icon}</View>
        <Text style={styles.heroButtonPrimaryText}>{label}</Text>
      </View>
    </MotionPressable>
  );
}

export function GlassHeroButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon?: ReactNode;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      onPress={onPress}
      style={styles.heroButtonPressable}
      pressedScale={0.975}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.heroButtonSurface, styles.heroButtonGlass]}>
        {icon ? <View style={styles.heroButtonIconSlot}>{icon}</View> : null}
        <Text style={styles.heroButtonGlassText}>{label}</Text>
      </View>
    </MotionPressable>
  );
}

export function HomeCtaBanner({
  title,
  description,
  buttonLabel,
  onPress,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.ctaBannerShell}>
      <View style={styles.ctaBanner}>
        <Text style={styles.ctaTitle}>{title}</Text>
        <Text style={styles.ctaDescription}>{description}</Text>
        <MotionPressable
          onPress={onPress}
          style={styles.ctaButton}
          pressedScale={0.965}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
        >
          <Text style={styles.ctaButtonText}>{buttonLabel}</Text>
        </MotionPressable>
      </View>
    </View>
  );
}

export function HomeFeaturedWinesSection({
  title,
  actionLabel,
  winesLoading,
  featuredWines,
  error,
  onRetry,
  onSeeAll,
  onWinePress,
  onWineReviewsPress,
}: {
  title: string;
  actionLabel: string;
  winesLoading: boolean;
  featuredWines: WineSummary[];
  error?: unknown;
  onRetry?: () => void;
  onSeeAll: () => void;
  onWinePress: (id: string) => void;
  /** Opens the wine straight on its reviews from the card's review count. */
  onWineReviewsPress?: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.section}>
      <HomeListHeader title={title} actionLabel={actionLabel} onAction={onSeeAll} />
      {error && onRetry ? <QueryErrorState error={error} onRetry={onRetry} /> : null}
      {!winesLoading && !error && featuredWines.length === 0 ? (
        <View style={styles.nearbyEventsEmpty}>
          <Text style={styles.nearbyEventsEmptyBody}>{t("home.noRatedWines")}</Text>
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {winesLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} width={184} height={324} radius={radii.xl} />
            ))
          : featuredWines.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.duration(380).delay(320 + index * 60)}
                style={styles.wineCardWrap}
              >
                <WineCard
                  wine={item}
                  onPress={() => onWinePress(item.id)}
                  onReviewsPress={onWineReviewsPress ? () => onWineReviewsPress(item.id) : undefined}
                />
              </Animated.View>
            ))}
      </ScrollView>
    </Animated.View>
  );
}

export function HomeEventsSection({
  title,
  actionLabel,
  eventsLoading,
  homeEvents,
  error,
  onRetry,
  onSeeAll,
  onEventPress,
}: {
  title: string;
  actionLabel: string;
  eventsLoading: boolean;
  homeEvents: Event[];
  error?: unknown;
  onRetry?: () => void;
  onSeeAll: () => void;
  onEventPress: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(340)} style={styles.section}>
      <HomeListHeader title={title} actionLabel={actionLabel} onAction={onSeeAll} />
      <View style={styles.verticalList}>
        {eventsLoading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} height={313} radius={radii["2xl"]} />
          ))
        ) : error && onRetry && homeEvents.length === 0 ? (
          <QueryErrorState error={error} onRetry={onRetry} />
        ) : homeEvents.length === 0 ? (
          <View style={styles.nearbyEventsEmpty}>
            <View style={styles.nearbyEventsEmptyIcon}>
              <MapPin size={20} color={vinnotColors.brand} strokeWidth={iconStrokes.thin} />
            </View>
            <Text style={styles.nearbyEventsEmptyTitle}>
              {t("home.events.emptyTitle", {
                defaultValue: "No hay eventos cerca por ahora",
              })}
            </Text>
            <Text style={styles.nearbyEventsEmptyBody}>
              {t("home.events.emptyBody", {
                defaultValue:
                  "Explorá todos los eventos disponibles y elegí tu próxima experiencia.",
              })}
            </Text>
            <MotionPressable
              onPress={onSeeAll}
              accessibilityRole="button"
              style={styles.nearbyEventsEmptyAction}
            >
              <Text style={styles.nearbyEventsEmptyActionText}>
                {t("home.events.explore", { defaultValue: "Explorar eventos" })}
              </Text>
              <ArrowRight size={17} color={vinnotColors.white} strokeWidth={iconStrokes.regular} />
            </MotionPressable>
          </View>
        ) : (
          homeEvents.map((item, index) => (
            <Animated.View
              key={item.id}
              entering={FadeInDown.duration(380).delay(360 + index * 60)}
            >
              <EventCard event={item} onPress={() => onEventPress(item.id)} />
            </Animated.View>
          ))
        )}
      </View>
    </Animated.View>
  );
}

export function HomeRoutesSection({
  title,
  actionLabel,
  routesLoading,
  routes,
  error,
  onRetry,
  onSeeAll,
  onRoutePress,
}: {
  title: string;
  actionLabel: string;
  routesLoading: boolean;
  routes: WineRoute[];
  error?: unknown;
  onRetry?: () => void;
  onSeeAll: () => void;
  onRoutePress: (id: string) => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(500).delay(380)} style={styles.section}>
      <HomeListHeader title={title} actionLabel={actionLabel} onAction={onSeeAll} />
      <View style={styles.verticalList}>
        {routesLoading
          ? Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} height={321} radius={radii["2xl"]} />
            ))
          : error && onRetry && routes.length === 0
            ? <QueryErrorState error={error} onRetry={onRetry} />
            : routes.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.duration(380).delay(400 + index * 60)}
              >
                <WineRouteCard route={item} onPress={() => onRoutePress(item.id)} />
              </Animated.View>
            ))}
      </View>
    </Animated.View>
  );
}

/**
 * Event Detail Screen.
 */
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ExternalLink, Mail, MapPin, Phone, Share2, UserRound } from "lucide-react-native";
import MapView, { Marker } from "react-native-maps";
import { useTranslation } from "react-i18next";
import { hasOrganizerDetails } from "@/domain/event/eventOrganizer";
import { AppHeader } from "@/presentation/components/layout";
import { TagPill } from "@/presentation/components/ui/Atoms";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { CommunityActions } from "@/presentation/features/community/CommunityActions";
import { shadows } from "@/shared/theme/shadows";
import { layout, radii, spacing } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { EventDetailHero } from "./EventDetailHero";
import { EventRegistrationSheet } from "./EventRegistrationSheet";
import { PushPermissionSheet } from "@/presentation/features/notifications/PushPermissionSheet";
import { ReserveCTA } from "./ReserveCTA";
import { useEventDetailViewModel } from "./useEventDetailViewModel";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { fontSizes } from "@/shared/theme/typography";

export function EventDetailScreen({ eventId }: { eventId: string | undefined }) {
  const { t } = useTranslation();
  const {
    event,
    registration,
    user,
    hasCoordinates,
    isLoading,
    loadError,
    isRefreshing,
    registering,
    actionLoading,
    submitting,
    registrationSheetVisible,
    closeRegistrationSheet,
    pushPrompt,
    backToEvents,
    refresh,
    handleReserve,
    submitRegistration,
    confirmAttendance,
    cancelRegistration,
    payNow,
    contactOrganizer,
    canShare,
    handleShare,
    handleOpenMaps,
  } = useEventDetailViewModel(eventId);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <AppHeader title={t("events.title")} showBack onBack={backToEvents} />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: spacing[6],
            },
          ]}
        >
          <Skeleton height={390} radius={radii["3xl"]} />
          <Skeleton height={190} radius={radii["2xl"]} />
          <Skeleton height={260} radius={radii["2xl"]} />
        </ScrollView>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.screen}>
        <AppHeader title={t("events.title")} showBack onBack={backToEvents} />
        {loadError ? (
          <QueryErrorState error={loadError} onRetry={refresh} />
        ) : (
          <EmptyState
            illustration="event"
            title={t("events.notFound")}
            action={{ label: t("events.backToEvents"), onPress: backToEvents }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader title={t("events.title")} showBack onBack={backToEvents} />

      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: spacing[6],
          },
        ]}
        refreshControl={
          <BrandRefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <EventDetailHero event={event} />

        <View style={styles.actionsRow}>
          {canShare && (
            <Button
              variant="outline"
              onPress={handleShare}
              leftIcon={<Share2 size={16} color={vinnotColors.brand} />}
              style={styles.actionButton}
            >
              {t("events.share")}
            </Button>
          )}
          <Button
            variant="outline"
            onPress={handleOpenMaps}
            leftIcon={<ExternalLink size={16} color={vinnotColors.brand} />}
            style={styles.actionButton}
          >
            {t("events.openMaps")}
          </Button>
        </View>

        <ReserveCTA
          event={event}
          registration={registration}
          loading={registering}
          actionLoading={actionLoading}
          onReserve={handleReserve}
          onConfirmAttendance={confirmAttendance}
          onPayNow={payNow}
          onContactOrganizer={contactOrganizer}
          onCancelRegistration={cancelRegistration}
        />

        <Card radius={radii.xl} style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <UserRound size={18} color={vinnotColors.brand} />
            </View>
            <Text style={styles.sectionTitle}>{t("events.aboutEvent")}</Text>
          </View>
          <Text style={styles.description}>{event.description}</Text>
        <CommunityActions targetType="EVENT" targetId={event.id} ownerId={event.organizer.id} allowBlock={false} />
          {event.tags.length > 0 && (
            <View style={styles.tags}>
              {event.tags.map((tag) => (
                <TagPill key={tag} label={tag} />
              ))}
            </View>
          )}
        </Card>

        <Card padding={0} radius={radii.xl} style={styles.mapCard}>
          <View style={styles.cardHeader}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}>
                <MapPin size={18} color={vinnotColors.brand} />
              </View>
              <Text style={styles.sectionTitle}>{t("events.location")}</Text>
            </View>
            <Text numberOfLines={2} style={styles.mutedText}>
              {[
                event.location.name,
                event.location.address,
                event.location.city,
                event.location.region,
              ]
                .filter(Boolean)
                .join(", ")}
            </Text>
          </View>
          {hasCoordinates ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: event.location.latitude!,
                longitude: event.location.longitude!,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker
                coordinate={{
                  latitude: event.location.latitude!,
                  longitude: event.location.longitude!,
                }}
                title={event.title}
                description={event.location.name}
              />
            </MapView>
          ) : (
            <View style={styles.mapFallback}>
              <View style={styles.mapFallbackIcon}>
                <MapPin size={26} color={vinnotColors.brand} />
              </View>
              <Text style={styles.mutedText}>{t("events.mapUnavailableDesc")}</Text>
            </View>
          )}
        </Card>

        {hasOrganizerDetails(event.organizer) && (
          <Card radius={radii.xl} style={styles.sectionCard}>
            <View style={styles.organizerHeader}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionIcon}>
                  <UserRound size={18} color={vinnotColors.brand} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>{t("events.organizer")}</Text>
                  {!!event.organizer.name && <Text style={styles.organizer}>{event.organizer.name}</Text>}
                </View>
              </View>
            </View>
            {!!event.organizer.email && (
              <View style={styles.contactRow}>
                <Mail size={15} color={vinnotColors.muted} />
                <Text style={styles.mutedText}>{event.organizer.email}</Text>
              </View>
            )}
            {!!event.organizer.phone && (
              <View style={styles.contactRow}>
                <Phone size={15} color={vinnotColors.muted} />
                <Text style={styles.mutedText}>{event.organizer.phone}</Text>
              </View>
            )}
          </Card>
        )}
      </KeyboardAwareScrollView>
      {registrationSheetVisible ? (
        <EventRegistrationSheet
          event={event}
          user={user}
          submitting={submitting}
          onClose={closeRegistrationSheet}
          onSubmit={submitRegistration}
        />
      ) : null}
      <PushPermissionSheet
        visible={pushPrompt.visible}
        busy={pushPrompt.busy}
        onAllow={pushPrompt.allow}
        onDismiss={pushPrompt.dismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vinnotColors.canvas },
  content: {
    gap: spacing[4],
    paddingHorizontal: layout.screenHorizontalPadding,
    paddingTop: spacing[3],
  },
  actionsRow: { flexDirection: "row", gap: spacing[2.5] },
  actionButton: { flex: 1 },
  sectionCard: {
    borderWidth: 1,
    borderColor: vinnotColors.border,
    gap: spacing[3],
    ...shadows.sm,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2.5],
  },
  sectionIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: vinnotColors.brandSoft,
  },
  sectionTitle: {
    color: vinnotColors.ink,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.lg,
    lineHeight: 23,
    letterSpacing: 0,
  },
  description: {
    color: vinnotColors.muted,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.ui,
    lineHeight: 23,
    letterSpacing: 0,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginTop: spacing[1],
  },
  mapCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: vinnotColors.border,
    ...shadows.sm,
  },
  cardHeader: { gap: spacing[2], padding: spacing[4] },
  mutedText: {
    color: vinnotColors.muted,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 19,
    letterSpacing: 0,
  },
  map: { height: 230 },
  mapFallback: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[3],
    padding: spacing[6],
    backgroundColor: vinnotColors.canvasMuted,
  },
  mapFallbackIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    backgroundColor: vinnotColors.brandSoft,
  },
  organizerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  organizer: {
    color: vinnotColors.muted,
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    letterSpacing: 0,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
});

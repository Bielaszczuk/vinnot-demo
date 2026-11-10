import { useState } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { CalendarDays, MapPin } from "lucide-react-native";
import { useMyTickets, useMyTicket } from "@/presentation/hooks/queries/event/useMyTickets";
import { AppHeader } from "@/presentation/components/layout";
import { Button } from "@/presentation/components/ui/Button";
import { Spinner, EmptyState } from "@/presentation/components/ui/Feedback";
import { wine, neutral, radii } from "@/shared/theme/tokens";

import { illustrations } from "@/shared/illustrations";
import { CoverImage } from "@/presentation/components/features/media/CoverImage";
import type { EventTicket } from "@/domain/event/eventTicket";
import { resolveIllustratedState } from "@/presentation/feedback/illustratedState";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { fontSizes } from "@/shared/theme/typography";

function Status({ ticket }: { ticket: EventTicket }) {
  const { t } = useTranslation();
  return (
    <Text style={styles.status}>{t(`events.registration.statuses.${ticket.status}`)}</Text>
  );
}
function LoadError({ message, retry }: { message: string; retry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text accessibilityRole="alert" style={styles.body}>{message}</Text>
      <Button variant="outline" onPress={retry}>{t("common.retry")}</Button>
    </View>
  );
}
function Header({ detail = false }: { detail?: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <AppHeader
      title={t("tickets.title")}
      showBack
      onBack={() =>
        detail
          ? router.dismissTo("/my-tickets" as Href)
          : router.canGoBack()
            ? router.back()
            : router.replace("/(app)/(tabs)/profile")
      }
    />
  );
}
export function MyTicketsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(0);
  const query = useMyTickets(page);
  return (
    <SafeAreaView style={styles.screen} edges={["bottom", "left", "right"]}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <BrandRefreshControl
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
          />
        }
      >
        <Text style={styles.muted}>{t("tickets.subtitle")}</Text>
        {query.isLoading ? (
          <Spinner />
        ) : query.isError ? (
          <LoadError message={t("tickets.error")} retry={() => void query.refetch()} />
        ) : (
          <>
            {!query.currentData?.tickets.length && (
              <EmptyState
                illustration="noTickets"
                title={t("tickets.empty")}
                action={{ label: t("tickets.explore"), onPress: () => router.push("/(app)/(tabs)/events" as Href) }}
              />
            )}
            {query.currentData?.tickets.map((ticket) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t("tickets.view")}: ${ticket.title}`}
                key={ticket.id}
                style={styles.card}
                onPress={() => router.push(`/my-tickets/${ticket.id}` as Href)}
              >
                <Status ticket={ticket} />
                <Text style={styles.title}>{ticket.title}</Text>
                <View style={styles.row}>
                  <CalendarDays size={18} color={wine[700]} />
                  <Text style={styles.rowText}>
                    {ticket.startDate.toLocaleString(i18n.language, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Text>
                </View>
                <View style={styles.row}>
                  <MapPin size={18} color={wine[700]} />
                  <Text style={styles.rowText}>
                    {[ticket.locationName, ticket.locationCity].filter(Boolean).join(" · ") ||
                      t("tickets.locationPending")}
                  </Text>
                </View>
                <Text style={styles.link}>{t("tickets.view")}</Text>
              </Pressable>
            ))}
            {(query.currentData?.totalPages ?? 0) > 1 && (
              <View style={styles.pagination}>
                <Button variant="outline" disabled={!page} onPress={() => setPage(page - 1)}>
                  {t("tickets.previous")}
                </Button>
                <Button
                  variant="outline"
                  disabled={page + 1 >= (query.currentData?.totalPages ?? 0)}
                  onPress={() => setPage(page + 1)}
                >
                  {t("tickets.next")}
                </Button>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
export function MyTicketDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const query = useMyTicket(id);
  const ticket = query.currentData;
  const loadFailed = query.isError && resolveIllustratedState(query.error) !== "notFound";
  return (
    <SafeAreaView style={styles.screen} edges={["bottom", "left", "right"]}>
      <Header detail />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <BrandRefreshControl
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
          />
        }
      >
        {query.isLoading ? (
          <Spinner />
        ) : loadFailed ? (
          <LoadError message={t("tickets.detailError")} retry={() => void query.refetch()} />
        ) : query.isError || !ticket ? (
          <Text accessibilityRole="alert">{t("tickets.unavailable")}</Text>
        ) : (
          <View style={styles.card}>
            <CoverImage
              uri={ticket.imageUrl ?? undefined}
              fallbackSource={illustrations.event}
              alt=""
              style={styles.cover}
              contentFit="contain"
            />
            <Status ticket={ticket} />
            <Text style={styles.heading}>{ticket.title}</Text>
            {ticket.eventStatus === "CANCELLED" && (
              <Text style={styles.status}>{t("tickets.eventCancelled")}</Text>
            )}
            <Text style={styles.label}>{t("tickets.date")}</Text>
            <Text style={styles.body}>
              {ticket.startDate.toLocaleString(i18n.language, {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </Text>
            <Text style={styles.label}>{t("tickets.location")}</Text>
            <Text style={styles.body}>
              {[ticket.locationName, ticket.locationAddress, ticket.locationCity]
                .filter(Boolean)
                .join(" · ") || t("tickets.locationPending")}
            </Text>
            <Text style={styles.label}>{t("tickets.people")}</Text>
            <Text style={styles.body}>{ticket.attendeeCount}</Text>
            <Text style={styles.label}>{t("tickets.payment")}</Text>
            <Text style={styles.body}>
              {t(`events.registrationManager.paymentStatuses.${ticket.paymentStatus}`)} ·{" "}
              {ticket.totalAmount
                ? new Intl.NumberFormat(i18n.language, {
                    style: "currency",
                    currency: ticket.currency,
                  }).format(ticket.totalAmount)
                : t("events.registrationManager.free")}
            </Text>
            {ticket.expiresAt && (
              <Text style={styles.muted}>
                {t("events.registrationManager.reservationUntil", {
                  date: ticket.expiresAt.toLocaleString(i18n.language),
                })}
              </Text>
            )}
            {!!ticket.description && <Text style={styles.body}>{ticket.description}</Text>}
            {(!!ticket.contactEmail || !!ticket.contactPhone) && (
              <>
                <Text style={styles.label}>{t("tickets.contact")}</Text>
                <Text style={styles.body}>
                  {[ticket.contactEmail, ticket.contactPhone].filter(Boolean).join(" · ")}
                </Text>
              </>
            )}
            <Button
              variant="outline"
              onPress={() => router.push(`/(app)/(tabs)/events/${ticket.eventId}` as Href)}
            >
              {t("tickets.eventDetails")}
            </Button>
            <Text style={styles.muted}>
              {t("tickets.reference")} {ticket.id.slice(-12).toUpperCase()}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  cover: { width: "100%", height: 180, borderRadius: radii.xl },
  screen: { flex: 1, backgroundColor: neutral[0] },
  content: { padding: 20, paddingBottom: 36, gap: 18 },
  heading: { fontFamily: "Poppins_600SemiBold", fontSize: fontSizes["2xl"], color: neutral[900] },
  title: { fontFamily: "Poppins_600SemiBold", fontSize: fontSizes.xl, color: neutral[900] },
  card: {
    borderWidth: 1,
    borderColor: wine[100],
    borderRadius: radii["2xl"],
    padding: 22,
    gap: 14,
    backgroundColor: neutral[0],
  },
  status: {
    alignSelf: "flex-start",
    borderRadius: radii.lg,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: wine[50],
    color: wine[800],
    fontFamily: "Poppins_500Medium",
    fontSize: fontSizes.xs,
  },
  muted: { fontFamily: "Poppins_400Regular", fontSize: fontSizes.sm, color: neutral[500], lineHeight: 21 },
  body: { fontFamily: "Poppins_400Regular", fontSize: fontSizes.base, color: neutral[700], lineHeight: 24 },
  label: { fontFamily: "Poppins_500Medium", fontSize: fontSizes.sm, color: wine[700], marginTop: 8 },
  row: { flexDirection: "row", gap: 9, alignItems: "center" },
  rowText: { flex: 1, fontFamily: "Poppins_400Regular", fontSize: fontSizes.sm, color: neutral[600] },
  link: { fontFamily: "Poppins_500Medium", color: wine[700], fontSize: fontSizes.ui },
  pagination: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
});

import { ScrollView, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock3, CircleAlert } from "lucide-react-native";
import { checkoutReturnDetails } from "@/domain/event/checkoutReturn";
import { useCheckoutReceipt } from "@/presentation/hooks/useCheckoutReceipt";
import { AppHeader } from "@/presentation/components/layout";
import { Button } from "@/presentation/components/ui/Button";
import { illustrations } from "@/shared/illustrations";
import { wine, neutral, iconStrokes } from "@/shared/theme/tokens";
import { fontSizes } from "@/shared/theme/typography";

/** Public status only. Ticket navigation enters the existing authenticated shell. */
export function CheckoutReturnScreen() {
  const params = useLocalSearchParams<{ receipt?: string; ticketId?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const details = checkoutReturnDetails(
    new URLSearchParams({
      receipt: typeof params.receipt === "string" ? params.receipt : "",
      ticketId: typeof params.ticketId === "string" ? params.ticketId : "",
    }),
  );
  const { status, refresh, refreshing } = useCheckoutReceipt(details?.receipt ?? null);
  const Icon = status === "CONFIRMED" ? CheckCircle2 : status === "PENDING" ? Clock3 : CircleAlert;
  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <AppHeader
        title={t("tickets.payment")}
        showBack
        onBack={() => router.replace("/my-tickets" as Href)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={illustrations.event}
          style={styles.image}
          contentFit="contain"
          accessible={false}
        />
        <Icon size={36} color={wine[700]} strokeWidth={iconStrokes.thin} />
        <Text accessibilityRole="header" style={styles.title}>
          {t(`tickets.receipt.${status}.title`)}
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {t(`tickets.receipt.${status}.body`)}
        </Text>
        <Button
          onPress={() =>
            router.replace(
              (details?.ticketId ? `/my-tickets/${details.ticketId}` : "/my-tickets") as Href,
            )
          }
        >
          {t(details?.ticketId ? "tickets.view" : "tickets.title")}
        </Button>
        {details?.ticketId && (
          <Button variant="outline" onPress={() => router.replace("/my-tickets" as Href)}>
            {t("tickets.title")}
          </Button>
        )}
        {(status === "PENDING" || status === "UNAVAILABLE") && details && (
          <Button variant="ghost" onPress={refresh} loading={refreshing} disabled={refreshing}>
            {t("tickets.refresh")}
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: neutral[0] },
  content: { flexGrow: 1, padding: 28, gap: 22, alignItems: "center", justifyContent: "center" },
  image: { width: 240, height: 180 },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: fontSizes["2xl"],
    color: neutral[900],
    textAlign: "center",
  },
  body: {
    fontFamily: "Poppins_400Regular",
    fontSize: fontSizes.base,
    lineHeight: 25,
    color: neutral[600],
    textAlign: "center",
  },
});

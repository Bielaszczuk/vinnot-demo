import { StyleSheet, Text, View } from "react-native";
import { Clock3, RefreshCw, WifiOff, CircleAlert } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { ApiError } from "@/application/operations";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { radii, iconStrokes } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";

interface WineComparisonErrorStateProps {
  error?: ApiError;
  onRetry: () => void;
}

export function WineComparisonErrorState({
  error,
  onRetry,
}: WineComparisonErrorStateProps) {
  const { t } = useTranslation();
  const timedOut = error?.code === "TIMEOUT";
  const offline = error?.code === "NETWORK_ERROR";
  const Icon = timedOut ? Clock3 : offline ? WifiOff : CircleAlert;

  return (
    <Card radius={radii["2xl"]} style={styles.card}>
      <View style={styles.iconContainer}>
        <Icon size={24} color={vinnotColors.brand} strokeWidth={iconStrokes.thin} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>
          {timedOut
            ? t("compare.error.timeoutTitle", "La comparación tardó más de lo esperado")
            : t("compare.error.networkTitle", "No pudimos completar la comparación")}
        </Text>
        <Text style={styles.description}>
          {timedOut
            ? t(
                "compare.error.timeoutDescription",
                "El servicio demoró demasiado en responder. Podés intentarlo nuevamente.",
              )
            : offline
              ? t("compare.error.networkDescription", "Revisá tu conexión y volvé a intentar.")
              : t("compare.error.serviceDescription", "No pudimos generar la comparación. Volvé a intentarlo en unos momentos.")}
        </Text>
      </View>
      <Button
        variant="outline"
        fullWidth
        leftIcon={<RefreshCw size={16} color={vinnotColors.brand} strokeWidth={iconStrokes.regular} />}
        onPress={onRetry}
      >
        {t("compare.error.retry", "Reintentar comparación")}
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: vinnotColors.brandTint,
    backgroundColor: vinnotColors.surface,
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii["3xl"],
    backgroundColor: vinnotColors.brandSoft,
  },
  copy: { alignItems: "center", gap: 5 },
  title: {
    textAlign: "center",
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.md,
    lineHeight: 22,
    color: vinnotColors.ink,
  },
  description: {
    textAlign: "center",
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: vinnotColors.muted,
  },
});

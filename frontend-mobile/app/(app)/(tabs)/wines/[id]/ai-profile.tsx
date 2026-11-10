/**
 * AI Wine Profile Screen — dedicated protected flow aligned with web.
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ClipboardList, GitCompareArrows, Pencil, Wine } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { EmptyState } from "@/presentation/components/ui/Feedback";
import { AiProfileLoadingSteps, AiProfileSections } from "@/presentation/features/wine";
import { useAiProfileViewModel } from "@/presentation/features/wine/useAiProfileViewModel";
import { AuthGuard } from "@/presentation/navigation/guards";
import { layout, radii } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { BackButton } from "@/presentation/components/ui/BackButton";
import { fontSizes } from "@/shared/theme/typography";

export default function AiProfileRoute() {
  return (
    <AuthGuard>
      <AiProfileScreen />
    </AuthGuard>
  );
}

function AiProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const vm = useAiProfileViewModel();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <BackButton onPress={vm.goBack} />

      <Card radius={radii.md} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Wine size={24} color={vinnotColors.brand} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.title}>{t("wineDetails.aiSommelier")}</Text>
          <Text style={styles.subtitle}>
            {vm.wineDetail?.name
              ? t("wineDetails.aiProfileFor", "Perfil sommelier exclusivo para {{wine}}", {
                  wine: vm.wineDetail.name,
                })
              : t("wineDetails.consultAi")}
          </Text>
        </View>
      </Card>

      {vm.showLoading && <AiProfileLoadingSteps wineType={vm.wineDetail?.type} />}

      {vm.showProfile && vm.profile && (
        <>
          {vm.canEdit && <Button variant="outline" leftIcon={<Pencil size={17} color={vinnotColors.brand} />}
            onPress={vm.openEditor}>
            {t("admin.aiProfile.editFullProfile")}
          </Button>}
          <AiProfileSections profile={vm.profile} isLoading={false} />
          <View style={styles.actions}>
            <Button
              variant="outline"
              leftIcon={<GitCompareArrows size={17} color={vinnotColors.brand} />}
              onPress={vm.openCompare}
            >
              {t("wines.compare")}
            </Button>
          </View>
        </>
      )}

      {vm.showEmpty && (vm.loadError ? (
        <EmptyState
          title={t("wines.aiProfileLoadError")}
          description={t("wines.aiProfileLoadErrorDescription")}
          icon={<ClipboardList size={38} color={vinnotColors.brand} />}
          action={{ label: t("common.retry"), onPress: vm.retryLoad }}
        />
      ) : (
        <EmptyState
          title={t("wines.aiProfileUnavailable")}
          description={
            vm.profileReadFailed ? t("wines.aiProfileUnavailableDescription") : t("wineDetails.consultAi")
          }
          icon={<ClipboardList size={38} color={vinnotColors.brand} />}
          action={{
            label: t("wineDetails.generateProfile", "Generar perfil"),
            onPress: vm.generateProfile,
          }}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vinnotColors.canvas },
  content: { gap: 20, paddingHorizontal: layout.screenHorizontalPadding },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    backgroundColor: vinnotColors.brandSoft,
  },
  heroIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: vinnotColors.brandTint,
    backgroundColor: vinnotColors.surface,
  },
  heroText: { flex: 1, gap: 4 },
  title: {
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes.lg,
    lineHeight: 24,
    color: vinnotColors.ink,
  },
  subtitle: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: vinnotColors.muted,
  },
  actions: { gap: 10 },
});

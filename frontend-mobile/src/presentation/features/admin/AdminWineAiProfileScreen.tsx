/** Structured wine profile editor, shared by admin navigation and the public profile shortcut. */
import { useCallback, useEffect, useRef } from "react";
import { ADMIN_WINES_ROUTE, goBackOr } from "@/presentation/navigation/discoveryNavigation";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ClipboardList, RefreshCw, Save, Wine } from "lucide-react-native";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { EmptyState, Spinner } from "@/presentation/components/ui/Feedback";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";

import { WineProfileEditor } from "@/presentation/features/wine/WineProfileEditor";
import { useWineProfileEditor } from "@/presentation/hooks/queries/admin/useWineProfileEditor";
import { RoleGuard } from "@/presentation/navigation/guards";
import { ROLES } from "@/shared/config/roles";
import { layout, radii } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { BackButton } from "@/presentation/components/ui/BackButton";

export function AdminWineAiProfileRoute() {
  const { i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  // Opened from a link there is no history: return to the wines admin list.
  const leave = useCallback(() => goBackOr(router, ADMIN_WINES_ROUTE), [router]);
  return <RoleGuard requiredRoles={[ROLES.ADMIN, ROLES.MODERATOR]}>
    <AdminWineAiProfileScreen key={`${id}:${i18n.resolvedLanguage ?? i18n.language}`} wineId={id} onLeave={leave} />
  </RoleGuard>;
}

export function AdminWineAiProfileScreen({ wineId, onLeave }: { wineId: string; onLeave: () => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const editor = useWineProfileEditor(wineId, onLeave);
  const scroll = useRef<ScrollViewInstance>(null);
  const footerHeight = useRef(0);
  // iOS keeps the Save/Cancel footer above the keyboard with the padding below, so the field is
  // revealed above that footer. Edge-to-edge Android covers the footer and relies on the shared
  // keyboard-aware scroll (reserved keyboard room + reveal above the keyboard top).
  const revealFocusedField = useCallback(() => {
    if (Platform.OS !== "ios") return;
    const input = TextInput.State.currentlyFocusedInput();
    if (input && Keyboard.isVisible()) {
      scroll.current?.scrollResponderScrollNativeHandleToKeyboard(input, footerHeight.current + 16, true);
    }
  }, []);
  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", revealFocusedField);
    return () => subscription.remove();
  }, [revealFocusedField]);
  return <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]}
    behavior={Platform.OS === "ios" ? "padding" : undefined} testID="profile-editor-keyboard">
    <KeyboardAwareScrollView ref={scroll} style={styles.scroll} onLayout={revealFocusedField}
      automaticallyAdjustKeyboardInsets={false}
      contentContainerStyle={[styles.content, { paddingTop: 14, paddingBottom: 24 }]}
      keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      showsVerticalScrollIndicator={false}>
      <BackButton onPress={editor.requestLeave} disabled={editor.busy} />
      <Card radius={radii.lg} style={styles.hero} elevation="none">
        <View style={styles.heroIcon}><Wine size={24} color={vinnotColors.brand} /></View>
        <View style={styles.heroText}>
          <Text style={styles.title}>{t("admin.aiProfile.title")}</Text>
          <Text style={styles.subtitle}>
            {editor.wine ? `${editor.wine.name} · ${editor.wine.winery}` : t("admin.aiProfile.editCompleteAnalysis")}
          </Text>
        </View>
      </Card>
      {editor.loading ? <View style={styles.loadingBox}>
        <Spinner /><Text style={styles.subtitle}>{t("admin.aiProfile.loading")}</Text>
      </View> : editor.loadError && !editor.profile ? <EmptyState
        title={t("admin.aiProfile.loadError")} description={t("admin.aiProfile.loadErrorDescription")}
        action={{ label: t("common.retry"), onPress: editor.retry }}
      /> : editor.draft ? <>
        <View style={styles.toolbar}>
          <View style={styles.heroText}>
            <Text style={styles.sectionTitle}>{t("admin.aiProfile.editCompleteAnalysis")}</Text>
            <Text style={styles.subtitle}>{t(editor.dirty ? "admin.aiProfile.unsavedChanges" : "admin.aiProfile.editorHint")}</Text>
          </View>
          <Button variant="ghost" size="sm" disabled={!editor.dirty || editor.busy} onPress={editor.restore}>
            {t("admin.aiProfile.restore")}
          </Button>
        </View>
        <WineProfileEditor draft={editor.draft} errors={editor.errors} disabled={editor.busy}
          onChange={editor.changeField} onFocus={revealFocusedField} />
        <Button variant="outline" leftIcon={<RefreshCw size={16} color={vinnotColors.brand} />}
          loading={editor.generating} disabled={editor.busy} onPress={editor.confirmRegenerate}>
          {t("admin.aiProfile.regenerate")}
        </Button>
      </> : <EmptyState title={t("admin.aiProfile.emptyTitle")}
        description={t("admin.aiProfile.generateFirst")} icon={<ClipboardList size={38} color={vinnotColors.brand} />}
        action={{ label: t(editor.generating ? "admin.aiProfile.generating" : "admin.aiProfile.generateProfile"),
          onPress: editor.confirmRegenerate }} />}
    </KeyboardAwareScrollView>
    {!!editor.draft && !editor.loading && <View testID="profile-editor-footer" onLayout={event => { footerHeight.current = event.nativeEvent.layout.height; }}
      style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.cancel}><Button variant="outline" disabled={editor.busy} onPress={editor.requestLeave}>
        {t("common.cancel")}
      </Button></View>
      <View style={styles.save}><Button leftIcon={<Save size={16} color={vinnotColors.white} />}
        loading={editor.saving} disabled={!editor.dirty || editor.busy} onPress={() => { void editor.save(); }}>
        {t("common.save")}
      </Button></View>
    </View>}
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vinnotColors.canvas },
  scroll: { flex: 1 },
  content: { gap: 20, paddingHorizontal: layout.screenHorizontalPadding },
  hero: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1,
    borderColor: vinnotColors.borderSoft, backgroundColor: vinnotColors.brandSoft },
  heroIcon: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: radii.lg,
    borderWidth: 1, borderColor: vinnotColors.brandTint, backgroundColor: vinnotColors.surface },
  heroText: { flex: 1, gap: 4 },
  title: { fontFamily: vinnotFonts.bold, fontSize: 18, lineHeight: 24, color: vinnotColors.ink },
  subtitle: { fontFamily: vinnotFonts.regular, fontSize: 13, lineHeight: 20, color: vinnotColors.muted },
  sectionTitle: { fontFamily: vinnotFonts.semibold, fontSize: 16, lineHeight: 22, color: vinnotColors.ink },
  loadingBox: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 28 },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 10 },
  footer: { flexDirection: "row", gap: 10, paddingTop: 12, paddingHorizontal: layout.screenHorizontalPadding,
    borderTopWidth: 1, borderColor: vinnotColors.borderSoft, backgroundColor: vinnotColors.surface },
  cancel: { flex: 1 },
  save: { flex: 2 },
});

import { ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { IllustratedState } from "@/presentation/components/ui/IllustratedState";
import { Button } from "@/presentation/components/ui/Button";
import type { IllustratedStateKind } from "@/presentation/feedback/illustratedState";
import { lightTokens } from "@/shared/theme/tokens";
export function ServiceStateScreen({ kind }: { kind: IllustratedStateKind }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <IllustratedState kind={kind}>
        <Button onPress={() => router.replace("/")}>{t("common.goHome")}</Button>
      </IllustratedState>
    </ScrollView>
  );
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: lightTokens.bgBase } });

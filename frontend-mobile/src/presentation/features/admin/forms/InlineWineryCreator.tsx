/**
 * InlineWineryCreator — compact winery form that opens under the winery picker when the
 * winery does not exist yet: name, country and an optional region.
 */
import { StyleSheet, Text, View } from "react-native";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { AdminWinery } from "@/domain/admin/admin.types";
import { QUICK_WINERY_NAME_MAX } from "@/domain/admin/quickWinery";
import { EntityPicker, FormTextField } from "@/presentation/components/forms";
import { Button } from "@/presentation/components/ui/Button";
import { lightTokens, radii, spacing } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { useCountryName } from "@/presentation/hooks/useCountryName";
import { useInlineWineryCreator } from "./useInlineWineryCreator";

export interface InlineWineryCreatorProps {
  initialName: string;
  onCreated: (winery: AdminWinery) => void;
  onCancel: () => void;
}

export function InlineWineryCreator({ initialName, onCreated, onCancel }: InlineWineryCreatorProps) {
  const { t } = useTranslation();
  const countryName = useCountryName();
  const creator = useInlineWineryCreator(initialName, onCreated);
  const { control } = creator.form;
  const countryOptions = creator.countries.map((country) => ({ id: country.id, label: countryName(country.name) }));
  const regionOptions = creator.regions.map((region) => ({ id: region.id, label: region.name }));
  return (
    <View style={styles.card} testID="inline-winery-creator">
      <View style={styles.header}>
        <Text style={styles.title}>{t("admin.wines.inlineWinery.title")}</Text>
        <Text style={styles.hint}>{t("admin.wines.inlineWinery.hint")}</Text>
      </View>
      <FormTextField
        control={control}
        name="name"
        label={t("admin.wineries.name")}
        required
        maxLength={QUICK_WINERY_NAME_MAX}
        editable={!creator.saving}
      />
      <Controller
        control={control}
        name="countryId"
        render={({ field, fieldState }) => (
          <EntityPicker
            label={t("admin.wines.inlineWinery.country")}
            required
            placeholder={t("admin.wines.inlineWinery.countryPlaceholder")}
            options={countryOptions}
            value={countryOptions.find((option) => option.id === field.value) ?? null}
            onChange={(option) => creator.selectCountry(option?.id ?? "")}
            error={fieldState.error?.message}
            disabled={creator.saving}
          />
        )}
      />
      <Controller
        control={control}
        name="regionId"
        render={({ field }) => (
          <EntityPicker
            label={t("admin.wines.inlineWinery.region")}
            placeholder={t("admin.wines.inlineWinery.regionPlaceholder")}
            options={regionOptions}
            loading={creator.regionsLoading}
            emptyLabel={t("admin.wines.inlineWinery.noRegions")}
            value={regionOptions.find((option) => option.id === field.value) ?? null}
            onChange={(option) => field.onChange(option?.id ?? "")}
            disabled={creator.saving || !creator.countryId}
          />
        )}
      />
      <View style={styles.actions}>
        <Button variant="ghost" size="sm" disabled={creator.saving} onPress={onCancel} style={styles.action}>
          {t("common.cancel")}
        </Button>
        <Button size="sm" loading={creator.saving} onPress={() => void creator.submit()} style={styles.action}>
          {t("admin.wines.inlineWinery.submit")}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[3.5],
    padding: spacing[4],
    borderRadius: radii.xl,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: lightTokens.brandSecondaryStrong,
    backgroundColor: lightTokens.brandSecondary,
  },
  header: { gap: spacing[1] },
  title: { ...textStyles.titleSmall, color: lightTokens.textPrimary },
  hint: { ...textStyles.caption, color: lightTokens.textTertiary, lineHeight: 17 },
  actions: { flexDirection: "row", gap: spacing[3] },
  action: { flex: 1 },
});

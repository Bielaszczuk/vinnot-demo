/**
 * Details of a wine route: name, description, status, length, recommended wine types,
 * days and distance. Values are the API codes; labels are translated.
 */
import { View } from "react-native";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ADMIN_ROUTE_LIMITS, type AdminRouteDraft } from "@/domain/admin/adminRouteDraft";
import { ChoiceChips, FormTextField } from "@/presentation/components/forms";
import { DIFFICULTIES, STATUSES, WINE_TYPES } from "./AdminRouteSheet.contracts";
import { styles } from "./AdminRouteSheet.styles";

type Props = {
  form: UseFormReturn<AdminRouteDraft>;
  disabled?: boolean;
};

export function AdminRouteSheetDetailsSection({ form, disabled = false }: Props) {
  const { t } = useTranslation();
  const { control } = form;
  const statusOptions = STATUSES.map((value) => ({ value, label: t(`admin.routes.statusLabels.${value}`) }));
  const difficultyOptions = DIFFICULTIES.map((value) => ({ value, label: t(`admin.routes.difficulty.${value}`) }));
  const wineTypeOptions = WINE_TYPES.map((value) => ({ value, label: t(`wines.types.${value}`) }));

  return (
    <View style={styles.fields}>
      <FormTextField
        control={control}
        name="name"
        label={t("admin.routes.name")}
        required
        placeholder={t("admin.routes.namePlaceholder")}
        maxLength={ADMIN_ROUTE_LIMITS.name}
        editable={!disabled}
      />
      <FormTextField
        control={control}
        name="description"
        label={t("admin.routes.description")}
        placeholder={t("admin.routes.descriptionPlaceholder")}
        multiline
        textAlignVertical="top"
        style={styles.textArea}
        editable={!disabled}
      />
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <ChoiceChips label={t("admin.routes.status")} options={statusOptions} value={field.value} onChange={field.onChange} disabled={disabled} />
        )}
      />
      <Controller
        control={control}
        name="difficulty"
        render={({ field }) => (
          <ChoiceChips label={t("admin.routes.duration")} options={difficultyOptions} value={field.value} onChange={field.onChange} disabled={disabled} />
        )}
      />
      <Controller
        control={control}
        name="recommendedWineTypes"
        render={({ field }) => (
          <ChoiceChips
            multiple
            label={t("admin.routes.recommendedTypes")}
            hint={t("admin.routes.recommendedTypesHint")}
            options={wineTypeOptions}
            value={field.value}
            onChange={field.onChange}
            disabled={disabled}
          />
        )}
      />
      <View style={styles.twoCols}>
        <FormTextField
          control={control}
          name="estimatedDays"
          label={t("admin.routes.estimatedDays")}
          keyboardType="number-pad"
          containerStyle={styles.flexOne}
          editable={!disabled}
        />
        <FormTextField
          control={control}
          name="totalDistance"
          label={t("admin.routes.totalDistance")}
          keyboardType="decimal-pad"
          containerStyle={styles.flexOne}
          editable={!disabled}
        />
      </View>
    </View>
  );
}

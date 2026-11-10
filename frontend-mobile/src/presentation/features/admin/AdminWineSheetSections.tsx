/**
 * Field groups of the admin wine sheet. Each one renders inside a FormSection and binds its
 * controls to the sheet's react-hook-form form.
 */
import { View } from "react-native";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ADMIN_WINE_LIMITS, type AdminWineDraft } from "@/domain/admin/adminWineDraft";
import { CatalogImagePicker } from "@/presentation/components/features/media/CatalogImagePicker";
import { ChoiceChips, FormTextField } from "@/presentation/components/forms";
import { ToggleRow } from "@/presentation/components/ui/Switch";
import { VintageField } from "@/presentation/components/ui/VintageField";
import { ALLERGEN_OPTIONS, WINE_TYPES } from "./AdminWineSheet.contracts";
import { styles } from "./AdminWineSheet.styles";
import { AdminWineTasteTab } from "./AdminWineSheetTasteTab";
import { AdminGrapesPickerField } from "./forms/AdminGrapesPickerField";
import { AdminWineryPickerField } from "./forms/AdminWineryPickerField";

type WineForm = UseFormReturn<AdminWineDraft>;

export function AdminWineGeneralFields({ form, isEdit, disabled }: { form: WineForm; isEdit: boolean; disabled?: boolean }) {
  const { t } = useTranslation();
  const { control, setValue } = form;
  return (
    <View style={styles.fields}>
      <FormTextField
        control={control}
        name="name"
        label={t("admin.wines.name")}
        required
        placeholder={t("admin.wines.namePlaceholder")}
        maxLength={ADMIN_WINE_LIMITS.name}
        editable={!disabled}
      />
      <Controller
        control={control}
        name="wineryId"
        render={({ field, fieldState }) => (
          <AdminWineryPickerField
            value={field.value ? { id: field.value, name: form.getValues("wineryName") } : null}
            onChange={(winery) => {
              setValue("wineryName", winery?.name ?? "", { shouldDirty: true });
              field.onChange(winery?.id ?? "");
            }}
            error={fieldState.error?.message}
            disabled={disabled}
          />
        )}
      />
      <Controller
        control={control}
        name="wineType"
        render={({ field }) => (
          <ChoiceChips
            label={t("admin.wines.type")}
            required
            options={WINE_TYPES.map((value) => ({ value, label: t(`wines.types.${value}`) }))}
            value={field.value}
            onChange={field.onChange}
            disabled={disabled}
          />
        )}
      />
      <Controller
        control={control}
        name="vintage"
        render={({ field }) => (
          <VintageField value={field.value} onChange={field.onChange} disabled={disabled} />
        )}
      />
      <View style={styles.twoCols}>
        <FormTextField
          control={control}
          name="alcoholContent"
          label={t("admin.wines.alcohol")}
          keyboardType="decimal-pad"
          placeholder="13.5"
          containerStyle={styles.col}
          editable={!disabled}
        />
        <FormTextField
          control={control}
          name="style"
          label={t("admin.wines.style")}
          placeholder={t("admin.wines.stylePlaceholder")}
          maxLength={ADMIN_WINE_LIMITS.style}
          containerStyle={styles.col}
          editable={!disabled}
        />
      </View>
      <Controller
        control={control}
        name="isFeatured"
        render={({ field }) => (
          <ToggleRow label={t("admin.wines.featured")} value={field.value} onValueChange={field.onChange} disabled={disabled} />
        )}
      />
      {isEdit && (
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <ToggleRow label={t("admin.wines.active")} value={field.value} onValueChange={field.onChange} disabled={disabled} />
          )}
        />
      )}
    </View>
  );
}

export function AdminWineCompositionFields({ form, disabled }: { form: WineForm; disabled?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.fields}>
      <Controller
        control={form.control}
        name="grapes"
        render={({ field, fieldState }) => (
          <AdminGrapesPickerField
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            disabled={disabled}
          />
        )}
      />
      <Controller
        control={form.control}
        name="allergens"
        render={({ field }) => (
          <ChoiceChips
            multiple
            label={t("admin.wines.allergensTitle")}
            // Codes outside the usual list (older catalog data) stay visible and removable.
            options={[...new Set([...ALLERGEN_OPTIONS, ...field.value])].map((value) => ({
              value,
              label: t(`admin.wines.allergens.${value}`, { defaultValue: value }),
            }))}
            value={field.value}
            onChange={field.onChange}
            disabled={disabled}
          />
        )}
      />
    </View>
  );
}

export function AdminWineDescriptionFields({ form, disabled }: { form: WineForm; disabled?: boolean }) {
  const { t } = useTranslation();
  const [descriptionEs, descriptionEn] = useWatch({ control: form.control, name: ["descriptionEs", "descriptionEn"] });
  return (
    <View style={styles.fields}>
      <FormTextField
        control={form.control}
        name="descriptionEs"
        label={t("admin.wines.descriptionEs")}
        hint={t("admin.wines.charactersCount", { count: descriptionEs.length })}
        placeholder={t("admin.wines.descriptionEsPlaceholder")}
        maxLength={ADMIN_WINE_LIMITS.description}
        multiline
        style={styles.textArea}
        editable={!disabled}
      />
      <FormTextField
        control={form.control}
        name="descriptionEn"
        label={t("admin.wines.descriptionEn")}
        hint={t("admin.wines.charactersCount", { count: descriptionEn.length })}
        placeholder={t("admin.wines.descriptionEnPlaceholder")}
        maxLength={ADMIN_WINE_LIMITS.description}
        multiline
        style={styles.textArea}
        editable={!disabled}
      />
    </View>
  );
}

export function AdminWineMediaFields({
  form,
  active,
  onImageBusyChange,
  disabled,
}: {
  form: WineForm;
  active: boolean;
  onImageBusyChange: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.fields}>
      <Controller
        control={form.control}
        name="imageUrl"
        render={({ field }) => (
          <CatalogImagePicker
            label={t("admin.wines.image")}
            frame="WINE"
            alt={form.getValues("name") || t("admin.wines.wineAlt")}
            value={field.value}
            onChange={field.onChange}
            active={active}
            onBusyChange={onImageBusyChange}
            disabled={disabled}
          />
        )}
      />
      <FormTextField
        control={form.control}
        name="imageUrl"
        label={t("admin.wines.imageUrlOptional")}
        placeholder="https://…"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        maxLength={ADMIN_WINE_LIMITS.imageUrl}
        editable={!disabled}
      />
      <View style={styles.twoCols}>
        <FormTextField
          control={form.control}
          name="priceMin"
          label={t("admin.wines.minPrice")}
          keyboardType="decimal-pad"
          placeholder="1500"
          containerStyle={styles.col}
          editable={!disabled}
        />
        <FormTextField
          control={form.control}
          name="priceMax"
          label={t("admin.wines.maxPrice")}
          keyboardType="decimal-pad"
          placeholder="2500"
          containerStyle={styles.col}
          editable={!disabled}
        />
      </View>
    </View>
  );
}

const SCORE_FIELDS = ["bodyScore", "tanninScore", "sweetnessScore", "acidityScore"] as const;

export function AdminWineTasteFields({
  form,
  editingWineId,
  onOpenAiProfile,
}: {
  form: WineForm;
  editingWineId?: string;
  onOpenAiProfile?: (wineId: string) => void;
}) {
  const [bodyScore, tanninScore, sweetnessScore, acidityScore] = useWatch({
    control: form.control,
    name: SCORE_FIELDS,
  });
  return (
    <AdminWineTasteTab
      form={{ ...form.getValues(), bodyScore, tanninScore, sweetnessScore, acidityScore }}
      patch={(values) => {
        for (const field of SCORE_FIELDS) {
          const value = values[field];
          if (value !== undefined) form.setValue(field, value, { shouldDirty: true });
        }
      }}
      editingWineId={editingWineId}
      onOpenAiProfile={onOpenAiProfile}
    />
  );
}

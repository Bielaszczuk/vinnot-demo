/**
 * Field groups of the route sheet: where the route is, its cover and raw map URL, and the
 * labelled fields of a manual stop.
 */
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronDown, Plus } from "lucide-react-native";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ADMIN_ROUTE_LIMITS,
  type AdminRouteDraft,
  type ManualStopDraft,
  type ManualStopError,
} from "@/domain/admin/adminRouteDraft";
import { ChoiceChips, EntityPicker, FormTextField } from "@/presentation/components/forms";
import { CoverImagePicker } from "@/presentation/components/features/media/CoverImagePicker";
import { Button } from "@/presentation/components/ui/Button";
import { TextField } from "@/presentation/components/ui/TextField";
import { iconStrokes, lightTokens } from "@/shared/theme/tokens";
import { STOP_TYPES } from "./AdminRouteSheet.contracts";
import { styles } from "./AdminRouteSheet.styles";
import type { useRouteLocation } from "./forms/useRouteLocation";

type RouteForm = UseFormReturn<AdminRouteDraft>;

export function RouteLocationFields({
  form,
  location,
  disabled,
}: {
  form: RouteForm;
  location: ReturnType<typeof useRouteLocation>;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.fields}>
      <EntityPicker
        label={t("admin.routes.country")}
        required
        placeholder={t("common.selectCountry")}
        searchPlaceholder={t("admin.routes.countrySearch")}
        options={location.countryOptions}
        value={location.country}
        onChange={location.selectCountry}
        error={form.formState.errors.country?.message}
        disabled={disabled}
      />
      <EntityPicker
        label={t("admin.routes.region")}
        placeholder={t("common.selectRegion")}
        searchPlaceholder={t("admin.routes.regionSearch")}
        options={location.regionOptions}
        value={location.region}
        onChange={location.selectRegion}
        loading={location.regionsLoading}
        emptyLabel={t("admin.routes.noRegions")}
        hint={location.hasCountry ? undefined : t("admin.routes.regionNeedsCountry")}
        disabled={disabled || !location.hasCountry}
      />
      <FormTextField
        control={form.control}
        name="subregion"
        label={t("admin.routes.subregion")}
        placeholder={t("admin.routes.subregionPlaceholder")}
        maxLength={ADMIN_ROUTE_LIMITS.subregion}
        editable={!disabled}
      />
    </View>
  );
}

export function RouteMediaFields({
  form,
  imageUrl,
  active,
  onBusyChange,
  disabled,
}: {
  form: RouteForm;
  imageUrl: string;
  active: boolean;
  onBusyChange: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const mapError = !!form.formState.errors.mapEmbedUrl;
  // An invalid map URL keeps the advanced field open so its error stays visible.
  const open = advancedOpen || mapError;
  return (
    <View style={styles.fields}>
      <CoverImagePicker
        kind="WINE_ROUTE"
        active={active}
        value={imageUrl}
        onChange={(value) => form.setValue("imageUrl", value, { shouldDirty: true })}
        onBusyChange={onBusyChange}
      />
      <View style={styles.advanced}>
        <Pressable
          onPress={() => setAdvancedOpen(!open)}
          accessibilityRole="button"
          accessibilityLabel={t("admin.routes.advanced")}
          accessibilityHint={t("admin.routes.advancedHint")}
          accessibilityState={{ expanded: open }}
          style={styles.advancedToggle}
        >
          <View style={styles.advancedCopy}>
            <Text style={styles.advancedTitle}>{t("admin.routes.advanced")}</Text>
            <Text style={styles.hint}>{t("admin.routes.advancedHint")}</Text>
          </View>
          <ChevronDown
            size={18}
            color={lightTokens.textTertiary}
            strokeWidth={iconStrokes.regular}
            style={open ? styles.chevronOpen : undefined}
          />
        </Pressable>
        {open && (
          <FormTextField
            control={form.control}
            name="mapEmbedUrl"
            label={t("admin.routes.mapEmbedUrl")}
            placeholder="https://www.google.com/maps/embed?…"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!disabled}
          />
        )}
      </View>
    </View>
  );
}

export function ManualStopFields({
  value,
  errors,
  onChange,
  onAdd,
  disabled,
}: {
  value: ManualStopDraft;
  errors: readonly ManualStopError[];
  onChange: (updater: (current: ManualStopDraft) => ManualStopDraft) => void;
  onAdd: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const error = (field: keyof ManualStopDraft) => {
    const code = errors.find((item) => item.field === field)?.code;
    return code ? t(`admin.routes.validation.${code}`) : undefined;
  };
  const set = (field: keyof ManualStopDraft) => (text: string) => onChange((current) => ({ ...current, [field]: text }));
  const typeOptions = STOP_TYPES.map((type) => ({ value: type, label: t(`admin.routes.stopTypes.${type}`) }));
  return (
    <View style={styles.manualBox}>
      <View style={styles.manualHeader}>
        <Text style={styles.manualTitle}>{t("admin.routes.addManualStop")}</Text>
        <Text style={styles.hint}>{t("admin.routes.manualStopHint")}</Text>
      </View>
      <TextField
        label={t("admin.routes.stopName")}
        required
        value={value.name}
        onChangeText={set("name")}
        placeholder={t("admin.routes.stopNamePlaceholder")}
        maxLength={ADMIN_ROUTE_LIMITS.stopName}
        error={error("name")}
        editable={!disabled}
      />
      <ChoiceChips
        label={t("admin.routes.type")}
        options={typeOptions}
        value={value.type}
        onChange={(type) => onChange((current) => ({ ...current, type }))}
        disabled={disabled}
      />
      <TextField
        label={t("admin.routes.stopAddress")}
        value={value.address}
        onChangeText={set("address")}
        placeholder={t("admin.routes.stopAddressPlaceholder")}
        maxLength={ADMIN_ROUTE_LIMITS.stopAddress}
        error={error("address")}
        editable={!disabled}
      />
      <TextField
        label={t("admin.routes.stopDuration")}
        value={value.estimatedDuration}
        onChangeText={set("estimatedDuration")}
        keyboardType="number-pad"
        placeholder="30"
        error={error("estimatedDuration")}
        editable={!disabled}
      />
      <TextField
        label={t("admin.routes.stopDescription")}
        value={value.description}
        onChangeText={set("description")}
        placeholder={t("admin.routes.stopDescriptionPlaceholder")}
        multiline
        textAlignVertical="top"
        style={styles.textArea}
        editable={!disabled}
      />
      <Button
        variant="secondary"
        disabled={disabled}
        onPress={onAdd}
        leftIcon={<Plus size={16} color={lightTokens.brandPrimary} strokeWidth={iconStrokes.strong} />}
      >
        {t("admin.routes.addManualStopCta")}
      </Button>
    </View>
  );
}

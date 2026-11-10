/**
 * Field groups of the admin winery sheet. Each one renders inside a FormSection and binds its
 * controls to the sheet's react-hook-form form.
 */
import { Pressable, Text, View } from "react-native";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { ChevronDown, LocateFixed } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ADMIN_WINERY_LIMITS, type AdminWineryDraft } from "@/domain/admin/adminWineryDraft";
import { CatalogImagePicker } from "@/presentation/components/features/media/CatalogImagePicker";
import { LocationPickerMap } from "@/presentation/components/features/location/LocationPickerMap";
import { EntityPicker, FormTextField } from "@/presentation/components/forms";
import { Button } from "@/presentation/components/ui/Button";
import { PhoneNumberField } from "@/presentation/components/ui/PhoneNumberField";
import { TextField } from "@/presentation/components/ui/TextField";
import { iconStrokes, lightTokens } from "@/shared/theme/tokens";
import { styles } from "./AdminWinerySheet.styles";
import type { WineryImageSlot } from "./forms/useAdminWineryForm";
import type { useWineryLocation } from "./forms/useWineryLocation";

type WineryForm = UseFormReturn<AdminWineryDraft>;
type WineryLocation = ReturnType<typeof useWineryLocation>;

export function WineryIdentityFields({ form, disabled }: { form: WineryForm; disabled?: boolean }) {
  const { t } = useTranslation();
  const { control } = form;
  return (
    <View style={styles.fields}>
      <FormTextField
        control={control}
        name="name"
        label={t("admin.wineries.name")}
        required
        placeholder={t("admin.wineries.namePlaceholder")}
        maxLength={ADMIN_WINERY_LIMITS.name}
        editable={!disabled}
      />
      <Controller
        control={control}
        name="establishedYear"
        render={({ field, fieldState }) => (
          <TextField
            ref={field.ref}
            label={t("admin.wineries.establishedYear")}
            value={field.value}
            // Digits only: a year never holds anything else.
            onChangeText={(value) => field.onChange(value.replace(/\D/g, ""))}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            hint={t("admin.wineries.establishedYearHint")}
            keyboardType="number-pad"
            maxLength={ADMIN_WINERY_LIMITS.year}
            placeholder="1902"
            containerStyle={styles.yearField}
            editable={!disabled}
          />
        )}
      />
      <FormTextField
        control={control}
        name="descriptionEs"
        label={t("admin.wineries.descriptionEs")}
        placeholder={t("admin.wineries.descriptionPlaceholder")}
        maxLength={ADMIN_WINERY_LIMITS.description}
        multiline
        style={styles.textArea}
        editable={!disabled}
      />
      <FormTextField
        control={control}
        name="descriptionEn"
        label={t("admin.wineries.descriptionEn")}
        placeholder={t("admin.wineries.descriptionEnPlaceholder")}
        maxLength={ADMIN_WINERY_LIMITS.description}
        multiline
        style={styles.textArea}
        editable={!disabled}
      />
    </View>
  );
}

export function WineryLocationFields({
  form,
  location,
  disabled,
}: {
  form: WineryForm;
  location: WineryLocation;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const { control, formState } = form;
  const wineryName = useWatch({ control, name: "name" });
  return (
    <View style={styles.fields}>
      <EntityPicker
        label={t("admin.wineries.country")}
        required
        placeholder={t("common.selectCountry")}
        searchPlaceholder={t("admin.wineries.countrySearch")}
        options={location.countryOptions}
        value={location.country}
        onChange={location.selectCountry}
        error={formState.errors.countryId?.message}
        disabled={disabled}
      />
      <EntityPicker
        label={t("admin.wineries.region")}
        placeholder={t("common.selectRegion")}
        searchPlaceholder={t("admin.wineries.regionSearch")}
        options={location.regionOptions}
        value={location.region}
        onChange={location.selectRegion}
        loading={location.regionsLoading}
        emptyLabel={t("admin.wineries.noRegions")}
        hint={location.hasCountry ? undefined : t("admin.wineries.regionNeedsCountry")}
        disabled={disabled || !location.hasCountry}
      />
      <FormTextField
        control={control}
        name="subregion"
        label={t("admin.wineries.subregion")}
        placeholder={t("admin.wineries.subregionPlaceholder")}
        maxLength={ADMIN_WINERY_LIMITS.subregion}
        editable={!disabled}
      />
      <FormTextField
        control={control}
        name="address"
        label={t("admin.wineries.address")}
        placeholder={t("admin.wineries.addressPlaceholder")}
        maxLength={ADMIN_WINERY_LIMITS.address}
        editable={!disabled}
      />
      <WineryLocationSection
        searchAddress={location.searchAddress}
        setSearchAddress={location.setSearchAddress}
        runGeocode={location.runGeocode}
        isGeocoding={location.isGeocoding}
        latitude={location.point.latitude}
        longitude={location.point.longitude}
        wineryName={wineryName}
        onMarkerDragEnd={location.moveMarker}
      />
      <AdvancedCoordinates
        form={form}
        open={location.advancedOpen}
        onToggle={location.toggleAdvanced}
        disabled={disabled}
      />
    </View>
  );
}

function AdvancedCoordinates({
  form,
  open,
  onToggle,
  disabled,
}: {
  form: WineryForm;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.advanced}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={t("admin.wineries.advanced")}
        accessibilityHint={t("admin.wineries.advancedHint")}
        accessibilityState={{ expanded: open }}
        style={styles.advancedToggle}
      >
        <View style={styles.advancedCopy}>
          <Text style={styles.advancedTitle}>{t("admin.wineries.advanced")}</Text>
          <Text style={styles.hint}>{t("admin.wineries.advancedHint")}</Text>
        </View>
        <ChevronDown
          size={18}
          color={lightTokens.textTertiary}
          strokeWidth={iconStrokes.regular}
          style={open ? styles.chevronOpen : undefined}
        />
      </Pressable>
      {open && (
        <View style={styles.twoCols}>
          <FormTextField
            control={form.control}
            name="latitude"
            label={t("admin.wineries.latitude")}
            placeholder="-33.3712"
            // number-pad and decimal-pad have no minus sign on iOS.
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            containerStyle={styles.col}
            editable={!disabled}
          />
          <FormTextField
            control={form.control}
            name="longitude"
            label={t("admin.wineries.longitude")}
            placeholder="-69.1517"
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            containerStyle={styles.col}
            editable={!disabled}
          />
        </View>
      )}
    </View>
  );
}

export function WineryContactFields({
  form,
  wineryKey,
  disabled,
}: {
  form: WineryForm;
  /** Remounts the phone field, which keeps its own country choice, for another winery. */
  wineryKey: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const { control } = form;
  return (
    <View style={styles.fields}>
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <PhoneNumberField
            key={wineryKey}
            allowLandline
            label={t("admin.wineries.phone")}
            hint={t("admin.wineries.phoneHint")}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            disabled={disabled}
          />
        )}
      />
      <FormTextField
        control={control}
        name="email"
        label={t("admin.wineries.email")}
        placeholder="contacto@bodega.com"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={ADMIN_WINERY_LIMITS.email}
        editable={!disabled}
      />
      <FormTextField
        control={control}
        name="website"
        label={t("admin.wineries.website")}
        placeholder="https://www.bodega.com"
        keyboardType="url"
        textContentType="URL"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={ADMIN_WINERY_LIMITS.website}
        editable={!disabled}
      />
    </View>
  );
}

export function WineryImageFields({
  form,
  active,
  onBusyChange,
  disabled,
}: {
  form: WineryForm;
  active: boolean;
  onBusyChange: (slot: WineryImageSlot, busy: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const name = useWatch({ control: form.control, name: "name" });
  const alt = name || t("admin.wineries.wineryAlt");
  return (
    <View style={styles.fields}>
      <Controller
        control={form.control}
        name="logoUrl"
        render={({ field }) => (
          <CatalogImagePicker
            label={t("admin.wineries.logo")}
            frame="LOGO"
            alt={alt}
            value={field.value}
            onChange={field.onChange}
            active={active}
            onBusyChange={(busy) => onBusyChange("logo", busy)}
            disabled={disabled}
          />
        )}
      />
      <Controller
        control={form.control}
        name="imageUrl"
        render={({ field }) => (
          <CatalogImagePicker
            label={t("admin.wineries.cover")}
            frame="COVER"
            alt={alt}
            value={field.value}
            onChange={field.onChange}
            active={active}
            fit="cover"
            onBusyChange={(busy) => onBusyChange("cover", busy)}
            disabled={disabled}
          />
        )}
      />
    </View>
  );
}

type WineryLocationSectionProps = {
  searchAddress: string;
  setSearchAddress: (value: string) => void;
  runGeocode: () => Promise<void>;
  isGeocoding: boolean;
  latitude: number | null;
  longitude: number | null;
  wineryName: string;
  onMarkerDragEnd: (latitude: number, longitude: number) => void;
};

export function WineryLocationSection({
  searchAddress,
  setSearchAddress,
  runGeocode,
  isGeocoding,
  latitude,
  longitude,
  wineryName,
  onMarkerDragEnd,
}: WineryLocationSectionProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{t("admin.wineries.mapLocation")}</Text>
      <View style={styles.locationSearchRow}>
        <TextField
          containerStyle={styles.locationSearchInput}
          value={searchAddress}
          onChangeText={setSearchAddress}
          placeholder={t("admin.wineries.locationSearchPlaceholder")}
          accessibilityLabel={t("admin.wineries.locationSearchPlaceholder")}
          returnKeyType="search"
          onSubmitEditing={() => void runGeocode()}
        />
        <Button
          loading={isGeocoding}
          onPress={() => void runGeocode()}
          leftIcon={<LocateFixed size={18} color={lightTokens.textInverted} />}
          style={styles.locationSearchButton}
        >
          {t("common.search")}
        </Button>
      </View>
      <LocationPickerMap
        latitude={latitude}
        longitude={longitude}
        title={wineryName || t("admin.wineries.wineryAlt")}
        onChange={onMarkerDragEnd}
      />
      <Text style={styles.hint}>{t("admin.wineries.mapHelp")}</Text>
    </View>
  );
}

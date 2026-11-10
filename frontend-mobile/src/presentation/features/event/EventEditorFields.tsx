import { CheckCircle2 } from "lucide-react-native";
import { systemColors, radii } from "@/shared/theme/tokens";
import { usePaymentAccountSetup } from "@/presentation/hooks/usePaymentAccountSetup";
import { useState, type ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Controller, type Control, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { eventEditorSection, type EventEditorSection } from "./eventEditorSections";
import { FormSection } from "@/presentation/components/ui/FormSection";
import { ChoiceChips } from "@/presentation/components/forms/ChoiceChips";
import { EntityPicker } from "@/presentation/components/forms/EntityPicker";
import { TextField } from "@/presentation/components/ui/TextField";
import { Button } from "@/presentation/components/ui/Button";
import { CoverImagePicker } from "@/presentation/components/features/media/CoverImagePicker";
import { LocationPickerMap } from "@/presentation/components/features/location/LocationPickerMap";
import { EventDateTimeField } from "./EventDateTimeField";
import { EVENT_TYPES, EVENT_STATUSES, type EventSheetFormValues } from "./EventEditor.contracts";
import { vinnotColors as colors, vinnotFonts as fonts } from "@/shared/theme/vinnotTheme";
import { ToggleRow } from "@/presentation/components/ui/Switch";
import { fontSizes } from "@/shared/theme/typography";

type TextKey = {
  [K in keyof EventSheetFormValues]: EventSheetFormValues[K] extends string ? K : never;
}[keyof EventSheetFormValues];
function Field({
  control,
  name,
  ...props
}: { control: Control<EventSheetFormValues>; name: TextKey } & ComponentProps<typeof TextField>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...props}
          ref={field.ref}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
type Props = {
  form: UseFormReturn<EventSheetFormValues>;
  active: boolean;
  imageUploading: boolean;
  onImageBusyChange: (value: boolean) => void;
  searchAddress: string;
  onSearchChange: (value: string) => void;
  runGeocode: () => Promise<void>;
  isGeocoding: boolean;
  onLocationChange: (latitude: number, longitude: number) => void;
};
export function EventEditorFields({
  form,
  active,
  imageUploading,
  onImageBusyChange,
  searchAddress,
  onSearchChange,
  runGeocode,
  isGeocoding,
  onLocationChange,
}: Props) {
  const paymentSetup = usePaymentAccountSetup(active);
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<EventEditorSection[]>(["basic"]);
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const values = watch();
  const sectionErrors = (section: EventEditorSection) =>
    Object.keys(errors).filter((field) => eventEditorSection(field) === section);
  const section = (id: EventEditorSection, summary: string) => ({
    title: t(`eventEditor.sections.${id}`),
    summary,
    open: expanded.includes(id) || sectionErrors(id).length > 0,
    invalid: sectionErrors(id).length > 0,
    onToggle: () =>
      setExpanded((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      ),
  });
  const options = (items: string[], prefix: string) =>
    items.map((value) => ({ value, label: t(`${prefix}.${value}`) }));
  const typeOptions = EVENT_TYPES.map((value) => ({ id: value, label: t(`events.types.${value}`) }));
  return (
    <>
      {Object.keys(errors).length > 0 && (
        <Text style={styles.error} accessibilityRole="alert">
          {t("eventEditor.fixErrors")}
        </Text>
      )}
      <FormSection
        {...section("basic", values.title.trim() || t("eventEditor.basicSummary"))}
        disabled={imageUploading}
      >
        <Field
          control={control}
          name="title"
          label={t("partner.fields.title")}
          required
          maxLength={255}
        />
        <Field
          control={control}
          name="description"
          label={t("partner.fields.description")}
          multiline
          style={styles.multiline}
          maxLength={20000}
        />
        <Controller
          control={control}
          name="imageUrl"
          render={({ field }) => (
            <CoverImagePicker
              kind="EVENT"
              active={active}
              value={field.value}
              onChange={field.onChange}
              onBusyChange={onImageBusyChange}
            />
          )}
        />
        <EntityPicker
          label={t("partner.fields.type")}
          placeholder={t("partner.fields.typePlaceholder")}
          options={typeOptions}
          value={typeOptions.find((option) => option.id === values.type) ?? null}
          onChange={(option) => option && setValue("type", option.id, { shouldDirty: true })}
          searchable={false}
          testID="event-type"
        />
        <ChoiceChips
          label={t("partner.fields.status")}
          options={[...new Set([...EVENT_STATUSES, values.status])].map((value) => ({
            value,
            label: t(`events.statusLabels.${value.toLowerCase()}`),
          }))}
          value={values.status}
          onChange={(value) => setValue("status", value, { shouldDirty: true })}
        />
        {(["startDate", "endDate"] as const).map((name) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field, fieldState }) => (
              <View>
                <EventDateTimeField
                  label={t(`partner.fields.${name}`)}
                  value={field.value}
                  onChange={field.onChange}
                />
                {fieldState.error && <Text style={styles.error}>{fieldState.error.message}</Text>}
              </View>
            )}
          />
        ))}
      </FormSection>
      <FormSection
        {...section("location", values.locationName || t("eventEditor.locationSummary"))}
      >
        <TextField
          label={t("events.searchLocation")}
          value={searchAddress}
          onChangeText={onSearchChange}
          returnKeyType="search"
          onSubmitEditing={() => void runGeocode()}
        />
        <Button variant="outline" loading={isGeocoding} onPress={() => void runGeocode()}>
          {t("common.search")}
        </Button>
        <LocationPickerMap
          latitude={values.latitude}
          longitude={values.longitude}
          title={values.locationName}
          onChange={onLocationChange}
        />
        {(errors.latitude || errors.longitude) && (
          <Text style={styles.error}>{errors.latitude?.message ?? errors.longitude?.message}</Text>
        )}
        <Field
          control={control}
          name="locationName"
          label={t("partner.fields.locationName")}
          maxLength={255}
        />
        <Field
          control={control}
          name="locationAddress"
          label={t("partner.fields.locationAddress")}
          maxLength={500}
        />
        <Field
          control={control}
          name="locationCity"
          label={t("partner.fields.city")}
          maxLength={100}
        />
        <Field
          control={control}
          name="locationRegion"
          label={t("partner.fields.region")}
          maxLength={100}
        />
        <Field
          control={control}
          name="locationCountry"
          label={t("eventEditor.country")}
          maxLength={100}
        />
      </FormSection>
      <FormSection {...section("contact", values.contactEmail || t("eventEditor.contactSummary"))}>
        <Field
          control={control}
          name="contactEmail"
          label={t("partner.fields.contactEmail")}
          keyboardType="email-address"
          autoCapitalize="none"
          maxLength={255}
        />
        <Field
          control={control}
          name="contactPhone"
          label={t("eventEditor.phone")}
          keyboardType="phone-pad"
          placeholder="+54…"
          maxLength={50}
        />
        <Field
          control={control}
          name="websiteUrl"
          label={t("partner.fields.websiteUrl")}
          keyboardType="url"
          autoCapitalize="none"
          maxLength={500}
        />
      </FormSection>
      <FormSection
        {...section(
          "registration",
          `${t(values.pricingMode === "PAID" ? "eventEditor.paid" : "eventEditor.free")} · ${values.maxAttendees ? t("eventEditor.spots", { count: Number(values.maxAttendees) }) : t("eventEditor.unlimited")}`,
        )}
      >
        <ChoiceChips
          label={t("eventEditor.registrationType")}
          value={values.pricingMode}
          options={[
            { value: "FREE", label: t("eventEditor.free") },
            { value: "PAID", label: t("eventEditor.paid") },
          ]}
          onChange={(value) => {
            setValue("pricingMode", value as "FREE" | "PAID", { shouldDirty: true });
            if (value === "FREE")
              setValue("price", "", { shouldDirty: true, shouldValidate: true });
          }}
        />
        {values.pricingMode === "PAID" && (
          <>
            <Text style={styles.hint}>{t("eventEditor.externalPayment")}</Text>
            {paymentSetup.commissionRate && (
              <Text style={styles.hint}>
                {t("eventEditor.commissionRate", { rate: paymentSetup.commissionRate })}
              </Text>
            )}
            {paymentSetup.connected ? (
              <View style={styles.paymentConnected} accessibilityLiveRegion="polite">
                <CheckCircle2 size={22} color={systemColors.successText} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.paymentConnectedTitle}>
                    {t("eventEditor.paymentsConnected")}
                  </Text>
                  <Text style={styles.hint}>{t("eventEditor.paymentsConnectedDetail")}</Text>
                </View>
              </View>
            ) : (
              <Text accessibilityRole="text" style={styles.hint}>
                {t(
                  paymentSetup.checking
                    ? "eventEditor.checkingPayments"
                    : paymentSetup.statusError
                      ? "eventEditor.paymentsStatusError"
                      : "eventEditor.connectPaymentsWeb",
                )}
              </Text>
            )}
            <Button
              variant={paymentSetup.connected ? "ghost" : "outline"}
              disabled={paymentSetup.checking}
              loading={paymentSetup.pending}
              onPress={() => void paymentSetup.open()}
            >
              {t(
                paymentSetup.connected
                  ? "eventEditor.reconnectPayments"
                  : "eventEditor.connectPayments",
              )}
            </Button>
            <Field
              control={control}
              name="price"
              label={t("partner.fields.price")}
              keyboardType="decimal-pad"
              required
            />
          </>
        )}
        {values.pricingMode === "PAID" && (
          <ChoiceChips
            label={t("partner.registration.currency")}
            value={values.currency}
            options={[{ value: "ARS", label: t("eventEditor.currencyArs") }]}
            onChange={(value) => setValue("currency", value, { shouldDirty: true })}
          />
        )}
        <Field
          control={control}
          name="maxAttendees"
          label={t("partner.fields.maxAttendees")}
          hint={t("eventEditor.capacityHelp")}
          keyboardType="number-pad"
        />
        <Field
          control={control}
          name="maxTicketsPerRegistration"
          label={t("partner.registration.maxTickets")}
          keyboardType="number-pad"
        />
        <Controller
          control={control}
          name="registrationDeadline"
          render={({ field, fieldState }) => (
            <View>
              <EventDateTimeField
                label={t("partner.registration.deadline")}
                value={field.value}
                onChange={field.onChange}
                optional
              />
              {fieldState.error && <Text style={styles.error}>{fieldState.error.message}</Text>}
            </View>
          )}
        />
        {values.pricingMode === "FREE" && (
          <>
            <ChoiceChips
              label={t("partner.registration.approvalMode")}
              options={options(["MANUAL", "AUTOMATIC"], "partner.approvalModes")}
              value={values.approvalMode}
              onChange={(value) =>
                setValue("approvalMode", value as "MANUAL" | "AUTOMATIC", { shouldDirty: true })
              }
            />
            <Controller
              control={control}
              name="attendeeConfirmationRequired"
              render={({ field }) => (
                <ToggleRow
                  label={t("partner.registration.attendeeConfirmation")}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
          </>
        )}
        <Field
          control={control}
          name="registrationHoldMinutes"
          label={t("partner.registration.holdMinutes")}
          hint={t("eventEditor.holdHelp")}
          keyboardType="number-pad"
        />
      </FormSection>
    </>
  );
}
const styles = StyleSheet.create({
  paymentConnected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radii.xl,
    padding: 16,
    backgroundColor: systemColors.successLight,
  },
  paymentConnectedTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: fontSizes.ui,
    color: systemColors.successText,
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  hint: { fontFamily: fonts.regular, color: colors.muted, fontSize: fontSizes.sm, lineHeight: 20 },
  error: { color: colors.danger, fontFamily: fonts.regular, fontSize: fontSizes.sm, lineHeight: 20 },
});

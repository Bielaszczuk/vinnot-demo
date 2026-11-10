import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { ExtractedLabelData, WineSubmissionResult } from "@/domain/wine/wine.types";
import { parseAlcoholContent, wineSubmissionSchema, type WineSubmissionFormInput } from "@/domain/wine/wine.validators";
import { Button } from "@/presentation/components/ui/Button";
import { TextField } from "@/presentation/components/ui/TextField";
import { useSubmitWine } from "@/presentation/hooks/queries/wine/useWines";
import { useToast } from "@/presentation/providers/ToastProvider";
import { splitGrapes } from "@/domain/wine/catalogChoice";
import { CatalogSelectField } from "./CatalogSelectField";
import { GrapesSelectField } from "./GrapesSelectField";
import { useSubmissionCatalogFields } from "./useSubmissionCatalogFields";
import { useWineLabelCamera } from "@/presentation/providers/WineLabelCameraProvider";
import { lightTokens, radii, spacing, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

const WINE_TYPES = ["RED", "WHITE", "ROSE", "SPARKLING", "DESSERT", "FORTIFIED", "ORANGE"] as const;

interface WineSubmissionFormProps {
  /** Label photo; null when the person has no bottle at hand. */
  imageUri: string | null;
  extractedData: ExtractedLabelData | null;
  onCancel: () => void;
  onComplete: (result: WineSubmissionResult) => void;
}

export function WineSubmissionForm({
  imageUri,
  extractedData,
  onCancel,
  onComplete,
}: WineSubmissionFormProps) {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const submitMutation = useSubmitWine();
  const { retainImage } = useWineLabelCamera();
  const form = useForm<WineSubmissionFormInput>({
    resolver: zodResolver(wineSubmissionSchema),
    defaultValues: {
      wineName: extractedData?.wineName ?? "",
      wineryName: extractedData?.wineryName ?? "",
      wineType: extractedData?.wineType ?? "",
      vintage: extractedData?.vintage ? String(extractedData.vintage) : "",
      grapes: splitGrapes(extractedData?.grapeVariety),
      country: extractedData?.country ?? "",
      region: extractedData?.region ?? "",
      alcoholContent: extractedData?.alcoholContent?.replace("%", "") ?? "",
      notes: "",
    },
  });
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = form;
  const catalog = useSubmissionCatalogFields(form);

  const submit = handleSubmit(async (values) => {
    const release = imageUri ? retainImage(imageUri) : () => undefined;
    try {
      const result = await submitMutation.mutateAsync({
        imageUri,
        wineName: values.wineName.trim(),
        ...catalog.values,
        wineType: values.wineType || undefined,
        vintage: values.vintage ? Number(values.vintage) : undefined,
        alcoholContent: values.alcoholContent ? parseAlcoholContent(values.alcoholContent) : undefined,
        notes: values.notes || undefined,
      });
      // The backend message is English diagnostic text; the person reads translated copy.
      const message = t(`scan.submissionForm.result.${result.status}`, {
        defaultValue: t("scan.submissionForm.result.PENDING"),
      });
      if (result.status === "REJECTED") {
        showError(message);
      } else {
        showSuccess(message);
      }
      onComplete(result);
    } catch {
      showError(t("scan.submissionForm.error"));
    } finally {
      release();
    }
  });

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>{t("scan.submissionForm.title")}</Text>
        <Text style={styles.description}>
          {t(imageUri ? "scan.submissionForm.description" : "scan.submissionForm.descriptionNoPhoto")}
        </Text>
        {!imageUri && (
          <Text style={styles.noPhotoNotice}>{t("scan.submissionForm.noPhotoNotice")}</Text>
        )}
      </View>

      <Controller
        control={control}
        name="wineName"
        render={({ field }) => (
          <TextField
            label={t("scan.submissionForm.wineName")}
            required
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.wineName ? t("scan.submissionForm.invalid") : undefined}
          />
        )}
      />
      <CatalogSelectField
        label={t("scan.submissionForm.wineryName")}
        required
        remoteOptions
        {...catalog.winery}
        error={errors.wineryName ? t("scan.submissionForm.invalid") : undefined}
      />

      <Controller
        control={control}
        name="wineType"
        render={({ field }) => (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t("scan.submissionForm.wineType")}</Text>
            <View style={styles.chips}>
              {WINE_TYPES.map((type) => {
                const selected = field.value === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => field.onChange(selected ? "" : type)}
                    style={[styles.chip, selected && styles.chipSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {t(`wines.types.${type}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />

      <View style={styles.row}>
        <Controller
          control={control}
          name="vintage"
          render={({ field }) => (
            <TextField
              containerStyle={styles.flex}
              label={t("scan.submissionForm.vintage")}
              keyboardType="number-pad"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.vintage ? t("scan.submissionForm.invalid") : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name="alcoholContent"
          render={({ field }) => (
            <TextField
              containerStyle={styles.flex}
              label={t("scan.submissionForm.alcoholContent")}
              keyboardType="decimal-pad"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.alcoholContent ? t("scan.submissionForm.invalid") : undefined}
            />
          )}
        />
      </View>

      <GrapesSelectField
        label={t("scan.submissionForm.grapes")}
        {...catalog.grapes}
        error={errors.grapes ? t("scan.submissionForm.invalid") : undefined}
      />
      <CatalogSelectField
        label={t("scan.submissionForm.country")}
        {...catalog.country}
        error={errors.country ? t("scan.submissionForm.invalid") : undefined}
      />
      <CatalogSelectField
        label={t("scan.submissionForm.region")}
        {...catalog.region}
        hint={catalog.country.value.id ? undefined : t("scan.submissionForm.catalog.regionNeedsCountry")}
        error={errors.region ? t("scan.submissionForm.invalid") : undefined}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <TextField
            label={t("scan.submissionForm.notes")}
            value={field.value}
            onChangeText={field.onChange}
            multiline
            error={errors.notes ? t("scan.submissionForm.invalid") : undefined}
          />
        )}
      />

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          {t("scan.submissionForm.notice")}
        </Text>
      </View>
      <Button fullWidth size="lg" loading={submitMutation.isPending} onPress={submit}>
        {t("scan.submissionForm.submit")}
      </Button>
      <Button fullWidth size="lg" variant="ghost" onPress={onCancel}>
        {t("common.cancel")}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[4] },
  heading: { gap: spacing[1] },
  title: { ...textStyles.headingMedium, color: lightTokens.textPrimary },
  description: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
  noPhotoNotice: {
    ...textStyles.bodySmall,
    marginTop: spacing[2],
    padding: spacing[3],
    borderRadius: radii.md,
    color: wine[800],
    backgroundColor: wine[50],
  },
  fieldGroup: { gap: spacing[2] },
  fieldLabel: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing[3],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  chipSelected: { borderColor: wine[600], backgroundColor: wine[50] },
  chipText: { ...textStyles.labelMedium, color: lightTokens.textSecondary },
  chipTextSelected: { color: wine[700] },
  row: { flexDirection: "row", gap: spacing[3] },
  flex: { flex: 1 },
  notice: {
    padding: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: wine[50],
  },
  noticeText: { ...textStyles.bodySmall, color: wine[800] },
});

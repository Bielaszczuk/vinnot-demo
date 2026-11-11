/**
 * CellarAddSheet — bottom sheet form for adding/editing cellar entries.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react-native";
import { Button } from "@/presentation/components/ui/Button";
import { WineImage } from "@/presentation/features/wine/WineImage";
import { SearchField, TextField } from "@/presentation/components/ui/TextField";
import { VintageField } from "@/presentation/components/ui/VintageField";
import {
  useAddCellarEntry,
  useCellar,
  useUpdateCellarEntry,
} from "@/presentation/hooks/queries/cellar";
import { useWines } from "@/presentation/hooks/queries/wine/useWines";
import { useDebounce } from "@/presentation/hooks/ui";
import { useToast } from "@/presentation/providers/ToastProvider";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import type { CellarEntry } from "@/domain/cellar/cellar.types";
import { vintageChange } from "@/domain/wine/vintage";
import { formatPurchasePriceInput, parsePurchasePrice } from "@/domain/cellar/purchasePrice";
import { toWineType, type WineSummary } from "@/domain/wine/wine.types";
import { RatingPourControl } from "@/presentation/features/wine/rating/RatingPourControl";
import { fontSizes } from "@/shared/theme/typography";
import { iconStrokes, radii } from "@/shared/theme/tokens";

interface CellarAddSheetProps {
  visible: boolean;
  entry?: CellarEntry | null;
  initialWine?: WineSummary | null;
  /** Vintage read on a scanned label; it prefills only a new entry, never an edited one. */
  initialVintage?: number | null;
  onClose: () => void;
}

interface FormValues {
  rating: number | null;
  purchasePrice: string;
  notes: string;
  vintage: number | null;
}

export function CellarAddSheet({
  visible,
  entry,
  initialWine,
  initialVintage,
  onClose,
}: CellarAddSheetProps) {
  const { t, i18n } = useTranslation();
  // Prices are typed the way the app language writes numbers ("12,50" in es-AR).
  const numberLocale = i18n?.language ?? "es-AR";
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["88%"], []);
  const { showSuccess, showError } = useToast();
  const [search, updateSearch] = useState("");
  const [selectedWine, chooseWine] = useState<WineSummary | null>(null);
  const debouncedSearch = useDebounce(search.trim(), 300);
  const winesQuery = useWines(debouncedSearch ? { search: debouncedSearch } : undefined, 0, 8);
  const addMutation = useAddCellarEntry();
  const updateMutation = useUpdateCellarEntry();
  const isEdit = !!entry;
  const hasFixedWine = !isEdit && !!initialWine;
  const { data: cellarEntries } = useCellar({ enabled: visible && !isEdit && !hasFixedWine });
  // The API rejects a second entry for the same wine, so those results are shown but not pickable.
  const cellarWineIds = useMemo(
    () => new Set((cellarEntries ?? []).map((cellarEntry) => cellarEntry.wine.id)),
    [cellarEntries],
  );

  const { control, handleSubmit, reset, setValue: updateFieldValue, watch } = useForm<FormValues>({
    defaultValues: { rating: null, purchasePrice: "", notes: "", vintage: null },
  });
  const rating = watch("rating");

  useEffect(() => {
    if (!visible) {
      sheetRef.current?.dismiss();
      return;
    }

    reset({
      rating: entry?.rating ?? null,
      purchasePrice: formatPurchasePriceInput(entry?.purchasePrice, numberLocale),
      notes: entry?.notes ?? "",
      vintage: entry ? (entry.vintage ?? null) : (initialVintage ?? null),
    });
    chooseWine(initialWine ?? null);
    updateSearch("");
    sheetRef.current?.present();
  }, [entry, initialVintage, initialWine, numberLocale, reset, visible]);

  const onSubmit = (values: FormValues) => {
    const price = parsePurchasePrice(values.purchasePrice, numberLocale);
    // The field rule already blocks invalid input; never send a value it could not read.
    if (!price.ok) return;
    const payload = {
      rating: values.rating,
      purchasePrice: price.value,
      notes: values.notes.trim() || null,
    };

    if (entry) {
      // Only a changed vintage is sent, so the API keeps the stored one otherwise.
      const vintage = vintageChange(entry.vintage ?? null, values.vintage);
      updateMutation.mutate(
        { id: entry.id, updates: { ...payload, ...(vintage !== undefined ? { vintage } : {}) } },
        {
          onSuccess: () => {
            showSuccess(t("cellar.updateSuccess"));
            onClose();
          },
          onError: () => showError(t("cellar.updateError")),
        },
      );
      return;
    }

    if (!selectedWine) {
      showError(t("cellar.selectWineError"));
      return;
    }

    addMutation.mutate(
      { wineId: selectedWine.id, ...payload, ...(values.vintage != null ? { vintage: values.vintage } : {}) },
      {
        onSuccess: () => {
          showSuccess(t("cellar.addSuccess"));
          onClose();
        },
        onError: () => showError(t("cellar.addError")),
      },
    );
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{isEdit ? t("cellar.editNotes") : t("cellar.addWine")}</Text>
          <Text style={styles.subtitle}>
            {isEdit ? entry?.wine.name : t("cellar.addSheetSubtitle")}
          </Text>
          <Text style={styles.subtitle}>{t("cellar.privateNotesDescription")}</Text>
        </View>

        {hasFixedWine && selectedWine && (
          <View style={styles.block}>
            <Text style={styles.label}>{t("cellar.selectWine")}</Text>
            <View style={[styles.wineOption, styles.wineOptionSelected]}>
              <WineImage
                uri={selectedWine.imageUrl} wineType={selectedWine.type}
                alt={selectedWine.name}
                style={styles.wineImage}
                containerStyle={styles.wineImage}
                contentFit="contain"
              />
              <View style={styles.wineInfo}>
                <Text numberOfLines={1} style={styles.wineName}>{selectedWine.name}</Text>
                <Text numberOfLines={1} style={styles.wineMeta}>
                  {selectedWine.winery}{selectedWine.vintage ? ` · ${selectedWine.vintage}` : ""}
                </Text>
              </View>
            </View>
          </View>
        )}

        {!isEdit && !hasFixedWine && (
          <View style={styles.block}>
            <Text style={styles.label}>{t("cellar.selectWine")}</Text>
            <SearchField
              value={search}
              onChangeText={updateSearch}
              onClear={() => updateSearch("")}
              placeholder={t("cellar.searchWinePlaceholder")}
            />
            <View style={styles.results}>
              {(winesQuery.data?.items ?? []).map((wineItem) => {
                const inCellar = cellarWineIds.has(wineItem.id);
                return (
                <Pressable
                  key={wineItem.id}
                  accessibilityRole="button"
                  accessibilityLabel={wineItem.name}
                  accessibilityState={{ disabled: inCellar, selected: selectedWine?.id === wineItem.id }}
                  disabled={inCellar}
                  onPress={() => chooseWine(wineItem)}
                  style={[
                    styles.wineOption,
                    selectedWine?.id === wineItem.id && styles.wineOptionSelected,
                    inCellar && styles.wineOptionInCellar,
                  ]}
                >
                  <WineImage
                    uri={wineItem.imageUrl} wineType={wineItem.type}
                    alt={wineItem.name}
                    style={styles.wineImage}
                    containerStyle={styles.wineImage}
                    contentFit="contain"
                  />
                  <View style={styles.wineInfo}>
                    <Text numberOfLines={1} style={styles.wineName}>{wineItem.name}</Text>
                    <Text numberOfLines={1} style={styles.wineMeta}>
                      {wineItem.winery}{wineItem.vintage ? ` · ${wineItem.vintage}` : ""}
                    </Text>
                    {inCellar && <Text style={styles.inCellarText}>{t("cellar.alreadyInCellar")}</Text>}
                  </View>
                  {selectedWine?.id === wineItem.id && (
                    <View style={styles.selectedMark}>
                      <Check size={14} color={vinnotColors.white} strokeWidth={iconStrokes.heavy} />
                    </View>
                  )}
                </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.block}>
          <RatingPourControl
            value={rating ?? 0}
            onChange={(next) => updateFieldValue("rating", next)}
            wineType={toWineType(isEdit ? entry?.wine.type : selectedWine?.type)}
          />
          {rating != null && (
            <Pressable onPress={() => updateFieldValue("rating", null)} hitSlop={8} accessibilityRole="button"
              style={styles.clearRating}>
              <Text style={styles.clearRatingText}>{t("reviews.form.clearRating")}</Text>
            </Pressable>
          )}
        </View>

        <Controller
          control={control}
          name="vintage"
          render={({ field: { onChange, value } }) => (
            <VintageField
              value={value}
              onChange={onChange}
              suggestedYear={isEdit ? entry?.wine.vintage : selectedWine?.vintage}
            />
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <TextField
              label={t("cellar.notes")}
              placeholder={t("cellar.notesPlaceholder")}
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={4}
              style={styles.textArea}
            />
          )}
        />

        <Controller
          control={control}
          name="purchasePrice"
          rules={{
            validate: (value) =>
              parsePurchasePrice(value, numberLocale).ok || t("cellar.purchasePriceInvalid"),
          }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <TextField
              label={t("cellar.purchasePrice")}
              placeholder="0"
              value={value}
              onChangeText={onChange}
              keyboardType="numeric"
              error={error?.message}
            />
          )}
        />

        <View style={styles.actions}>
          <Button variant="ghost" onPress={onClose} style={styles.action}>
            {t("common.cancel")}
          </Button>
          <Button
            onPress={handleSubmit(onSubmit)}
            loading={addMutation.isPending || updateMutation.isPending}
            style={styles.action}
          >
            {t("common.save")}
          </Button>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: { backgroundColor: vinnotColors.canvas },
  handle: { backgroundColor: vinnotColors.borderStrong },
  content: { gap: 18, paddingHorizontal: 20, paddingBottom: 34 },
  header: { gap: 4 },
  title: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.xl,
    color: vinnotColors.ink,
  },
  subtitle: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    color: vinnotColors.muted,
  },
  block: { gap: 10 },
  label: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.ui,
    color: vinnotColors.ink,
  },
  results: { gap: 8 },
  wineOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: vinnotColors.border,
    borderRadius: radii.xl,
    padding: 10,
    backgroundColor: vinnotColors.surface,
  },
  wineOptionInCellar: {
    opacity: 0.55,
  },
  inCellarText: {
    marginTop: 2,
    color: vinnotColors.brand,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.meta,
    lineHeight: 15,
  },
  wineOptionSelected: {
    borderColor: vinnotColors.brand,
    backgroundColor: vinnotColors.brandSoft,
  },
  wineImage: { width: 44, height: 58 },
  wineInfo: { flex: 1 },
  wineName: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.ui,
    color: vinnotColors.ink,
  },
  wineMeta: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.meta,
    color: vinnotColors.muted,
  },
  selectedMark: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: vinnotColors.brand,
  },
  clearRating: { alignSelf: "flex-start", minHeight: 32, justifyContent: "center" },
  clearRatingText: { fontFamily: vinnotFonts.medium, fontSize: fontSizes.sm, color: vinnotColors.brand },
  textArea: { minHeight: 104, textAlignVertical: "top" },
  actions: { flexDirection: "row", gap: 10, paddingTop: 4 },
  action: { flex: 1 },
});

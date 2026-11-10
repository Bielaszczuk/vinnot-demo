import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { CalendarDays, Clock3, X } from "lucide-react-native";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { radii, lightTokens } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import {
  mergeDatePart,
  mergeTimePart,
  parseLocalDateTime,
  toLocalDateTimeInput,
} from "./eventDateTime";
import { formatDate } from "@/shared/i18n/format";
import { fontSizes } from "@/shared/theme/typography";

type PickerMode = "date" | "time";

interface EventDateTimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}

function pickerValue(value: string) {
  const parsed = parseLocalDateTime(value);
  if (parsed) return parsed;
  const fallback = new Date();
  fallback.setMinutes(0, 0, 0);
  fallback.setHours(fallback.getHours() + 1);
  return fallback;
}

const EDITOR_TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };

export function EventDateTimeField({
  label,
  value,
  onChange,
  optional = false,
}: EventDateTimeFieldProps) {
  const { t, i18n } = useTranslation();
  const [androidMode, setAndroidMode] = useState<PickerMode | null>(null);
  const selected = pickerValue(value);

  const applyPart = (mode: PickerMode, next: Date) => {
    const merged = mode === "date" ? mergeDatePart(selected, next) : mergeTimePart(selected, next);
    onChange(toLocalDateTimeInput(merged.toISOString()));
  };

  const onAndroidChange = (mode: PickerMode, event: DateTimePickerEvent, next?: Date) => {
    setAndroidMode(null);
    if (event.type === "set" && next) applyPart(mode, next);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {optional ? "" : " *"}
        </Text>
        {optional && value ? (
          <MotionPressable
            onPress={() => onChange("")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("eventDateTime.clear", { label })}
          >
            <X size={16} color={vinnotColors.muted} />
          </MotionPressable>
        ) : null}
      </View>

      {Platform.OS === "ios" ? (
        <View style={styles.iosRow}>
          <View style={styles.pickerGroup}>
            <CalendarDays size={17} color={vinnotColors.brand} />
            <DateTimePicker
              accentColor={lightTokens.brandPrimary}
              themeVariant="light"
              value={selected}
              mode="date"
              display="compact"
              locale={i18n.language}
              onChange={(_event, next) => next && applyPart("date", next)}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.pickerGroup}>
            <Clock3 size={17} color={vinnotColors.brand} />
            <DateTimePicker
              accentColor={lightTokens.brandPrimary}
              themeVariant="light"
              value={selected}
              mode="time"
              display="compact"
              locale={i18n.language}
              onChange={(_event, next) => next && applyPart("time", next)}
            />
          </View>
        </View>
      ) : (
        <View style={styles.androidRow}>
          <MotionPressable
            style={styles.androidPart}
            onPress={() => setAndroidMode("date")}
            accessibilityRole="button"
            accessibilityLabel={t("eventDateTime.chooseDate", { label })}
          >
            <CalendarDays size={18} color={vinnotColors.brand} />
            <Text style={styles.valueText}>{formatDate(selected, i18n.language)}</Text>
          </MotionPressable>
          <MotionPressable
            style={styles.androidPart}
            onPress={() => setAndroidMode("time")}
            accessibilityRole="button"
            accessibilityLabel={t("eventDateTime.chooseTime", { label })}
          >
            <Clock3 size={18} color={vinnotColors.brand} />
            <Text style={styles.valueText}>{formatDate(selected, i18n.language, EDITOR_TIME)}</Text>
          </MotionPressable>
        </View>
      )}

      {androidMode ? (
        <DateTimePicker
          value={selected}
          mode={androidMode}
          display="default"
          is24Hour
          onChange={(event, next) => onAndroidChange(androidMode, event, next)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    color: vinnotColors.ink,
    fontSize: fontSizes.sm,
    fontFamily: vinnotFonts.semibold,
  },
  iosRow: {
    minHeight: 52,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: vinnotColors.border,
    borderRadius: radii.md,
    backgroundColor: vinnotColors.surface,
    flexDirection: "row",
    alignItems: "center",
  },
  pickerGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: vinnotColors.border,
  },
  androidRow: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: vinnotColors.border,
    borderRadius: radii.md,
    backgroundColor: vinnotColors.surface,
    flexDirection: "row",
    overflow: "hidden",
  },
  androidPart: {
    flex: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  valueText: {
    color: vinnotColors.ink,
    fontSize: fontSizes.ui,
    fontFamily: vinnotFonts.medium,
  },
});

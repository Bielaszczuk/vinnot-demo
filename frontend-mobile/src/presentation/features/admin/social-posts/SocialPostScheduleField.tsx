/**
 * Date and time of a post in Argentina time (#513), whatever the device zone: the pickers show the instant in
 * `America/Argentina/Buenos_Aires` and every change is read back as that zone's date or time. iOS shows the compact
 * inline pickers; Android opens the system dialog from two buttons, like the event date field. Uses the date picker
 * the app already ships, so it needs no new native code.
 */
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { CalendarDays, Clock3 } from "lucide-react-native";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import {
  ARGENTINA_TIME_ZONE,
  argentinaInstant,
  toArgentinaDateTime,
  type ArgentinaDateTime,
} from "@/domain/admin/socialPost";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

type PickerMode = "date" | "time";

export interface SocialPostScheduleFieldProps {
  value: ArgentinaDateTime;
  locale: string;
  /** Accessible names of the Android buttons, with the value they hold. */
  dateLabel: string;
  timeLabel: string;
  formatDay: (isoDate: string) => string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

export function SocialPostScheduleField({
  value,
  locale,
  dateLabel,
  timeLabel,
  formatDay,
  onDateChange,
  onTimeChange,
}: SocialPostScheduleFieldProps) {
  const [androidMode, setAndroidMode] = useState<PickerMode | null>(null);
  const instant = argentinaInstant(value);
  const selected = instant ? new Date(instant) : new Date();

  const apply = (mode: PickerMode, next: Date) => {
    const picked = toArgentinaDateTime(next.toISOString());
    if (mode === "date") onDateChange(picked.date);
    else onTimeChange(picked.time);
  };

  const onAndroidChange = (mode: PickerMode, event: DateTimePickerEvent, next?: Date) => {
    setAndroidMode(null);
    if (event.type === "set" && next) apply(mode, next);
  };

  if (Platform.OS === "ios") {
    return (
      <View style={styles.row}>
        {(["date", "time"] as const).map((mode) => (
          <View key={mode} style={styles.part}>
            {mode === "date" ? (
              <CalendarDays size={17} color={lightTokens.brandPrimary} />
            ) : (
              <Clock3 size={17} color={lightTokens.brandPrimary} />
            )}
            <DateTimePicker
              accessibilityLabel={mode === "date" ? dateLabel : timeLabel}
              accentColor={lightTokens.brandPrimary}
              themeVariant="light"
              value={selected}
              mode={mode}
              display="compact"
              locale={locale}
              timeZoneName={ARGENTINA_TIME_ZONE}
              onChange={(_event, next) => next && apply(mode, next)}
            />
          </View>
        ))}
      </View>
    );
  }

  return (
    <>
      <View style={styles.row}>
        <MotionPressable
          style={styles.part}
          onPress={() => setAndroidMode("date")}
          accessibilityRole="button"
          accessibilityLabel={dateLabel}
        >
          <CalendarDays size={18} color={lightTokens.brandPrimary} />
          <Text style={styles.value}>{formatDay(value.date)}</Text>
        </MotionPressable>
        <MotionPressable
          style={styles.part}
          onPress={() => setAndroidMode("time")}
          accessibilityRole="button"
          accessibilityLabel={timeLabel}
        >
          <Clock3 size={18} color={lightTokens.brandPrimary} />
          <Text style={styles.value}>{value.time}</Text>
        </MotionPressable>
      </View>
      {androidMode && (
        <DateTimePicker
          value={selected}
          mode={androidMode}
          display="default"
          is24Hour
          timeZoneName={ARGENTINA_TIME_ZONE}
          onChange={(event, next) => onAndroidChange(androidMode, event, next)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.md,
    backgroundColor: lightTokens.surfaceDefault,
    overflow: "hidden",
  },
  part: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 8 },
  value: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
});

/**
 * ReasonPicker — a reason is one tap on a preset; free text appears only under "Other".
 * Generalizes the cancellation, suspension and rejection reason pickers.
 */
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { TextField } from "@/presentation/components/ui/TextField";
import { spacing } from "@/shared/theme/tokens";
import { ChoiceChips } from "./ChoiceChips";

export interface ReasonPickerProps<R extends string> {
  label: string;
  hint?: string;
  reasons: readonly R[];
  value: R;
  onChange: (reason: R) => void;
  /** Translated label of a reason code. */
  labelFor: (reason: R) => string;
  /** The reason that opens the free-text note. */
  otherValue?: R;
  note: string;
  onNoteChange: (note: string) => void;
  noteLabel: string;
  notePlaceholder?: string;
  maxNoteLength: number;
  noteError?: string;
  disabled?: boolean;
}

export function ReasonPicker<R extends string>({
  label,
  hint,
  reasons,
  value,
  onChange,
  labelFor,
  otherValue = "OTHER" as R,
  note,
  onNoteChange,
  noteLabel,
  notePlaceholder,
  maxNoteLength,
  noteError,
  disabled = false,
}: ReasonPickerProps<R>) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ChoiceChips
        label={label}
        hint={hint}
        options={reasons.map((reason) => ({ value: reason, label: labelFor(reason) }))}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      {value === otherValue && (
        <TextField
          label={noteLabel}
          placeholder={notePlaceholder}
          value={note}
          onChangeText={onNoteChange}
          maxLength={maxNoteLength}
          editable={!disabled}
          error={noteError}
          hint={t("forms.reason.counter", { count: note.length, max: maxNoteLength })}
          multiline
          textAlignVertical="top"
          style={styles.note}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[3.5] },
  note: { minHeight: 88 },
});

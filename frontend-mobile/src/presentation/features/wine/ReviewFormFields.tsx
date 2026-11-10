/** Reusable review editor. Publication is owned by the presentation hook. */
import { useContext, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputInstance } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import { SheetFieldFocusContext, SheetInputContext } from "@/presentation/components/ui/SheetInputContext";
import { VintageField } from "@/presentation/components/ui/VintageField";
import type { WineType } from "@/domain/wine/wine.types";
import { RatingPourControl } from "./rating/RatingPourControl";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

export interface ReviewDraft {
  rating: number;
  title: string;
  comment: string;
  vintage: number | null;
}

interface ReviewFormFieldsProps {
  initialRating?: number;
  initialTitle?: string;
  initialComment?: string;
  initialVintage?: number | null;
  /** Catalog wine vintage, offered first in the vintage picker. */
  suggestedVintage?: number | null;
  /** Wine type: the glasses, the wine colour and the bottle of the pour control follow it. */
  wineType?: WineType | null;
  isEditing?: boolean;
  onSubmit: (draft: ReviewDraft) => Promise<boolean>;
  onCancel?: () => void;
  onFieldFocus?: (input: TextInputInstance | null) => void;
  /** Called with the whole draft on every edit, so a caller can keep it across screens. */
  onDraftChange?: (draft: ReviewDraft) => void;
  /** Draws the form as a bordered card; a sheet that is already a surface leaves it out. */
  framed?: boolean;
}

export function ReviewFormFields({
  initialRating = 0, initialTitle = "", initialComment = "", initialVintage = null, suggestedVintage, wineType,
  isEditing = false, onSubmit, onCancel, onFieldFocus, onDraftChange, framed = true,
}: ReviewFormFieldsProps) {
  const { t } = useTranslation();
  // Inside a bottom sheet the inputs tell the sheet about the keyboard, and the sheet's
  // scroll reveals the focused field above it (as TextField does).
  const inSheet = useContext(SheetInputContext);
  const focusSheetField = useContext(SheetFieldFocusContext);
  const Input = inSheet ? BottomSheetTextInput : TextInput;
  const [rating, updateRating] = useState(initialRating);
  const [title, updateTitle] = useState(initialTitle);
  const [comment, updateComment] = useState(initialComment);
  const [vintage, updateVintage] = useState<number | null>(initialVintage);
  const [isPending, setPending] = useState(false);
  const submitting = useRef(false);
  const titleInput = useRef<TextInputInstance | null>(null);
  const commentInput = useRef<TextInputInstance | null>(null);
  const focusField = (input: TextInputInstance | null) => {
    focusSheetField(input);
    onFieldFocus?.(input);
  };
  const change = (patch: Partial<ReviewDraft>) => {
    const next = { rating, title, comment, vintage, ...patch };
    if (patch.rating !== undefined) updateRating(next.rating);
    if (patch.title !== undefined) updateTitle(next.title);
    if (patch.comment !== undefined) updateComment(next.comment);
    if (patch.vintage !== undefined) updateVintage(next.vintage);
    onDraftChange?.(next);
  };

  const submit = async () => {
    if (rating === 0 || submitting.current) return;
    submitting.current = true;
    setPending(true);
    try {
      if (await onSubmit({ rating, title: title.trim(), comment: comment.trim(), vintage })) {
        updateRating(0);
        updateTitle("");
        updateComment("");
        updateVintage(null);
      }
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  return (
    <View style={framed ? styles.card : styles.bare}>
      <Text style={styles.title}>{t(isEditing ? "wines.editReview" : "wines.writeReview")}</Text>
      <Text style={styles.requiredNote}>{t("reviews.form.requiredNote")}</Text>
      <RatingPourControl value={rating} onChange={(next) => change({ rating: next })} wineType={wineType} size="lg"
        disabled={isPending} required />
      <VintageField value={vintage} onChange={(next) => change({ vintage: next })} suggestedYear={suggestedVintage}
        disabled={isPending} onInputFocus={onFieldFocus} />
      <Input ref={(input: unknown) => { titleInput.current = input as TextInputInstance | null; }}
        onFocus={() => focusField(titleInput.current)} onBlur={() => focusSheetField(null)}
        value={title} onChangeText={(next) => change({ title: next })} maxLength={255} editable={!isPending}
        accessibilityLabel={t("reviews.form.titleLabel")}
        placeholder={t("wines.reviewTitlePlaceholder")} placeholderTextColor={lightTokens.inputPlaceholder}
        style={styles.titleInput} />
      <Input ref={(input: unknown) => { commentInput.current = input as TextInputInstance | null; }}
        onFocus={() => focusField(commentInput.current)} onBlur={() => focusSheetField(null)}
        onContentSizeChange={() => { if (commentInput.current?.isFocused()) focusField(commentInput.current); }}
        value={comment} onChangeText={(next) => change({ comment: next })} editable={!isPending}
        accessibilityLabel={t("reviews.form.commentLabel")}
        placeholder={t("wines.reviewPlaceholder")} placeholderTextColor={lightTokens.inputPlaceholder}
        multiline style={styles.input} textAlignVertical="top" />
      <View style={styles.actions}>
        {onCancel && <Button variant="ghost" onPress={onCancel} disabled={isPending} style={styles.action}>
          {t("common.cancel")}
        </Button>}
        <Button onPress={() => void submit()} disabled={rating === 0} loading={isPending} style={styles.action}>
          {t(isEditing ? "common.save" : "wines.sendReview")}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    padding: 16,
    backgroundColor: lightTokens.surfaceDefault,
  },
  bare: { gap: 12 },
  title: { ...textStyles.titleMedium, color: lightTokens.textPrimary },
  requiredNote: { ...textStyles.caption, color: lightTokens.textTertiary },
  titleInput: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...textStyles.bodyMedium,
    color: lightTokens.textPrimary,
    backgroundColor: lightTokens.bgSubtle,
  },
  input: {
    minHeight: 96,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...textStyles.bodyMedium,
    color: lightTokens.textPrimary,
    backgroundColor: lightTokens.bgSubtle,
  },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1 },
});

/**
 * Edits the copy of the selected language only (#497 `PUT` with `language`; mobile #499): hook, slides, caption
 * (the legal line of that language is appended when missing), hashtags, alt text and CTA, with the same limits as
 * the backend. The shared form sheet keeps the actions pinned and reveals the focused field above the keyboard.
 */
import { Text, View } from "react-native";
import { EntityFormSheet } from "@/presentation/components/forms";
import { Button } from "@/presentation/components/ui/Button";
import { TextField } from "@/presentation/components/ui/TextField";
import {
  MAX_ALT_TEXT_LENGTH,
  MAX_CAPTION_LENGTH,
  MAX_HOOK_LENGTH,
  MAX_SLIDES,
  MIN_SLIDES,
  type SocialPostDraftError,
} from "@/domain/admin/socialPost";
import { socialPostStyles as styles } from "./socialPostStyles";
import type { useAdminSocialPostsViewModel } from "./useAdminSocialPostsViewModel";

type ViewModel = ReturnType<typeof useAdminSocialPostsViewModel>;

const FIELD_ERRORS: Record<"hook" | "slides" | "caption" | "hashtags" | "altText" | "cta", SocialPostDraftError[]> = {
  hook: ["HOOK_REQUIRED", "HOOK_TOO_LONG"],
  slides: ["SLIDES_COUNT", "SLIDE_INCOMPLETE", "SLIDE_TITLE_TOO_LONG", "SLIDE_BODY_TOO_LONG"],
  caption: ["CAPTION_REQUIRED", "CAPTION_TOO_LONG"],
  hashtags: ["HASHTAGS_COUNT", "HASHTAGS_VINNOT"],
  altText: ["ALT_TEXT_TOO_LONG"],
  cta: ["CTA_REQUIRED"],
};

export function SocialPostEditSheet({ vm }: { vm: ViewModel }) {
  const { t, draft } = vm;
  const errorsOf = (field: keyof typeof FIELD_ERRORS) => {
    if (!vm.showDraftErrors) return undefined;
    const found = vm.draftErrors.filter((error) => FIELD_ERRORS[field].includes(error));
    return found.length > 0 ? found.map((error) => t(`admin.socialPosts.editor.errors.${error}`)).join(" ") : undefined;
  };
  const counter = (value: string, max: number) => `${value.length}/${max}`;
  const slideErrors = errorsOf("slides");

  return (
    <EntityFormSheet
      visible={vm.editing}
      onClose={vm.cancelEdit}
      title={t("admin.socialPosts.editor.heading", { language: t(`admin.socialPosts.languages.${vm.language}`) })}
      subtitle={t("admin.socialPosts.editor.subtitle")}
      dirty={vm.draftDirty}
      busy={vm.working}
      saving={vm.saving}
      submitLabel={t("admin.socialPosts.editor.save")}
      onSubmit={() => void vm.saveEdit()}
      errorSummary={vm.showDraftErrors && vm.draftErrors.length > 0 ? t("admin.socialPosts.editor.errorSummary") : null}
    >
      <TextField
        label={t("admin.socialPosts.editor.hook")}
        value={draft.hook}
        onChangeText={(value) => vm.updateDraft("hook", value)}
        hint={counter(draft.hook, MAX_HOOK_LENGTH)}
        error={errorsOf("hook")}
      />
      <View style={styles.slide}>
        <Text style={styles.label}>{t("admin.socialPosts.editor.slides")}</Text>
        {slideErrors && <Text style={styles.error}>{slideErrors}</Text>}
        {draft.slides.map((slide, index) => (
          <View key={index} style={styles.editorSlide}>
            <Text style={styles.label}>{t("admin.socialPosts.editor.slide", { index: index + 1 })}</Text>
            <TextField
              label={t("admin.socialPosts.editor.slideTitle")}
              value={slide.title}
              onChangeText={(value) => vm.updateSlide(index, "title", value)}
            />
            <TextField
              label={t("admin.socialPosts.editor.slideBody")}
              value={slide.body}
              onChangeText={(value) => vm.updateSlide(index, "body", value)}
              multiline
              textAlignVertical="top"
            />
            {draft.slides.length > MIN_SLIDES && (
              <Button size="sm" variant="ghost" onPress={() => vm.removeSlide(index)}>
                {t("admin.socialPosts.editor.removeSlide", { index: index + 1 })}
              </Button>
            )}
          </View>
        ))}
        {draft.slides.length < MAX_SLIDES && (
          <Button size="sm" variant="outline" onPress={vm.addSlide}>
            {t("admin.socialPosts.editor.addSlide")}
          </Button>
        )}
      </View>
      <TextField
        label={t("admin.socialPosts.editor.caption")}
        value={draft.caption}
        onChangeText={(value) => vm.updateDraft("caption", value)}
        multiline
        textAlignVertical="top"
        hint={`${t("admin.socialPosts.editor.captionHelp")} ${counter(draft.caption, MAX_CAPTION_LENGTH)}`}
        error={errorsOf("caption")}
      />
      <TextField
        label={t("admin.socialPosts.editor.hashtags")}
        value={draft.hashtags}
        onChangeText={(value) => vm.updateDraft("hashtags", value)}
        autoCapitalize="none"
        hint={t("admin.socialPosts.editor.hashtagsHelp")}
        error={errorsOf("hashtags")}
      />
      <TextField
        label={t("admin.socialPosts.editor.altText")}
        value={draft.altText}
        onChangeText={(value) => vm.updateDraft("altText", value)}
        multiline
        hint={counter(draft.altText, MAX_ALT_TEXT_LENGTH)}
        error={errorsOf("altText")}
      />
      <TextField
        label={t("admin.socialPosts.editor.cta")}
        value={draft.cta}
        onChangeText={(value) => vm.updateDraft("cta", value)}
        error={errorsOf("cta")}
      />
    </EntityFormSheet>
  );
}

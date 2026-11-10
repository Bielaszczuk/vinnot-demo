import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, BackHandler, Keyboard } from "react-native";
import { useFocusEffect, useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  createProfileDraft, isProfileDraftDirty, validateProfileDraft,
  type ProfileDraft, type ProfileField,
} from "@/domain/wine/wine-profile.validators";
import { resolveAiContentLanguage } from "@/shared/i18n/language";
import { useToast } from "@/presentation/providers/ToastProvider";
import { useAiWineProfile, useRegenerateAiProfile, useWineDetail } from "../wine";
import { useAdminAiProfileMutation } from "./index";

/** The screen renders a draft; this facade owns validation, persistence and recovery. */
export function useWineProfileEditor(id: string, onLeave: () => void) {
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigation = useNavigation();
  const wineQuery = useWineDetail(id);
  const profileQuery = useAiWineProfile(id, !!id);
  const profile = profileQuery.data;
  const missingProfile = profileQuery.error && "status" in profileQuery.error && profileQuery.error.status === 404;
  const update = useAdminAiProfileMutation();
  const regenerate = useRegenerateAiProfile(id);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const working = useRef(false);
  const activeDraft = draft ?? (profile ? createProfileDraft(profile) : null);
  const dirty = activeDraft ? isProfileDraftDirty(activeDraft) : false;
  const busy = saving || update.isPending || regenerate.isPending;
  const errors = attempted && activeDraft ? validateProfileDraft(activeDraft).errors : {};

  const requestLeave = useCallback(() => {
    if (busy || working.current) return;
    Keyboard.dismiss();
    if (!dirty) onLeave();
    else Alert.alert(t("admin.aiProfile.discardTitle"), t("admin.aiProfile.discardMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("admin.aiProfile.discard"), style: "destructive", onPress: onLeave },
    ]);
  }, [busy, dirty, onLeave, t]);

  // Keep the explicit back/discard workflow authoritative while a draft is dirty.
  useEffect(() => { navigation.setOptions({ gestureEnabled: !dirty && !busy }); }, [navigation, dirty, busy]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      requestLeave();
      return true;
    });
    return () => subscription.remove();
  }, [requestLeave]));

  function changeField(field: ProfileField, value: string | string[]) {
    if (!activeDraft || busy || working.current) return;
    setDraft(previous => {
      const current = previous ?? activeDraft;
      return { ...current, values: { ...current.values, [field]: value } };
    });
  }

  function restore() {
    if (!activeDraft || !profile || busy || working.current) return;
    setDraft(createProfileDraft({ ...profile, ...activeDraft.original }));
    setAttempted(false);
    Keyboard.dismiss();
  }

  async function save() {
    if (!activeDraft || !dirty || busy || working.current) return;
    const result = validateProfileDraft(activeDraft);
    setAttempted(true);
    if (Object.keys(result.errors).length) {
      showError(t("admin.aiProfile.checkFields"));
      return;
    }
    working.current = true;
    setSaving(true);
    Keyboard.dismiss();
    try {
      const saved = await update.mutateAsync({
        wineId: id,
        profileJson: result.content,
        language: resolveAiContentLanguage(i18n.resolvedLanguage ?? i18n.language),
      });
      // Use the confirmed response, without an extra GET duplicating RTK invalidation.
      setDraft(createProfileDraft(saved));
      setAttempted(false);
      showSuccess(t("admin.aiProfile.updated"));
    } catch {
      showError(t("admin.aiProfile.saveError"));
    } finally {
      working.current = false;
      setSaving(false);
    }
  }

  function confirmRegenerate() {
    if (busy || working.current) return;
    Alert.alert(t("admin.aiProfile.generateTitle"),
      profile ? t("admin.aiProfile.regenerateConfirm") : t("admin.aiProfile.generateMessage"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: profile ? t("admin.aiProfile.regenerate") : t("admin.aiProfile.generate"),
          onPress: () => {
            if (working.current) return;
            working.current = true;
            regenerate.mutate(undefined, {
              onSuccess: () => {
                working.current = false;
                setDraft(null);
                setAttempted(false);
                showSuccess(t("admin.aiProfile.generated"));
              },
              onError: () => {
                working.current = false;
                showError(t("admin.aiProfile.generateError"));
              },
            });
          },
        },
      ]);
  }

  return {
    wine: wineQuery.data, profile, draft: activeDraft, errors, dirty, busy,
    saving, generating: regenerate.isPending,
    loading: wineQuery.isLoading || profileQuery.isLoading,
    loadError: profileQuery.isError && !missingProfile,
    retry: () => { void profileQuery.refetch(); },
    changeField, restore, save, confirmRegenerate, requestLeave,
  };
}

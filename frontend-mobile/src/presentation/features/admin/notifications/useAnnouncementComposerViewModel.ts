import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/presentation/providers/ToastProvider";
import { useDebounce } from "@/presentation/hooks/ui";
import {
  useAdminCountries,
  useAdminRegions,
  useAnnouncementPreview,
  useAnnouncementReach,
  useSendAnnouncement,
  useTestAnnouncement,
} from "@/presentation/hooks/queries/admin";
import { adminNotificationsService } from "@/application/services/adminNotifications.service";
import {
  draftErrors,
  emptyAnnouncementDraft,
  versionErrors,
  writtenLanguages,
  type AnnouncementAudience,
  type AnnouncementDestination,
  type AnnouncementDraft,
  type AnnouncementKind,
  type AnnouncementLanguage,
  type AnnouncementVersion,
} from "@/domain/admin/announcement";
import { applyAnnouncementFormat, type AnnouncementFormat } from "@/domain/admin/announcementFormat";
import { notificationErrorKey } from "./notificationErrorKey";

const PREVIEW_DELAY_MS = 500;
const REACH_DELAY_MS = 300;

export interface TextSelection {
  start: number;
  end: number;
}

/** Composer of the mobile admin notifications section (#327): draft, live preview, reach, test and send. */
export function useAnnouncementComposerViewModel() {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [draft, setDraft] = useState<AnnouncementDraft>(emptyAnnouncementDraft);
  const [language, setEditedLanguage] = useState<AnnouncementLanguage>("es");
  const [confirming, setConfirming] = useState(false);
  // Selection the body field must take after a toolbar edit; cleared once the field reports it back.
  const [bodySelection, setBodySelection] = useState<TextSelection | undefined>();
  const selection = useRef<TextSelection | null>(null);
  // One id per draft being sent, kept across retries of that same draft so a repeated request never sends twice.
  const sendRequest = useRef<{ draft: AnnouncementDraft; id: string } | null>(null);

  const countries = useAdminCountries();
  const countryId = draft.audience.countryId;
  const regions = useAdminRegions(countryId ?? undefined);
  const testMutation = useTestAnnouncement();
  const sendMutation = useSendAnnouncement();

  const version = draft.versions[language];
  const editing = useMemo(() => ({ language, version }), [language, version]);
  // Language and text are debounced together so a preview never renders one language's text as the other.
  const debounced = useDebounce(editing, PREVIEW_DELAY_MS);
  const previewable = versionErrors(debounced.version).length === 0;
  const preview = useAnnouncementPreview(draft.kind, debounced.language, previewable ? debounced.version : null);
  const debouncedAudience = useDebounce(draft.audience, REACH_DELAY_MS);
  const reach = useAnnouncementReach(draft.kind, debouncedAudience);

  /** The count shown matches the current audience: not waiting for the debounce or a refetch. */
  const reachSettled = debouncedAudience === draft.audience && !reach.isFetching;
  const errors = useMemo(() => draftErrors(draft), [draft]);
  const working = testMutation.isPending || sendMutation.isPending;
  const canTest = errors.length === 0 && !working;
  const canSend = canTest && reachSettled && (reach.data?.accounts ?? 0) > 0;
  /** Why "Enviar" is off while the test can go: the reach is not known yet, failed or is zero. */
  const sendBlock =
    errors.length > 0 || canSend || working
      ? null
      : reach.isError && !reach.isFetching
        ? "reachFailed"
        : !reachSettled
          ? "reachPending"
          : "noReach";

  const setKind = useCallback((kind: AnnouncementKind) => setDraft((current) => ({ ...current, kind })), []);
  const setDestination = useCallback(
    (destination: AnnouncementDestination) => setDraft((current) => ({ ...current, destination })),
    [],
  );
  const setLanguage = useCallback((next: AnnouncementLanguage) => {
    selection.current = null;
    setEditedLanguage(next);
  }, []);
  const updateVersion = useCallback(
    (patch: Partial<AnnouncementVersion>) => {
      setDraft((current) => ({
        ...current,
        versions: { ...current.versions, [language]: { ...current.versions[language], ...patch } },
      }));
    },
    [language],
  );
  /** The title is one line: a pasted line break becomes a space. */
  const updateTitle = useCallback((title: string) => updateVersion({ title: title.replace(/[\r\n]/g, " ") }), [
    updateVersion,
  ]);
  const updateAudience = useCallback((patch: Partial<AnnouncementAudience>) => {
    setDraft((current) => ({ ...current, audience: { ...current.audience, ...patch } }));
  }, []);
  const selectCountry = useCallback((id: string | null) => updateAudience({ countryId: id, regionId: null }), [
    updateAudience,
  ]);

  const onBodySelectionChange = useCallback((next: TextSelection) => {
    selection.current = next;
    setBodySelection(undefined);
  }, []);

  const applyFormat = useCallback(
    (format: AnnouncementFormat) => {
      const body = version.body;
      const current = selection.current ?? { start: body.length, end: body.length };
      const start = Math.min(current.start, body.length);
      const end = Math.min(Math.max(current.end, start), body.length);
      const edit = applyAnnouncementFormat(
        body,
        start,
        end,
        format,
        t(`admin.notifications.composer.formatFallback.${format}`),
      );
      updateVersion({ body: edit.text });
      const next = { start: edit.selectionStart, end: edit.selectionEnd };
      selection.current = next;
      setBodySelection(next);
    },
    [t, updateVersion, version.body],
  );

  const failure = useCallback((error: unknown) => showError(t(notificationErrorKey(error))), [showError, t]);

  const sendTest = useCallback(async () => {
    if (!canTest) return;
    try {
      const reached = await testMutation.mutateAsync(draft);
      showSuccess(
        t(reached.push > 0 ? "admin.notifications.composer.testSentBoth" : "admin.notifications.composer.testSentEmail"),
      );
    } catch (error) {
      failure(error);
    }
  }, [canTest, draft, failure, showSuccess, t, testMutation]);

  const send = useCallback(async () => {
    if (!canTest) return;
    if (sendRequest.current?.draft !== draft) {
      sendRequest.current = { draft, id: adminNotificationsService.newSendRequestId() };
    }
    try {
      const sent = await sendMutation.mutateAsync({ draft, requestId: sendRequest.current.id });
      showSuccess(t("admin.notifications.composer.sent", { count: sent?.recipients ?? reach.data?.accounts ?? 0 }));
      setConfirming(false);
      setDraft(emptyAnnouncementDraft());
      setEditedLanguage("es");
      selection.current = null;
      sendRequest.current = null;
    } catch (error) {
      failure(error);
    }
  }, [canTest, draft, failure, reach.data?.accounts, sendMutation, showSuccess, t]);

  const openConfirm = useCallback(() => {
    if (canSend) setConfirming(true);
  }, [canSend]);

  return {
    t,
    draft,
    language,
    setLanguage,
    version,
    languages: writtenLanguages(draft),
    errors,
    blockingMessage: errors[0]
      ? t(`admin.notifications.draftErrors.${errors[0]}`)
      : sendBlock
        ? t(`admin.notifications.composer.sendBlocked.${sendBlock}`)
        : null,
    setKind,
    setDestination,
    updateVersion,
    updateTitle,
    updateAudience,
    selectCountry,
    bodySelection,
    onBodySelectionChange,
    applyFormat,
    preview,
    previewable,
    previewLanguage: debounced.language,
    /** The body the preview was asked for, so the drawn email never mixes two versions. */
    previewBody: debounced.version.body,
    reach,
    reachSettled,
    countries: countries.data,
    regions: regions.data,
    countryId,
    placesFailed: countries.isError || regions.isError,
    working,
    testing: testMutation.isPending,
    sending: sendMutation.isPending,
    canTest,
    canSend,
    sendTest,
    confirming,
    openConfirm,
    closeConfirm: () => setConfirming(false),
    send,
  };
}

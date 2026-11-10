/**
 * View model of the admin social posts module (#499, mirrors web #489/#492, per-language copy #497): the status
 * queue, the open post with its language and format switches, the review actions, the reject reason picker, the
 * per-language copy editor, the manual planner run (the queue refreshes while the AI writes the copy in the
 * background), the wine days of the current and next month, opening or sharing a rendered slide, and the open post's
 * publications (#510): opening a network's permalink and retrying a network where publishing failed. The backend
 * decides whether the open post may move to another date and time or publish now (#513); the new date and time are
 * picked in Argentina time, and publishing now asks for confirmation first.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_REJECT_REASON,
  MAX_REJECT_NOTE_LENGTH,
  allowedActions,
  argentinaInstant,
  argentinaTime,
  canRequestIllustration,
  copyDraftErrors,
  draftFromCopy,
  emptyCopyDraft,
  isLanguagePending,
  localizedName,
  slidesFor,
  toArgentinaDateTime,
  toSocialPostLanguage,
  wineDayYears,
  wineDaysOfCurrentAndNextMonth,
  type ArgentinaDateTime,
  type PlanResult,
  type SocialFormat,
  type SocialPostCopyDraft,
  type SocialPostLanguage,
  type SocialPostRejectReason,
  type SocialPostSlide,
  type SocialPostStatus,
  type SocialNetwork,
} from "@/domain/admin/socialPost";
import { resolveReasonText } from "@/domain/admin/moderationReasons";
import {
  adminSocialPostsService,
  isPublishingOffError,
  isSocialPostConflict,
  socialPostActionError,
} from "@/application/services/adminSocialPosts.service";
import {
  useAdminSocialPost,
  useAdminSocialPosts,
  useAdminWineDays,
  useApproveSocialPost,
  useNewSocialPostIllustration,
  usePlanSocialPosts,
  usePublishSocialPostNow,
  useRegenerateSocialPost,
  useRejectSocialPost,
  useRescheduleSocialPost,
  useRetrySocialPublication,
  useUpdateSocialPostCopy,
} from "@/presentation/hooks/queries/admin";
import { useExternalLink } from "@/presentation/hooks/useExternalLink";
import { useToast } from "@/presentation/providers/ToastProvider";

export const SOCIAL_POSTS_PAGE_SIZE = 20;
/** The AI writes a planned batch in the background: refresh the queue meanwhile, for a few minutes at most. */
export const COPY_REFRESH_MS = 10_000;
export const COPY_WAIT_MS = 5 * 60_000;

type DraftTextField = Exclude<keyof SocialPostCopyDraft, "slides">;

export function useAdminSocialPostsViewModel(today: Date = new Date()) {
  const { t, i18n } = useTranslation();
  const { showError, showSuccess } = useToast();
  const openLink = useExternalLink();
  const locale = i18n.language;
  const [status, setStatusState] = useState<SocialPostStatus>("PENDING_APPROVAL");
  const [page, setPage] = useState(0);
  const [language, setLanguage] = useState<SocialPostLanguage>(() => toSocialPostLanguage(locale));
  const [format, setFormat] = useState<SocialFormat>("INSTAGRAM");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SocialPostCopyDraft>(emptyCopyDraft);
  const [draftBase, setDraftBase] = useState<SocialPostCopyDraft>(emptyCopyDraft);
  const [showDraftErrors, setShowDraftErrors] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState<SocialPostRejectReason>(DEFAULT_REJECT_REASON);
  const [rejectNote, setRejectNoteState] = useState("");
  const [rejectAttempted, setRejectAttempted] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<ArgentinaDateTime>({ date: "", time: "" });
  const [confirmingPublishNow, setConfirmingPublishNow] = useState(false);
  const [lastPlan, setLastPlan] = useState<PlanResult | null>(null);
  const [awaitingCopy, setAwaitingCopy] = useState(false);

  const copyWait = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Stop waiting for the planned copy when the screen goes away.
  useEffect(() => () => clearTimeout(copyWait.current), []);

  const years = wineDayYears(today);
  const crossesYear = years.length > 1;
  const list = useAdminSocialPosts(page, SOCIAL_POSTS_PAGE_SIZE, status, awaitingCopy ? COPY_REFRESH_MS : 0);
  const detail = useAdminSocialPost(selectedId);
  const thisYearDays = useAdminWineDays(years[0]!);
  // Only asked for when the window crosses into next year.
  const nextYearDays = useAdminWineDays(years[1] ?? years[0]!, crossesYear);
  const approveMutation = useApproveSocialPost();
  const rejectMutation = useRejectSocialPost();
  const updateMutation = useUpdateSocialPostCopy();
  const regenerateMutation = useRegenerateSocialPost();
  const illustrationMutation = useNewSocialPostIllustration();
  const planMutation = usePlanSocialPosts();
  const retryMutation = useRetrySocialPublication();
  const rescheduleMutation = useRescheduleSocialPost();
  const publishNowMutation = usePublishSocialPostNow();

  const post = selectedId ? detail.data : undefined;
  const actions = useMemo(() => (post ? allowedActions(post, language) : []), [language, post]);
  const draftErrors = useMemo(() => copyDraftErrors(draft, language), [draft, language]);
  const wineDays = useMemo(
    () =>
      wineDaysOfCurrentAndNextMonth(
        [...(thisYearDays.data ?? []), ...(crossesYear ? (nextYearDays.data ?? []) : [])],
        today,
      ),
    [crossesYear, nextYearDays.data, thisYearDays.data, today],
  );
  const slides = useMemo(() => slidesFor(post?.media ?? null, language, format), [format, language, post]);
  const networkTimes = useMemo(
    () => (post?.networkSchedule ?? []).map(({ network, publishAt }) => ({ network, time: argentinaTime(publishAt) })),
    [post],
  );

  const formatDate = useCallback(
    (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );
  const formatNumber = useCallback((value: number) => value.toLocaleString(locale), [locale]);
  const formatDay = useCallback(
    (isoDate: string) =>
      new Date(`${isoDate}T00:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" }),
    [locale],
  );

  const resetReject = useCallback(() => {
    setRejecting(false);
    setRejectReason(DEFAULT_REJECT_REASON);
    setRejectNoteState("");
    setRejectAttempted(false);
  }, []);

  const closeScheduleActions = useCallback(() => {
    setRescheduling(false);
    setConfirmingPublishNow(false);
  }, []);

  const selectPost = useCallback(
    (id: string) => {
      setSelectedId(id);
      setEditing(false);
      resetReject();
      closeScheduleActions();
    },
    [closeScheduleActions, resetReject],
  );

  const setStatus = useCallback((value: SocialPostStatus) => {
    setStatusState(value);
    setPage(0);
  }, []);

  const run = useCallback(
    async (action: () => Promise<unknown>, successKey: string) => {
      try {
        await action();
        showSuccess(t(successKey));
        return true;
      } catch (error) {
        showError(t(isSocialPostConflict(error) ? "admin.socialPosts.actions.conflict" : "admin.socialPosts.actions.error"));
        return false;
      }
    },
    [showError, showSuccess, t],
  );

  const approve = useCallback(async () => {
    if (!selectedId) return;
    await run(() => approveMutation.mutateAsync(selectedId), "admin.socialPosts.actions.approved");
  }, [approveMutation, run, selectedId]);

  const regenerate = useCallback(async () => {
    if (!selectedId) return;
    await run(() => regenerateMutation.mutateAsync(selectedId), "admin.socialPosts.actions.regenerated");
  }, [regenerateMutation, run, selectedId]);

  const newIllustration = useCallback(async () => {
    if (!selectedId) return;
    await run(() => illustrationMutation.mutateAsync(selectedId), "admin.socialPosts.media.requested");
  }, [illustrationMutation, run, selectedId]);

  const retryPublication = useCallback(
    async (network: SocialNetwork) => {
      if (!selectedId) return;
      try {
        await retryMutation.mutateAsync({ id: selectedId, network });
        showSuccess(t("admin.socialPosts.publications.retried"));
      } catch (error) {
        showError(t(retryErrorKey(error)));
      }
    },
    [retryMutation, selectedId, showError, showSuccess, t],
  );

  /** Runs a reschedule or publish-now, explaining each code the backend refuses it with; true when it went through. */
  const runScheduleAction = useCallback(
    async (action: () => Promise<unknown>, successKey: string) => {
      try {
        await action();
        showSuccess(t(successKey));
        return true;
      } catch (error) {
        showError(t(scheduleActionErrorKey(error)));
        return false;
      }
    },
    [showError, showSuccess, t],
  );

  const startReschedule = useCallback(() => {
    if (!post) return;
    resetReject();
    setConfirmingPublishNow(false);
    setScheduleDraft(toArgentinaDateTime(post.scheduledFor));
    setRescheduling(true);
  }, [post, resetReject]);

  const confirmReschedule = useCallback(async () => {
    if (!selectedId) return;
    const scheduledFor = argentinaInstant(scheduleDraft);
    if (!scheduledFor) {
      showError(t("admin.socialPosts.schedule.invalid"));
      return;
    }
    const done = await runScheduleAction(
      () => rescheduleMutation.mutateAsync({ id: selectedId, scheduledFor }),
      "admin.socialPosts.schedule.saved",
    );
    if (done) setRescheduling(false);
  }, [rescheduleMutation, runScheduleAction, scheduleDraft, selectedId, showError, t]);

  const startPublishNow = useCallback(() => {
    resetReject();
    setRescheduling(false);
    setConfirmingPublishNow(true);
  }, [resetReject]);

  const confirmPublishNow = useCallback(async () => {
    if (!selectedId) return;
    const done = await runScheduleAction(
      () => publishNowMutation.mutateAsync(selectedId),
      "admin.socialPosts.publishNow.started",
    );
    if (done) setConfirmingPublishNow(false);
  }, [publishNowMutation, runScheduleAction, selectedId]);

  const rejectNoteMissing = rejectReason === "OTHER" && !rejectNote.trim();
  const confirmReject = useCallback(async () => {
    if (!selectedId) return;
    setRejectAttempted(true);
    if (rejectNoteMissing) return;
    const reason = resolveReasonText(
      rejectReason,
      rejectNote,
      (code) => t(`admin.socialPosts.rejectReasons.${code}`),
      MAX_REJECT_NOTE_LENGTH,
    );
    const done = await run(
      () => rejectMutation.mutateAsync({ id: selectedId, reason }),
      "admin.socialPosts.actions.rejected",
    );
    if (done) resetReject();
  }, [rejectMutation, rejectNote, rejectNoteMissing, rejectReason, resetReject, run, selectedId, t]);

  const startEdit = useCallback(() => {
    const copy = post?.copies[language];
    const initial = copy ? draftFromCopy(copy) : emptyCopyDraft();
    setDraft(initial);
    setDraftBase(initial);
    setShowDraftErrors(false);
    resetReject();
    setEditing(true);
  }, [language, post, resetReject]);

  const saveEdit = useCallback(async () => {
    if (!selectedId) return;
    if (draftErrors.length > 0) {
      setShowDraftErrors(true);
      return;
    }
    const done = await run(
      () => updateMutation.mutateAsync({ id: selectedId, language, draft }),
      "admin.socialPosts.actions.saved",
    );
    if (done) setEditing(false);
  }, [draft, draftErrors.length, language, run, selectedId, updateMutation]);

  const planNow = useCallback(async () => {
    try {
      const result = await planMutation.mutateAsync();
      setLastPlan(result);
      clearTimeout(copyWait.current);
      setAwaitingCopy(result.created > 0);
      if (result.created > 0) copyWait.current = setTimeout(() => setAwaitingCopy(false), COPY_WAIT_MS);
      showSuccess(t("admin.socialPosts.planned", { count: result.created, from: result.from, to: result.to }));
    } catch {
      showError(t("admin.socialPosts.planError"));
    }
  }, [planMutation, showError, showSuccess, t]);

  const updateDraft = useCallback((field: DraftTextField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  }, []);

  const updateSlide = useCallback((index: number, field: keyof SocialPostSlide, value: string) => {
    setDraft((current) => ({
      ...current,
      slides: current.slides.map((slide, position) => (position === index ? { ...slide, [field]: value } : slide)),
    }));
  }, []);

  const addSlide = useCallback(() => {
    setDraft((current) => ({ ...current, slides: [...current.slides, { title: "", body: "" }] }));
  }, []);

  const removeSlide = useCallback((index: number) => {
    setDraft((current) => ({ ...current, slides: current.slides.filter((_, position) => position !== index) }));
  }, []);

  const shareSlide = useCallback(
    async (url: string, index: number) => {
      const title = t("admin.socialPosts.media.shareTitle", { index: index + 1, total: slides.length });
      if ((await adminSocialPostsService.shareSlide(url, title)) === "failed") showError(t("common.shareFailed"));
    },
    [showError, slides.length, t],
  );

  const working =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    updateMutation.isPending ||
    regenerateMutation.isPending ||
    illustrationMutation.isPending ||
    retryMutation.isPending ||
    rescheduleMutation.isPending ||
    publishNowMutation.isPending;
  const totalItems = list.data?.totalItems ?? 0;

  return {
    t,
    locale,
    formatDate,
    formatDay,
    formatNumber,
    status,
    setStatus,
    page,
    setPage,
    language,
    setLanguage,
    format,
    setFormat,
    posts: list.data?.items ?? [],
    totalItems,
    totalPages: Math.ceil(totalItems / SOCIAL_POSTS_PAGE_SIZE),
    isLoading: list.isLoading,
    isError: list.isError,
    refetch: list.refetch,
    selectedId,
    selectPost,
    closePost: () => setSelectedId(null),
    post,
    copy: post ? post.copies[language] : null,
    languagePending: post ? isLanguagePending(post, language) : false,
    slides,
    isDetailLoading: detail.isLoading,
    isDetailError: detail.isError,
    refetchDetail: detail.refetch,
    actions,
    working,
    approve,
    regenerate,
    canRequestIllustration: post ? canRequestIllustration(post) : false,
    newIllustration,
    rejecting,
    rejectReason,
    setRejectReason,
    rejectNote,
    setRejectNote: (note: string) => setRejectNoteState(note),
    rejectNoteError: rejectAttempted && rejectNoteMissing ? t("admin.socialPosts.reject.noteRequired") : undefined,
    startReject: () => {
      closeScheduleActions();
      setRejecting(true);
    },
    cancelReject: resetReject,
    confirmReject,
    editing,
    draft,
    draftErrors,
    draftDirty: JSON.stringify(draft) !== JSON.stringify(draftBase),
    saving: updateMutation.isPending,
    showDraftErrors,
    startEdit,
    cancelEdit: () => setEditing(false),
    saveEdit,
    updateDraft,
    updateSlide,
    addSlide,
    removeSlide,
    planNow,
    isPlanning: planMutation.isPending,
    lastPlan,
    awaitingCopy,
    wineDays,
    wineDaysLoading: thisYearDays.isLoading || nextYearDays.isLoading,
    wineDaysError: thisYearDays.isError || nextYearDays.isError,
    refetchWineDays: () => {
      void thisYearDays.refetch();
      void nextYearDays.refetch();
    },
    openSlide: (url: string) => openLink(url),
    shareSlide,
    retryPublication,
    openPermalink: (url: string) => openLink(url),
    canReschedule: post?.canReschedule ?? false,
    canPublishNow: post?.canPublishNow ?? false,
    networkTimes,
    rescheduling,
    scheduleDraft,
    setScheduleDate: (date: string) => setScheduleDraft((current) => ({ ...current, date })),
    setScheduleTime: (time: string) => setScheduleDraft((current) => ({ ...current, time })),
    rescheduleWarning: post?.wineDay
      ? t("admin.socialPosts.schedule.wineDayWarning", { day: localizedName(post.wineDay, language) })
      : undefined,
    startReschedule,
    cancelReschedule: () => setRescheduling(false),
    confirmReschedule,
    confirmingPublishNow,
    startPublishNow,
    cancelPublishNow: () => setConfirmingPublishNow(false),
    confirmPublishNow,
  };
}

function scheduleActionErrorKey(error: unknown): string {
  const code = socialPostActionError(error);
  if (code) return `admin.socialPosts.actionErrors.${code}`;
  return isSocialPostConflict(error) ? "admin.socialPosts.actions.conflict" : "admin.socialPosts.actions.error";
}

function retryErrorKey(error: unknown): string {
  if (isPublishingOffError(error)) return "admin.socialPosts.publications.retryOff";
  return isSocialPostConflict(error) ? "admin.socialPosts.actions.conflict" : "admin.socialPosts.actions.error";
}

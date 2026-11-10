import { act, renderHook } from "@testing-library/react-native";
import { LEGAL_LINES, type SocialPost, type SocialPostCopy } from "@/domain/admin/socialPost";
import { useAdminSocialPostsViewModel } from "./useAdminSocialPostsViewModel";

const mockListArgs = jest.fn();
const mockDetailArgs = jest.fn();
const mockWineDayArgs = jest.fn();
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockOpenLink = jest.fn();
const mockShareSlide = jest.fn();
const mutation = () => ({ mutateAsync: jest.fn(), isPending: false });
const mockApprove = mutation();
const mockReject = mutation();
const mockUpdate = mutation();
const mockRegenerate = mutation();
const mockIllustration = mutation();
const mockPlan = mutation();
const mockRetry = mutation();
const mockReschedule = mutation();
const mockPublishNow = mutation();
const mockDetail = { data: undefined as SocialPost | undefined, isLoading: false, isError: false, refetch: jest.fn() };
const mockWineDays: Record<number, unknown[]> = {};
const mockLanguage = { value: "en-US" };

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
    i18n: { language: mockLanguage.value },
  }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));
jest.mock("@/presentation/hooks/useExternalLink", () => ({ useExternalLink: () => mockOpenLink }));
jest.mock("@/application/services/adminSocialPosts.service", () => ({
  ...jest.requireActual("@/application/services/adminSocialPosts.service"),
  adminSocialPostsService: { shareSlide: (...args: unknown[]) => mockShareSlide(...args) },
}));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminSocialPosts: (...args: unknown[]) => {
    mockListArgs(...args);
    return { data: { items: [], totalItems: 45 }, isLoading: false, isError: false, refetch: jest.fn() };
  },
  useAdminSocialPost: (id: string | null) => {
    mockDetailArgs(id);
    return mockDetail;
  },
  useAdminWineDays: (year: number, enabled = true) => {
    mockWineDayArgs(year, enabled);
    return { data: enabled ? mockWineDays[year] : undefined, isLoading: false, isError: false, refetch: jest.fn() };
  },
  useApproveSocialPost: () => mockApprove,
  useRejectSocialPost: () => mockReject,
  useUpdateSocialPostCopy: () => mockUpdate,
  useRegenerateSocialPost: () => mockRegenerate,
  useNewSocialPostIllustration: () => mockIllustration,
  usePlanSocialPosts: () => mockPlan,
  useRetrySocialPublication: () => mockRetry,
  useRescheduleSocialPost: () => mockReschedule,
  usePublishSocialPostNow: () => mockPublishNow,
}));

const spanish: SocialPostCopy = {
  hook: "Día del Malbec",
  slides: [
    { title: "Uno", body: "Cuerpo uno" },
    { title: "Dos", body: "Cuerpo dos" },
    { title: "Tres", body: "Cuerpo tres" },
  ],
  caption: `Brindemos.\n\n${LEGAL_LINES.es}`,
  hashtags: ["#vinnot", "#malbec", "#vino", "#argentina", "#wine"],
  altText: "Copa",
  cta: "Seguinos",
  illustration: null,
};

const post: SocialPost = {
  id: "p1",
  status: "PENDING_APPROVAL",
  scheduledFor: "2026-11-07T12:00:00Z",
  pillar: null,
  wineDay: null,
  copies: { es: spanish, en: null },
  generation: {
    provider: null,
    model: null,
    mock: false,
    attempts: 1,
    generatedAt: null,
    factCheck: null,
    issues: [],
    error: null,
  },
  review: null,
  media: {
    status: "READY",
    source: "AI",
    error: null,
    illustrationReason: null,
    heroUrl: null,
    slides: { es: { instagram: ["ig-1", "ig-2"], tiktok: ["tt-1"], renderedFor: "h" }, en: null },
    updatedAt: null,
  },
  publishing: null,
  publications: [],
  canReschedule: false,
  canPublishNow: false,
  networkSchedule: [],
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};

const today = new Date(2026, 10, 3);

function render(day = today) {
  return renderHook(() => useAdminSocialPostsViewModel(day));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  mockLanguage.value = "en-US";
  mockDetail.data = undefined;
  for (const year of Object.keys(mockWineDays)) delete mockWineDays[Number(year)];
  mockRetry.isPending = false;
  mockReschedule.isPending = false;
  for (const fn of [
    mockApprove,
    mockReject,
    mockUpdate,
    mockRegenerate,
    mockIllustration,
    mockRetry,
    mockReschedule,
    mockPublishNow,
  ]) {
    fn.mutateAsync.mockResolvedValue(post);
  }
});

it("starts on the pending queue in the app language and resets the page when the status changes", () => {
  const { result } = render();
  expect(result.current.status).toBe("PENDING_APPROVAL");
  expect(result.current.language).toBe("en");
  expect(result.current.totalPages).toBe(3);
  expect(mockListArgs).toHaveBeenLastCalledWith(0, 20, "PENDING_APPROVAL", 0);

  act(() => result.current.setPage(2));
  expect(mockListArgs).toHaveBeenLastCalledWith(2, 20, "PENDING_APPROVAL", 0);

  act(() => result.current.setStatus("APPROVED"));
  expect(result.current.page).toBe(0);
  expect(mockListArgs).toHaveBeenLastCalledWith(0, 20, "APPROVED", 0);
});

it("shows the selected language and format of the open post, a missing language as pending", () => {
  mockLanguage.value = "es-AR";
  mockDetail.data = post;
  const { result } = render();
  expect(result.current.post).toBeUndefined();

  act(() => result.current.selectPost("p1"));

  expect(mockDetailArgs).toHaveBeenLastCalledWith("p1");
  expect(result.current.post?.id).toBe("p1");
  expect(result.current.copy?.hook).toBe("Día del Malbec");
  expect(result.current.slides).toEqual(["ig-1", "ig-2"]);
  expect(result.current.actions).toEqual(["approve", "reject", "edit", "regenerate"]);
  expect(result.current.canRequestIllustration).toBe(true);

  act(() => result.current.setFormat("TIKTOK"));
  expect(result.current.slides).toEqual(["tt-1"]);

  act(() => result.current.setLanguage("en"));
  expect(result.current.copy).toBeNull();
  expect(result.current.languagePending).toBe(true);
  expect(result.current.slides).toEqual([]);
  expect(result.current.actions).toEqual(["approve", "reject", "regenerate"]);

  act(() => result.current.closePost());
  expect(mockDetailArgs).toHaveBeenLastCalledWith(null);
});

it("approves, regenerates and asks for a new illustration with a success message", async () => {
  mockDetail.data = post;
  const { result } = render();
  act(() => result.current.selectPost("p1"));

  await act(async () => {
    await result.current.approve();
    await result.current.regenerate();
    await result.current.newIllustration();
  });

  expect(mockApprove.mutateAsync).toHaveBeenCalledWith("p1");
  expect(mockRegenerate.mutateAsync).toHaveBeenCalledWith("p1");
  expect(mockIllustration.mutateAsync).toHaveBeenCalledWith("p1");
  expect(mockShowSuccess.mock.calls).toEqual([
    ["admin.socialPosts.actions.approved"],
    ["admin.socialPosts.actions.regenerated"],
    ["admin.socialPosts.media.requested"],
  ]);
});

it("explains a conflict and any other failure", async () => {
  mockDetail.data = post;
  mockApprove.mutateAsync.mockRejectedValueOnce({ status: 409, message: "conflict" });
  mockApprove.mutateAsync.mockRejectedValueOnce({ status: 500, message: "boom" });
  const { result } = render();

  await act(async () => {
    await result.current.approve();
  });
  expect(mockApprove.mutateAsync).not.toHaveBeenCalled();

  act(() => result.current.selectPost("p1"));
  await act(async () => {
    await result.current.approve();
    await result.current.approve();
  });

  expect(mockShowError.mock.calls).toEqual([
    ["admin.socialPosts.actions.conflict"],
    ["admin.socialPosts.actions.error"],
  ]);
});

it("rejects with a one-tap reason, sending its label, or the note written under Other", async () => {
  mockDetail.data = post;
  const { result } = render();
  act(() => result.current.selectPost("p1"));
  act(() => result.current.startReject());
  expect(result.current.rejecting).toBe(true);
  expect(result.current.rejectReason).toBe("OFF_BRAND_TONE");

  await act(async () => {
    await result.current.confirmReject();
  });
  expect(mockReject.mutateAsync).toHaveBeenLastCalledWith({
    id: "p1",
    reason: "admin.socialPosts.rejectReasons.OFF_BRAND_TONE",
  });
  expect(result.current.rejecting).toBe(false);

  act(() => result.current.startReject());
  act(() => result.current.setRejectReason("OTHER"));
  await act(async () => {
    await result.current.confirmReject();
  });
  expect(result.current.rejectNoteError).toBe("admin.socialPosts.reject.noteRequired");
  expect(mockReject.mutateAsync).toHaveBeenCalledTimes(1);

  act(() => result.current.setRejectNote("  Muy largo  "));
  expect(result.current.rejectNoteError).toBeUndefined();
  await act(async () => {
    await result.current.confirmReject();
  });
  expect(mockReject.mutateAsync).toHaveBeenLastCalledWith({ id: "p1", reason: "Muy largo" });

  act(() => result.current.startReject());
  act(() => result.current.cancelReject());
  expect(result.current.rejecting).toBe(false);
});

it("keeps the reject form open when the reject fails", async () => {
  mockDetail.data = post;
  mockReject.mutateAsync.mockRejectedValueOnce({ status: 500, message: "boom" });
  const { result } = render();
  act(() => result.current.selectPost("p1"));
  act(() => result.current.startReject());

  await act(async () => {
    await result.current.confirmReject();
  });

  expect(result.current.rejecting).toBe(true);
  expect(mockShowError).toHaveBeenCalledWith("admin.socialPosts.actions.error");
});

it("edits the copy of the selected language and saves it only when it is valid", async () => {
  mockLanguage.value = "es";
  mockDetail.data = post;
  const { result } = render();
  act(() => result.current.selectPost("p1"));

  act(() => result.current.startEdit());
  expect(result.current.editing).toBe(true);
  expect(result.current.draft.hook).toBe("Día del Malbec");
  expect(result.current.draftErrors).toEqual([]);
  expect(result.current.draftDirty).toBe(false);
  expect(result.current.saving).toBe(false);

  act(() => result.current.updateDraft("hook", ""));
  expect(result.current.draftDirty).toBe(true);
  act(() => result.current.addSlide());
  act(() => result.current.updateSlide(3, "title", "Cuatro"));
  expect(result.current.draft.slides[3]).toEqual({ title: "Cuatro", body: "" });
  expect(result.current.draftErrors).toEqual(["HOOK_REQUIRED", "SLIDE_INCOMPLETE"]);
  await act(async () => {
    await result.current.saveEdit();
  });
  expect(mockUpdate.mutateAsync).not.toHaveBeenCalled();
  expect(result.current.showDraftErrors).toBe(true);

  act(() => result.current.removeSlide(3));
  act(() => result.current.updateDraft("hook", "Nuevo gancho"));
  await act(async () => {
    await result.current.saveEdit();
  });

  expect(mockUpdate.mutateAsync).toHaveBeenCalledWith({
    id: "p1",
    language: "es",
    draft: expect.objectContaining({ hook: "Nuevo gancho" }),
  });
  expect(mockShowSuccess).toHaveBeenCalledWith("admin.socialPosts.actions.saved");
  expect(result.current.editing).toBe(false);

  act(() => result.current.startEdit());
  act(() => result.current.cancelEdit());
  expect(result.current.editing).toBe(false);
});

it("starts an empty draft when the selected language has no copy", () => {
  mockDetail.data = post;
  const { result } = render();
  act(() => result.current.selectPost("p1"));
  act(() => result.current.startEdit());

  expect(result.current.draft.hook).toBe("");
  expect(result.current.draft.slides).toHaveLength(3);
});

it("plans now, tells how many posts it created and refreshes the queue for a few minutes", async () => {
  jest.useFakeTimers();
  mockPlan.mutateAsync.mockResolvedValue({ created: 3, from: "2026-11-04", to: "2026-11-30" });
  const { result } = render();

  await act(async () => {
    await result.current.planNow();
  });

  expect(mockShowSuccess).toHaveBeenCalledWith(
    'admin.socialPosts.planned:{"count":3,"from":"2026-11-04","to":"2026-11-30"}',
  );
  expect(result.current.lastPlan).toEqual({ created: 3, from: "2026-11-04", to: "2026-11-30" });
  expect(result.current.awaitingCopy).toBe(true);
  expect(mockListArgs).toHaveBeenLastCalledWith(0, 20, "PENDING_APPROVAL", 10_000);

  act(() => {
    jest.advanceTimersByTime(5 * 60_000);
  });
  expect(result.current.awaitingCopy).toBe(false);
  expect(mockListArgs).toHaveBeenLastCalledWith(0, 20, "PENDING_APPROVAL", 0);
});

it("does not wait for copy when the plan created nothing, and reports a failed plan", async () => {
  mockPlan.mutateAsync
    .mockResolvedValueOnce({ created: 0, from: "2026-11-04", to: "2026-11-30" })
    .mockRejectedValueOnce(new Error("boom"));
  const { result } = render();

  await act(async () => {
    await result.current.planNow();
  });
  expect(result.current.awaitingCopy).toBe(false);

  await act(async () => {
    await result.current.planNow();
  });
  expect(mockShowError).toHaveBeenCalledWith("admin.socialPosts.planError");
});

it("lists the wine days of this month and the next, across the new year", () => {
  mockWineDays[2026] = [
    { code: "A", date: "2026-12-04", nameEs: "A", nameEn: "A", kind: "GRAPE", priority: 1, countryCode: null },
    { code: "B", date: "2026-10-04", nameEs: "B", nameEn: "B", kind: "GRAPE", priority: 1, countryCode: null },
  ];
  mockWineDays[2027] = [
    { code: "C", date: "2027-01-02", nameEs: "C", nameEn: "C", kind: "GRAPE", priority: 1, countryCode: null },
  ];
  const { result } = render(new Date(2026, 11, 3));

  expect(mockWineDayArgs).toHaveBeenCalledWith(2027, true);
  expect(result.current.wineDays.map((day) => day.code)).toEqual(["A", "C"]);
  expect(result.current.formatDay("2027-01-02")).toContain("2");
  expect(result.current.formatDate("2026-11-07T12:00:00Z")).toContain("2026");

  result.current.refetchWineDays();
});

it("asks for one year of wine days when the window stays in the year", () => {
  const { result } = render();

  expect(mockWineDayArgs).toHaveBeenCalledWith(2026, true);
  expect(mockWineDayArgs).toHaveBeenCalledWith(2026, false);
  expect(result.current.wineDays).toEqual([]);
});

it("opens a slide and shares it, reporting a failed share", async () => {
  mockLanguage.value = "es";
  mockDetail.data = post;
  mockShareSlide.mockResolvedValueOnce("shared").mockResolvedValueOnce("failed");
  const { result } = render();
  act(() => result.current.selectPost("p1"));

  await act(async () => {
    await result.current.openSlide("ig-1");
    await result.current.shareSlide("ig-1", 0);
    await result.current.shareSlide("ig-1", 0);
  });

  expect(mockOpenLink).toHaveBeenCalledWith("ig-1");
  expect(mockShareSlide).toHaveBeenCalledWith("ig-1", 'admin.socialPosts.media.shareTitle:{"index":1,"total":2}');
  expect(mockShowError).toHaveBeenCalledTimes(1);
  expect(mockShowError).toHaveBeenCalledWith("common.shareFailed");
});

it("retries the publication of one network of the open post and reports the outcome", async () => {
  mockDetail.data = { ...post, status: "FAILED" };
  const { result } = render();
  act(() => result.current.selectPost("p1"));

  await act(async () => {
    await result.current.retryPublication("THREADS");
  });
  expect(mockRetry.mutateAsync).toHaveBeenCalledWith({ id: "p1", network: "THREADS" });
  expect(mockShowSuccess).toHaveBeenCalledWith("admin.socialPosts.publications.retried");

  mockRetry.mutateAsync.mockRejectedValueOnce({ status: 409, message: "not failed" });
  await act(async () => {
    await result.current.retryPublication("THREADS");
  });
  expect(mockShowError).toHaveBeenCalledWith("admin.socialPosts.actions.conflict");

  mockRetry.mutateAsync.mockRejectedValueOnce({ status: 409, code: "SOCIAL_PUBLISHING_OFF", message: "off" });
  await act(async () => {
    await result.current.retryPublication("THREADS");
  });
  expect(mockShowError).toHaveBeenCalledWith("admin.socialPosts.publications.retryOff");

  mockRetry.mutateAsync.mockRejectedValueOnce({ status: 500, message: "boom" });
  await act(async () => {
    await result.current.retryPublication("THREADS");
  });
  expect(mockShowError).toHaveBeenLastCalledWith("admin.socialPosts.actions.error");
});

it("does not retry without an open post, and is busy while a retry runs", async () => {
  mockRetry.isPending = true;
  const { result } = render();

  await act(async () => {
    await result.current.retryPublication("INSTAGRAM");
  });

  expect(mockRetry.mutateAsync).not.toHaveBeenCalled();
  expect(result.current.working).toBe(true);
});

it("opens a publication's permalink through the external link adapter", () => {
  const { result } = render();
  act(() => {
    void result.current.openPermalink("https://www.threads.net/@vinnot/post/1");
  });
  expect(mockOpenLink).toHaveBeenCalledWith("https://www.threads.net/@vinnot/post/1");
});

it("formats counts in the app language", () => {
  const { result } = render();
  expect(result.current.formatNumber(1200)).toBe((1200).toLocaleString("en-US"));
});

const malbecDay = { code: "MALBEC", nameEs: "Día del Malbec", nameEn: "Malbec Day", date: "2027-04-17" };

it("offers to move the post and to publish it now only when the backend allows each", () => {
  const { result, rerender } = render();
  expect(result.current.canReschedule).toBe(false);
  expect(result.current.canPublishNow).toBe(false);

  act(() => result.current.selectPost("p1"));
  mockDetail.data = { ...post, canReschedule: true };
  rerender({});
  expect(result.current.canReschedule).toBe(true);
  expect(result.current.canPublishNow).toBe(false);

  mockDetail.data = { ...post, status: "APPROVED", canPublishNow: true };
  rerender({});
  expect(result.current.canReschedule).toBe(false);
  expect(result.current.canPublishNow).toBe(true);
});

it("prefills the new date and time in Argentina time, warns about the wine day and sends the instant", async () => {
  mockDetail.data = { ...post, canReschedule: true, wineDay: malbecDay };
  const { result } = render();
  act(() => result.current.selectPost("p1"));

  act(() => result.current.startReschedule());
  expect(result.current.rescheduling).toBe(true);
  expect(result.current.scheduleDraft).toEqual({ date: "2026-11-07", time: "09:00" });
  expect(result.current.rescheduleWarning).toBe('admin.socialPosts.schedule.wineDayWarning:{"day":"Malbec Day"}');

  act(() => {
    result.current.setScheduleDate("2026-11-10");
    result.current.setScheduleTime("12:30");
  });
  await act(async () => {
    await result.current.confirmReschedule();
  });

  expect(mockReschedule.mutateAsync).toHaveBeenCalledWith({ id: "p1", scheduledFor: "2026-11-10T15:30:00.000Z" });
  expect(mockShowSuccess).toHaveBeenCalledWith("admin.socialPosts.schedule.saved");
  expect(result.current.rescheduling).toBe(false);
});

it("does not warn about a wine day on a pillar post, and closes the form on cancel or when another post opens", () => {
  mockDetail.data = { ...post, canReschedule: true };
  const { result } = render();
  act(() => result.current.selectPost("p1"));

  act(() => result.current.startReschedule());
  expect(result.current.rescheduleWarning).toBeUndefined();
  act(() => result.current.cancelReschedule());
  expect(result.current.rescheduling).toBe(false);

  act(() => result.current.startReschedule());
  act(() => result.current.selectPost("p2"));
  expect(result.current.rescheduling).toBe(false);
});

it("explains each refused reschedule and keeps the form open", async () => {
  mockDetail.data = { ...post, canReschedule: true };
  mockReschedule.mutateAsync
    .mockRejectedValueOnce({ status: 400, code: "SOCIAL_POST_SCHEDULE_NOT_FUTURE", message: "past" })
    .mockRejectedValueOnce({ status: 409, code: "SOCIAL_POST_DATE_TAKEN", message: "taken" })
    .mockRejectedValueOnce({ status: 409, code: "INVALID_POST_TRANSITION", message: "published" })
    .mockRejectedValueOnce({ status: 500, message: "boom" });
  const { result } = render();
  act(() => result.current.selectPost("p1"));
  act(() => result.current.startReschedule());

  await act(async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) await result.current.confirmReschedule();
  });

  expect(mockShowError.mock.calls).toEqual([
    ["admin.socialPosts.actionErrors.SOCIAL_POST_SCHEDULE_NOT_FUTURE"],
    ["admin.socialPosts.actionErrors.SOCIAL_POST_DATE_TAKEN"],
    ["admin.socialPosts.actionErrors.INVALID_POST_TRANSITION"],
    ["admin.socialPosts.actions.error"],
  ]);
  expect(mockShowSuccess).not.toHaveBeenCalled();
  expect(result.current.rescheduling).toBe(true);
});

it("does not send a date and time that do not exist", async () => {
  mockDetail.data = { ...post, canReschedule: true };
  const { result } = render();
  act(() => result.current.selectPost("p1"));
  act(() => result.current.startReschedule());
  act(() => result.current.setScheduleDate("2026-02-30"));

  await act(async () => {
    await result.current.confirmReschedule();
  });

  expect(mockReschedule.mutateAsync).not.toHaveBeenCalled();
  expect(mockShowError).toHaveBeenCalledWith("admin.socialPosts.schedule.invalid");
});

it("asks for confirmation before publishing now and publishes only once confirmed", async () => {
  mockDetail.data = { ...post, status: "APPROVED", canPublishNow: true };
  const { result } = render();
  act(() => result.current.selectPost("p1"));

  act(() => result.current.startPublishNow());
  expect(result.current.confirmingPublishNow).toBe(true);
  expect(mockPublishNow.mutateAsync).not.toHaveBeenCalled();
  act(() => result.current.cancelPublishNow());
  expect(result.current.confirmingPublishNow).toBe(false);

  act(() => result.current.startPublishNow());
  await act(async () => {
    await result.current.confirmPublishNow();
  });

  expect(mockPublishNow.mutateAsync).toHaveBeenCalledWith("p1");
  expect(mockShowSuccess).toHaveBeenCalledWith("admin.socialPosts.publishNow.started");
  expect(result.current.confirmingPublishNow).toBe(false);
});

it("explains each refused publish-now and any other conflict", async () => {
  mockDetail.data = { ...post, status: "APPROVED", canPublishNow: true };
  mockPublishNow.mutateAsync
    .mockRejectedValueOnce({ status: 409, code: "SOCIAL_POST_MEDIA_NOT_READY", message: "media" })
    .mockRejectedValueOnce({ status: 409, code: "SOCIAL_PUBLISHING_OFF", message: "off" })
    .mockRejectedValueOnce({ status: 409, code: "INVALID_POST_TRANSITION", message: "not approved" })
    .mockRejectedValueOnce({ status: 409, message: "conflict" });
  const { result } = render();
  act(() => result.current.selectPost("p1"));
  act(() => result.current.startPublishNow());

  await act(async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) await result.current.confirmPublishNow();
  });

  expect(mockShowError.mock.calls).toEqual([
    ["admin.socialPosts.actionErrors.SOCIAL_POST_MEDIA_NOT_READY"],
    ["admin.socialPosts.actionErrors.SOCIAL_PUBLISHING_OFF"],
    ["admin.socialPosts.actionErrors.INVALID_POST_TRANSITION"],
    ["admin.socialPosts.actions.conflict"],
  ]);
  expect(result.current.confirmingPublishNow).toBe(true);
});

it("keeps one action form open at a time", () => {
  mockDetail.data = { ...post, status: "APPROVED", canReschedule: true, canPublishNow: true };
  const { result } = render();
  act(() => result.current.selectPost("p1"));

  act(() => result.current.startReschedule());
  act(() => result.current.startPublishNow());
  expect(result.current.rescheduling).toBe(false);
  expect(result.current.confirmingPublishNow).toBe(true);

  act(() => result.current.startReject());
  expect(result.current.confirmingPublishNow).toBe(false);
  expect(result.current.rejecting).toBe(true);

  act(() => result.current.startReschedule());
  expect(result.current.rejecting).toBe(false);
  expect(result.current.rescheduling).toBe(true);
});

it("does nothing without an open post, and is busy while a reschedule runs", async () => {
  mockReschedule.isPending = true;
  const { result } = render();

  await act(async () => {
    await result.current.confirmReschedule();
    await result.current.confirmPublishNow();
  });

  expect(mockReschedule.mutateAsync).not.toHaveBeenCalled();
  expect(mockPublishNow.mutateAsync).not.toHaveBeenCalled();
  expect(result.current.working).toBe(true);
});

it("lists each network's publishing time in Argentina time", () => {
  mockDetail.data = {
    ...post,
    networkSchedule: [
      { network: "INSTAGRAM", publishAt: "2026-11-11T15:30:00Z" },
      { network: "TIKTOK", publishAt: "2026-11-11T22:30:00Z" },
    ],
  };
  const { result } = render();
  act(() => result.current.selectPost("p1"));

  expect(result.current.networkTimes).toEqual([
    { network: "INSTAGRAM", time: "12:30" },
    { network: "TIKTOK", time: "19:30" },
  ]);
});

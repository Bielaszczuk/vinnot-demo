import { act, renderHook } from "@testing-library/react-native";
import { useAnnouncementComposerViewModel } from "./useAnnouncementComposerViewModel";

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockTest = { mutateAsync: jest.fn(), isPending: false };
const mockSend = { mutateAsync: jest.fn(), isPending: false };
const mockReach = {
  data: { email: 3, push: 2, accounts: 4 } as { email: number; push: number; accounts: number } | undefined,
  isFetching: false,
  isError: false,
  refetch: jest.fn(),
};
const mockPreview = { data: undefined, isFetching: false, isError: false };
const mockHistory = { data: [], isLoading: false, isError: false, refetch: jest.fn() };
const mockPreviewArgs = jest.fn();
const mockReachArgs = jest.fn();
const mockRegionsArgs = jest.fn();
let mockRequestIds = 0;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));
jest.mock("@/presentation/hooks/ui", () => ({ useDebounce: <T,>(value: T) => value }));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminCountries: () => ({ data: [{ id: "c1", code: "AR", name: "Argentina" }], isError: false }),
  useAdminRegions: (countryId: string | undefined) => {
    mockRegionsArgs(countryId);
    return { data: countryId ? [{ id: "r1", name: "Mendoza" }] : [], isError: false };
  },
  useAnnouncementHistory: () => mockHistory,
  useAnnouncementPreview: (...args: unknown[]) => {
    mockPreviewArgs(...args);
    return mockPreview;
  },
  useAnnouncementReach: (...args: unknown[]) => {
    mockReachArgs(...args);
    return mockReach;
  },
  useTestAnnouncement: () => mockTest,
  useSendAnnouncement: () => mockSend,
}));
jest.mock("@/application/services/adminNotifications.service", () => ({
  ...jest.requireActual("@/application/services/adminNotifications.service"),
  adminNotificationsService: { newSendRequestId: () => `request-${++mockRequestIds}` },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestIds = 0;
  mockTest.isPending = false;
  mockSend.isPending = false;
  mockReach.data = { email: 3, push: 2, accounts: 4 };
  mockReach.isFetching = false;
  mockReach.isError = false;
  mockTest.mutateAsync.mockResolvedValue({ email: 1, push: 0, accounts: 1 });
  mockSend.mutateAsync.mockResolvedValue({ id: "a1", recipients: 4 });
});

function writeSpanish(result: { current: ReturnType<typeof useAnnouncementComposerViewModel> }) {
  act(() => result.current.updateVersion({ title: "Llega la vendimia", body: "Cuerpo" }));
}

it("blocks the test and the send until the draft is complete, showing the first problem", () => {
  const { result } = renderHook(() => useAnnouncementComposerViewModel());

  expect(result.current.errors).toEqual(["CONTENT_REQUIRED"]);
  expect(result.current.canTest).toBe(false);
  expect(result.current.canSend).toBe(false);
  expect(result.current.blockingMessage).toBe("admin.notifications.draftErrors.CONTENT_REQUIRED");

  writeSpanish(result);

  expect(result.current.errors).toEqual([]);
  expect(result.current.languages).toEqual(["es"]);
  expect(result.current.canTest).toBe(true);
  expect(result.current.canSend).toBe(true);
  expect(result.current.blockingMessage).toBeNull();
});

it("explains why the send stays off once the draft is complete: no reach, a failed or a pending count", () => {
  const { result, rerender } = renderHook(() => useAnnouncementComposerViewModel());
  writeSpanish(result);

  mockReach.data = { email: 0, push: 0, accounts: 0 };
  rerender({});
  expect(result.current.canTest).toBe(true);
  expect(result.current.canSend).toBe(false);
  expect(result.current.blockingMessage).toBe("admin.notifications.composer.sendBlocked.noReach");

  mockReach.data = undefined;
  mockReach.isError = true;
  rerender({});
  expect(result.current.blockingMessage).toBe("admin.notifications.composer.sendBlocked.reachFailed");

  mockReach.isError = false;
  mockReach.isFetching = true;
  rerender({});
  expect(result.current.blockingMessage).toBe("admin.notifications.composer.sendBlocked.reachPending");

  mockReach.isFetching = false;
  mockReach.data = { email: 3, push: 2, accounts: 4 };
  rerender({});
  expect(result.current.blockingMessage).toBeNull();
});

it("previews the body that was debounced together with its language", () => {
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  writeSpanish(result);
  expect(result.current.previewBody).toBe("Cuerpo");
});

it("requires a channel and keeps the title on one line", () => {
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  writeSpanish(result);

  act(() => result.current.updateAudience({ email: false, push: false }));
  expect(result.current.errors).toEqual(["CHANNEL_REQUIRED"]);

  act(() => result.current.updateTitle("one\ntwo"));
  expect(result.current.version.title).toBe("one two");
});

it("writes each language separately and previews the one being edited", () => {
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  writeSpanish(result);

  act(() => result.current.setLanguage("en"));
  expect(result.current.version).toEqual({ title: "", body: "" });
  expect(result.current.previewable).toBe(false);
  expect(mockPreviewArgs).toHaveBeenLastCalledWith("NEWS", "en", null);

  act(() => result.current.updateVersion({ title: "Harvest", body: "Body" }));
  expect(result.current.languages).toEqual(["es", "en"]);
  expect(result.current.previewLanguage).toBe("en");
  expect(mockPreviewArgs).toHaveBeenLastCalledWith("NEWS", "en", { title: "Harvest", body: "Body" });
});

it("picks the kind with one tap and asks the reach of the current audience", () => {
  const { result } = renderHook(() => useAnnouncementComposerViewModel());

  act(() => result.current.setKind("SERVICE"));
  act(() => result.current.updateAudience({ language: "en", role: "PARTNER" }));

  expect(result.current.draft.kind).toBe("SERVICE");
  expect(mockReachArgs).toHaveBeenLastCalledWith(
    "SERVICE",
    expect.objectContaining({ language: "en", role: "PARTNER", email: true, push: true }),
  );
});

it("clears the region when the country changes and loads that country's regions", () => {
  const { result } = renderHook(() => useAnnouncementComposerViewModel());

  act(() => result.current.selectCountry("c1"));
  act(() => result.current.updateAudience({ regionId: "r1" }));
  expect(result.current.regions).toEqual([{ id: "r1", name: "Mendoza" }]);
  expect(mockRegionsArgs).toHaveBeenLastCalledWith("c1");

  act(() => result.current.selectCountry(null));
  expect(result.current.draft.audience.countryId).toBeNull();
  expect(result.current.draft.audience.regionId).toBeNull();
});

it("inserts the toolbar format at the body selection and selects the link placeholder", () => {
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  act(() => result.current.updateVersion({ body: "see more" }));

  act(() => result.current.onBodySelectionChange({ start: 4, end: 8 }));
  act(() => result.current.applyFormat("link"));

  expect(result.current.version.body).toBe("see [more](https://)");
  expect(result.current.bodySelection).toEqual({ start: 11, end: 19 });

  act(() => result.current.onBodySelectionChange({ start: 11, end: 19 }));
  expect(result.current.bodySelection).toBeUndefined();
});

it("formats at the end of the body when nothing was selected, clamped to the current text", () => {
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  act(() => result.current.onBodySelectionChange({ start: 40, end: 40 }));
  act(() => result.current.applyFormat("bold"));

  expect(result.current.version.body).toBe(
    "**admin.notifications.composer.formatFallback.bold**",
  );
});

it("sends a test and says where it went", async () => {
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  writeSpanish(result);

  await act(async () => {
    await result.current.sendTest();
  });
  expect(mockTest.mutateAsync).toHaveBeenCalledWith(result.current.draft);
  expect(mockShowSuccess).toHaveBeenLastCalledWith("admin.notifications.composer.testSentEmail");

  mockTest.mutateAsync.mockResolvedValue({ email: 1, push: 1, accounts: 1 });
  await act(async () => {
    await result.current.sendTest();
  });
  expect(mockShowSuccess).toHaveBeenLastCalledWith("admin.notifications.composer.testSentBoth");
});

it("explains why the test could not reach the administrator", async () => {
  mockTest.mutateAsync.mockRejectedValue({ message: "x", code: "ANNOUNCEMENT_TEST_UNREACHABLE" });
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  writeSpanish(result);

  await act(async () => {
    await result.current.sendTest();
  });

  expect(mockShowError).toHaveBeenCalledWith("admin.notifications.errors.ANNOUNCEMENT_TEST_UNREACHABLE");
});

it("uses a generic message for refusals it cannot explain", async () => {
  mockTest.mutateAsync.mockRejectedValue(new Error("Identity confirmation cancelled"));
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  writeSpanish(result);

  await act(async () => {
    await result.current.sendTest();
  });

  expect(mockShowError).toHaveBeenCalledWith("admin.notifications.errors.generic");
});

it("asks for confirmation before sending and only sends from the confirmation", async () => {
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  writeSpanish(result);

  act(() => result.current.openConfirm());
  expect(result.current.confirming).toBe(true);
  expect(mockSend.mutateAsync).not.toHaveBeenCalled();

  act(() => result.current.closeConfirm());
  expect(result.current.confirming).toBe(false);
  expect(mockSend.mutateAsync).not.toHaveBeenCalled();

  act(() => result.current.openConfirm());
  await act(async () => {
    await result.current.send();
  });

  expect(mockSend.mutateAsync).toHaveBeenCalledWith({
    draft: expect.objectContaining({ versions: expect.objectContaining({ es: { title: "Llega la vendimia", body: "Cuerpo" } }) }),
    requestId: "request-1",
  });
  expect(mockShowSuccess).toHaveBeenCalledWith('admin.notifications.composer.sent:{"count":4}');
  expect(result.current.confirming).toBe(false);
  expect(result.current.draft.versions.es).toEqual({ title: "", body: "" });
  expect(result.current.language).toBe("es");
});

it("does not open the confirmation while the draft is blocked or nobody is reached", () => {
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  act(() => result.current.openConfirm());
  expect(result.current.confirming).toBe(false);

  writeSpanish(result);
  mockReach.data = { email: 0, push: 0, accounts: 0 };
  act(() => result.current.updateAudience({ role: "ADMIN" }));
  expect(result.current.canSend).toBe(false);
  act(() => result.current.openConfirm());
  expect(result.current.confirming).toBe(false);
});

it("does not trust a reach that is still being counted", () => {
  mockReach.isFetching = true;
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  writeSpanish(result);

  expect(result.current.reachSettled).toBe(false);
  expect(result.current.canSend).toBe(false);
});

it("keeps the request id when the same draft is retried and renews it for a changed draft", async () => {
  mockSend.mutateAsync.mockRejectedValueOnce({ message: "x", code: "NETWORK_ERROR" });
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  writeSpanish(result);
  act(() => result.current.openConfirm());

  await act(async () => {
    await result.current.send();
  });
  expect(mockShowError).toHaveBeenCalledWith("admin.notifications.errors.NETWORK_ERROR");
  expect(result.current.confirming).toBe(true);

  mockSend.mutateAsync.mockRejectedValueOnce({ message: "x", code: "ANNOUNCEMENT_AUDIENCE_EMPTY" });
  await act(async () => {
    await result.current.send();
  });
  expect(mockSend.mutateAsync.mock.calls[1][0].requestId).toBe("request-1");
  expect(mockShowError).toHaveBeenLastCalledWith("admin.notifications.errors.ANNOUNCEMENT_AUDIENCE_EMPTY");

  act(() => result.current.updateVersion({ title: "Otro título" }));
  await act(async () => {
    await result.current.send();
  });
  expect(mockSend.mutateAsync.mock.calls[2][0].requestId).toBe("request-2");
});

it("falls back to the reach count when the send cannot be described", async () => {
  mockSend.mutateAsync.mockResolvedValue(null);
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  writeSpanish(result);

  await act(async () => {
    await result.current.send();
  });

  expect(mockShowSuccess).toHaveBeenCalledWith('admin.notifications.composer.sent:{"count":4}');
});

it("ignores a second action while one is running", async () => {
  mockTest.isPending = true;
  const { result } = renderHook(() => useAnnouncementComposerViewModel());
  writeSpanish(result);

  expect(result.current.working).toBe(true);
  expect(result.current.canTest).toBe(false);
  await act(async () => {
    await result.current.sendTest();
    await result.current.send();
  });

  expect(mockTest.mutateAsync).not.toHaveBeenCalled();
  expect(mockSend.mutateAsync).not.toHaveBeenCalled();
});

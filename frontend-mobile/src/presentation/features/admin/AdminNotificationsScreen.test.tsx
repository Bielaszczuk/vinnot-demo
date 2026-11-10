import { act, fireEvent, render, within } from "@testing-library/react-native";
import { Modal } from "react-native";
import { AdminNotificationsScreen } from "./AdminNotificationsScreen";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockTest = { mutateAsync: jest.fn(), isPending: false };
const mockSend = { mutateAsync: jest.fn(), isPending: false };
const mockToggle = { mutateAsync: jest.fn(), isPending: false };
const mockMetricsDays = jest.fn();
const mockEngagementDays = jest.fn();
const mockDetailIds = jest.fn();
const mockRoles = jest.fn();
const mockReach = {
  data: { email: 3, push: 2, accounts: 4 },
  isFetching: false,
  isError: false,
  refetch: jest.fn(),
};
const mockDetail = {
  data: undefined as unknown,
  isFetching: false,
  isError: false,
  error: undefined as unknown,
  refetch: jest.fn(),
};
const preview = {
  subject: "Llega la vendimia",
  text: "Hola Cris,\n\nLa vendimia empieza el lunes.\n\n---\nVinnot",
  pushTitle: "Vendimia",
  pushBody: "Empieza el lunes",
};
const settings = {
  provider: "expo",
  types: [
    { type: "EVENT_REMINDER", category: "TICKETS", transactional: true, enabled: true },
    { type: "EVENT_NEARBY", category: "EVENTS_NEARBY", transactional: false, enabled: false },
  ],
  recentChanges: [],
};
const historyRecord = {
  id: "a1",
  kind: "SERVICE",
  test: true,
  audience: { email: true, push: true, language: null, countryId: null, regionId: null, role: null },
  destination: "HOME",
  title: "Mantenimiento programado",
  recipients: 1,
  sentBy: "admin@vinnot.app",
  createdAt: "2026-10-21T10:00:00Z",
  completedAt: null,
  stats: { emailsSent: 2, emailsFailed: 1, pushesSent: 4, pushesFailed: 3, pushesOpened: 1 },
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (!options) return key;
      const values = Object.entries(options)
        .filter(([name]) => name !== "lng" && name !== "defaultValue")
        .map(([, value]) => String(value));
      return values.length > 0 ? `${key}:${values.join(",")}` : key;
    },
    i18n: { language: "es" },
  }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/presentation/components/layout", () => ({ AppHeader: () => null }));
jest.mock("./AdminPageHero", () => ({ AdminPageHero: () => null }));
jest.mock("@/presentation/navigation/guards", () => ({
  RoleGuard: ({ requiredRoles, children }: { requiredRoles: string[]; children: React.ReactNode }) => {
    mockRoles(requiredRoles);
    return children;
  },
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));
jest.mock("@/presentation/hooks/ui", () => ({ useDebounce: <T,>(value: T) => value }));
jest.mock("@/application/services/adminNotifications.service", () => ({
  ...jest.requireActual("@/application/services/adminNotifications.service"),
  adminNotificationsService: { newSendRequestId: () => "request-1" },
}));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminCountries: () => ({ data: [{ id: "c1", code: "AR", name: "Argentina" }], isError: false }),
  useAdminRegions: () => ({ data: [], isError: false }),
  useAnnouncementHistory: () => ({ data: [historyRecord], isLoading: false, isError: false, refetch: jest.fn() }),
  useAnnouncementDetail: (id: string | null) => {
    mockDetailIds(id);
    return mockDetail;
  },
  useAnnouncementPreview: (_kind: string, _language: string, version: unknown) => ({
    data: version ? preview : undefined,
    isFetching: false,
    isError: false,
  }),
  useAnnouncementReach: () => mockReach,
  useTestAnnouncement: () => mockTest,
  useSendAnnouncement: () => mockSend,
  usePushSettings: () => ({ data: settings, isError: false, refetch: jest.fn() }),
  usePushMetrics: (days: number) => {
    mockMetricsDays(days);
    return {
      data: { days, from: "2026-10-15", types: [{ type: "EVENT_REMINDER", counts: { SENT: 5, BLOCKED_BY_PREFERENCES: 0,
        DEFERRED_QUIET_HOURS: 0, DROPPED_DAILY_CAP: 0, DROPPED_CATEGORY_CAP: 0, EXPIRED: 0, FAILED: 1, SWITCHED_OFF: 0,
        DROPPED_ENGAGEMENT_BUDGET: 0, DROPPED_FATIGUE: 0, DROPPED_HOLDOUT: 0 } }] },
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    };
  },
  usePushEngagement: (days: number) => {
    mockEngagementDays(days);
    return {
      data: {
        days,
        since: "2026-10-15",
        types: [
          { type: "TASTE_PICK", category: "ENGAGEMENT", sent: 20, opened: 5, openRate: 0.25, optedOut: 1, heldOut: 2, paused: false },
          { type: "WINBACK", category: "ENGAGEMENT", sent: 0, opened: 0, openRate: null, optedOut: 0, heldOut: 0, paused: true },
        ],
      },
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    };
  },
  useSetPushTypeEnabled: () => mockToggle,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockReach.data = { email: 3, push: 2, accounts: 4 };
  mockDetail.data = undefined;
  mockDetail.isError = false;
  mockDetail.error = undefined;
  mockTest.mutateAsync.mockResolvedValue({ email: 1, push: 1, accounts: 1 });
  mockSend.mutateAsync.mockResolvedValue({ id: "a2", recipients: 4 });
  mockToggle.mutateAsync.mockResolvedValue(settings);
});

const BODY = [
  "## La cosecha",
  "Te esperamos el **sábado** en [la bodega](https://vinnot.com/bodega).",
  "",
  "[[Ver eventos]](https://vinnot.com/events)",
].join("\n");

function writeAnnouncement(view: ReturnType<typeof render>, body = BODY) {
  fireEvent.changeText(view.getByLabelText("admin.notifications.composer.title"), "Llega la vendimia");
  fireEvent.changeText(view.getByLabelText("admin.notifications.composer.body"), body);
}

function openDialog(view: ReturnType<typeof render>) {
  return view.UNSAFE_getAllByType(Modal).find((modal) => modal.props.visible);
}

/** The draft of `writeAnnouncement` exactly as the composer hands it to the test and the send. */
const WRITTEN_DRAFT = {
  kind: "NEWS",
  versions: { es: { title: "Llega la vendimia", body: BODY }, en: { title: "", body: "" } },
  audience: { email: true, push: true, language: null, countryId: null, regionId: null, role: null },
  destination: "HOME",
};

it("is reserved to administrators", () => {
  const view = render(<AdminNotificationsScreen />);
  expect(mockRoles).toHaveBeenCalledWith(["ROLE_ADMIN"]);
  // The draft fields stay above the keyboard on both platforms.
  expect(view.UNSAFE_getByType(KeyboardAwareScrollView).props.keyboardDismissMode).toBe("on-drag");
});

// Hidden tabs stay mounted (the draft survives) but are out of reach: queries skip hidden elements.
it("splits the section into sending, history with metrics, and push settings", () => {
  const view = render(<AdminNotificationsScreen />);
  const tabs = view.getAllByRole("tab").map((tab) => tab.props.accessibilityLabel);
  expect(tabs).toEqual([
    "admin.notifications.tabs.compose",
    "admin.notifications.tabs.history",
    "admin.notifications.tabs.settings",
  ]);
  expect(view.getByLabelText("admin.notifications.composer.title")).toBeVisible();
  expect(view.queryByText("Mantenimiento programado")).toBeNull();
  expect(view.queryByText("admin.notifications.push.providerOn")).toBeNull();

  fireEvent.press(view.getByText("admin.notifications.tabs.history"));
  expect(view.getByText("Mantenimiento programado")).toBeVisible();
  expect(view.getByText("admin.notifications.metrics.heading")).toBeVisible();
  expect(view.getByText("admin.notifications.engagement.heading")).toBeVisible();
  expect(view.queryByLabelText("admin.notifications.composer.title")).toBeNull();
  expect(view.queryByText("admin.notifications.push.providerOn")).toBeNull();

  fireEvent.press(view.getByText("admin.notifications.tabs.settings"));
  expect(view.getByText("admin.notifications.push.providerOn")).toBeVisible();
  expect(view.queryByText("admin.notifications.metrics.heading")).toBeNull();
});

it("keeps the draft while the other tabs are open", () => {
  const view = render(<AdminNotificationsScreen />);
  writeAnnouncement(view);

  fireEvent.press(view.getByText("admin.notifications.tabs.history"));
  fireEvent.press(view.getByText("admin.notifications.tabs.compose"));

  expect(view.getByLabelText("admin.notifications.composer.title").props.value).toBe("Llega la vendimia");
});

it("keeps the actions blocked until the draft is written, then previews the push and the drawn email", () => {
  const view = render(<AdminNotificationsScreen />);
  expect(view.getByText("admin.notifications.draftErrors.CONTENT_REQUIRED")).toBeTruthy();
  expect(view.getByText("admin.notifications.preview.empty")).toBeTruthy();

  writeAnnouncement(view);

  expect(view.queryByText("admin.notifications.draftErrors.CONTENT_REQUIRED")).toBeNull();
  expect(view.getByText("Vendimia")).toBeTruthy();
  expect(view.getByText("Empieza el lunes")).toBeTruthy();
  expect(view.getByText("admin.notifications.audience.accounts:4")).toBeTruthy();

  const email = view.getByLabelText("admin.notifications.preview.emailRendered");
  expect(within(email).getByText("Hola Cris,")).toBeTruthy();
  expect(within(email).getByRole("header", { name: "La cosecha" })).toBeTruthy();
  expect(within(email).getByText("sábado")).toBeTruthy();
  expect(within(email).getByText("la bodega")).toBeTruthy();
  expect(within(email).getByText("Ver eventos")).toBeTruthy();
  expect(within(email).getByText("https://vinnot.com/events")).toBeTruthy();
  expect(within(email).getByText("admin.notifications.email.promotionalFooter")).toBeTruthy();
  expect(within(email).getByText("admin.notifications.email.unsubscribe")).toBeTruthy();
  // No raw markup reaches the drawn email.
  expect(within(email).queryByText(/\*\*|\[\[|\]\(|^## /)).toBeNull();
});

it("keeps the plain-text email behind its own toggle", () => {
  const view = render(<AdminNotificationsScreen />);
  writeAnnouncement(view);
  expect(view.queryByText(preview.text)).toBeNull();

  fireEvent.press(view.getByText("admin.notifications.preview.showPlainText"));
  expect(view.getByText(preview.text)).toBeTruthy();
  expect(view.getByText("admin.notifications.preview.hidePlainText")).toBeTruthy();

  fireEvent.press(view.getByText("admin.notifications.preview.hidePlainText"));
  expect(view.queryByText(preview.text)).toBeNull();
});

it("draws a service notice with the account footer and no unsubscribe link", () => {
  const view = render(<AdminNotificationsScreen />);
  fireEvent.press(view.getAllByRole("radio")[1]!);
  writeAnnouncement(view);

  const email = view.getByLabelText("admin.notifications.preview.emailRendered");
  expect(within(email).getByText("admin.notifications.email.serviceFooter")).toBeTruthy();
  expect(within(email).queryByText("admin.notifications.email.unsubscribe")).toBeNull();
});

it("names the channels plainly and explains why the send is off when nobody is reached", () => {
  mockReach.data = { email: 0, push: 0, accounts: 0 };
  const view = render(<AdminNotificationsScreen />);
  expect(view.getByText("admin.notifications.audience.channels")).toBeTruthy();
  expect(view.getByText("admin.notifications.audience.email")).toBeTruthy();
  expect(view.getByText("admin.notifications.audience.push")).toBeTruthy();

  writeAnnouncement(view);

  expect(view.getByText("admin.notifications.composer.sendBlocked.noReach")).toBeTruthy();
  expect(view.getByRole("button", { name: "admin.notifications.composer.send" })).toBeDisabled();
  expect(view.getByRole("button", { name: "admin.notifications.composer.sendTest" })).toBeEnabled();
});

it("sends a test with the draft unchanged and explains a test the administrator cannot receive", async () => {
  mockTest.mutateAsync.mockRejectedValueOnce({ message: "x", code: "ANNOUNCEMENT_TEST_UNREACHABLE" });
  const view = render(<AdminNotificationsScreen />);
  writeAnnouncement(view);

  await act(async () => {
    fireEvent.press(view.getByText("admin.notifications.composer.sendTest"));
  });
  expect(mockShowError).toHaveBeenCalledWith("admin.notifications.errors.ANNOUNCEMENT_TEST_UNREACHABLE");

  await act(async () => {
    fireEvent.press(view.getByText("admin.notifications.composer.sendTest"));
  });
  expect(mockTest.mutateAsync).toHaveBeenLastCalledWith(WRITTEN_DRAFT);
  expect(mockShowSuccess).toHaveBeenCalledWith("admin.notifications.composer.testSentBoth");
});

it("asks for confirmation with the email and push split before the final send, then sends the draft unchanged", async () => {
  const view = render(<AdminNotificationsScreen />);
  writeAnnouncement(view);

  fireEvent.press(view.getByText("admin.notifications.composer.send"));
  expect(mockSend.mutateAsync).not.toHaveBeenCalled();
  const dialog = openDialog(view)!;
  expect(within(dialog).getByText("admin.notifications.confirm.message:4,admin.notifications.kinds.NEWS.title")).toBeTruthy();
  expect(
    within(dialog).getByText("admin.notifications.audience.byEmail:3 · admin.notifications.audience.byPush:2"),
  ).toBeTruthy();
  expect(within(dialog).getByText("admin.notifications.confirm.overlap")).toBeTruthy();

  await act(async () => {
    fireEvent.press(within(dialog).getByText("admin.notifications.confirm.send"));
  });

  expect(mockSend.mutateAsync).toHaveBeenCalledWith({ draft: WRITTEN_DRAFT, requestId: "request-1" });
  expect(mockShowSuccess).toHaveBeenCalledWith("admin.notifications.composer.sent:4");
  expect(openDialog(view)).toBeUndefined();
});

it("inserts the toolbar format into the body", () => {
  const view = render(<AdminNotificationsScreen />);
  fireEvent.press(view.getByLabelText("admin.notifications.composer.formats.button"));
  expect(view.getByLabelText("admin.notifications.composer.body").props.value).toBe(
    "[[admin.notifications.composer.formatFallback.button]](https://)",
  );
});

it("lists the send history with its status and its delivery counts per channel", () => {
  const view = render(<AdminNotificationsScreen />);
  fireEvent.press(view.getByText("admin.notifications.tabs.history"));
  expect(view.getByText("Mantenimiento programado")).toBeTruthy();
  expect(view.getByText("admin.notifications.history.sending")).toBeTruthy();
  expect(view.getByText("admin.notifications.history.test")).toBeTruthy();
  expect(view.getByText("admin.notifications.history.emailSummary:2,1")).toBeTruthy();
  expect(view.getByText("admin.notifications.history.pushSummary:4,1,3")).toBeTruthy();
});

it("opens one announcement with every count explained, and says when it no longer exists", () => {
  const view = render(<AdminNotificationsScreen />);
  fireEvent.press(view.getByText("admin.notifications.tabs.history"));
  fireEvent.press(view.getByLabelText("admin.notifications.history.open:Mantenimiento programado"));

  expect(mockDetailIds).toHaveBeenLastCalledWith("a1");
  let sheet = openDialog(view)!;
  for (const key of ["emailsSent", "emailsFailed", "pushesSent", "pushesFailed", "pushesOpened"]) {
    expect(within(sheet).getByText(`admin.notifications.stats.labels.${key}`)).toBeTruthy();
    expect(within(sheet).getByText(`admin.notifications.stats.hints.${key}`)).toBeTruthy();
  }
  expect(within(sheet).getByText("admin.notifications.stats.openRate:25")).toBeTruthy();
  expect(within(sheet).getByText("admin.notifications.stats.testNote")).toBeTruthy();

  mockDetail.isError = true;
  mockDetail.error = { message: "x", status: 404, code: "NOT_FOUND" };
  fireEvent.press(within(sheet).getAllByLabelText("common.close")[0]!);
  fireEvent.press(view.getByLabelText("admin.notifications.history.open:Mantenimiento programado"));
  sheet = openDialog(view)!;
  expect(within(sheet).getByText("admin.notifications.stats.notFound")).toBeTruthy();
});

it("shows every push per type and the engagement pushes for one shared window", () => {
  const view = render(<AdminNotificationsScreen />);
  fireEvent.press(view.getByText("admin.notifications.tabs.history"));
  expect(view.getByText("admin.notifications.metrics.help")).toBeTruthy();
  expect(view.getByText("admin.notifications.pushTypes.TASTE_PICK")).toBeTruthy();
  expect(view.getByText("25%")).toBeTruthy();
  expect(view.getByText("admin.notifications.engagement.paused")).toBeTruthy();
  expect(view.getByText("admin.notifications.engagement.active")).toBeTruthy();

  fireEvent.press(view.getByText("admin.notifications.metrics.days:30"));
  expect(mockMetricsDays).toHaveBeenLastCalledWith(30);
  expect(mockEngagementDays).toHaveBeenLastCalledWith(30);
});

it("switches push types in the settings tab, confirming a transactional one", async () => {
  const view = render(<AdminNotificationsScreen />);
  fireEvent.press(view.getByText("admin.notifications.tabs.settings"));
  expect(view.getByText("admin.notifications.push.providerOn")).toBeTruthy();

  await act(async () => {
    fireEvent(view.getByLabelText("admin.notifications.pushTypes.EVENT_NEARBY"), "valueChange", true);
  });
  expect(mockToggle.mutateAsync).toHaveBeenCalledWith({ type: "EVENT_NEARBY", enabled: true });

  fireEvent(view.getByLabelText("admin.notifications.pushTypes.EVENT_REMINDER"), "valueChange", false);
  const dialog = openDialog(view)!;
  await act(async () => {
    fireEvent.press(within(dialog).getByText("admin.notifications.push.confirmOff"));
  });
  expect(mockToggle.mutateAsync).toHaveBeenLastCalledWith({ type: "EVENT_REMINDER", enabled: false });
});

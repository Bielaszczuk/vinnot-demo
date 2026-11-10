import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import {
  LEGAL_LINES,
  type AdminContentPillar,
  type SocialPost,
  type SocialPostCopy,
} from "@/domain/admin/socialPost";
import type { SocialAccount } from "@/domain/admin/socialAccount";
import { AdminSocialPostsScreen } from "./AdminSocialPostsScreen";

const mockRoles = jest.fn();
const mockListArgs = jest.fn();
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
const mockSwitchPillar = mutation();
const mockReschedule = mutation();
const mockPublishNow = mutation();
const mockState: {
  posts: SocialPost[];
  detail: SocialPost | undefined;
  listError: boolean;
  pillars: AdminContentPillar[];
  accounts: SocialAccount[];
} = {
  posts: [],
  detail: undefined,
  listError: false,
  pillars: [],
  accounts: [],
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (!options) return key;
      const values = Object.entries(options)
        .filter(([name]) => name !== "defaultValue")
        .map(([, value]) => String(value));
      return values.length > 0 ? `${key}:${values.join(",")}` : key;
    },
    i18n: { language: "es-AR" },
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
jest.mock("@/presentation/hooks/useExternalLink", () => ({ useExternalLink: () => mockOpenLink }));
jest.mock("@/application/services/adminSocialPosts.service", () => ({
  ...jest.requireActual("@/application/services/adminSocialPosts.service"),
  adminSocialPostsService: { shareSlide: (...args: unknown[]) => mockShareSlide(...args) },
}));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminSocialPosts: (...args: unknown[]) => {
    mockListArgs(...args);
    return {
      data: mockState.listError ? undefined : { items: mockState.posts, totalItems: mockState.posts.length },
      isLoading: false,
      isError: mockState.listError,
      refetch: jest.fn(),
    };
  },
  useAdminSocialPost: (id: string | null) => ({
    data: id ? mockState.detail : undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useAdminWineDays: (year: number, enabled = true) => ({
    data:
      enabled && year === new Date().getFullYear()
        ? [
            {
              code: "TODAY",
              nameEs: "Día de hoy",
              nameEn: "Today day",
              kind: "GRAPE",
              priority: 2,
              countryCode: "AR",
              date: new Date().toISOString().slice(0, 10),
            },
          ]
        : undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useApproveSocialPost: () => mockApprove,
  useRejectSocialPost: () => mockReject,
  useUpdateSocialPostCopy: () => mockUpdate,
  useRegenerateSocialPost: () => mockRegenerate,
  useNewSocialPostIllustration: () => mockIllustration,
  usePlanSocialPosts: () => mockPlan,
  useRetrySocialPublication: () => mockRetry,
  useRescheduleSocialPost: () => mockReschedule,
  usePublishSocialPostNow: () => mockPublishNow,
  useAdminSocialPillars: () => ({ data: mockState.pillars, isLoading: false, isError: false, refetch: jest.fn() }),
  useSwitchSocialPillar: () => mockSwitchPillar,
}));
jest.mock("@/presentation/hooks/queries/admin/useAdminSocialAccounts", () => ({
  useAdminSocialAccounts: () => ({ data: mockState.accounts, isLoading: false, isError: false, refetch: jest.fn() }),
}));
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: (props: { mode: string }) => <View testID={`schedule-picker-${props.mode}`} {...props} />,
  };
});
jest.mock("@/presentation/components/ui/TextField", () => {
  const { Text, TextInput, View } = jest.requireActual("react-native");
  return {
    TextField: ({ label, error, ...props }: { label?: string; error?: string }) => (
      <View>
        <TextInput {...props} accessibilityLabel={label} />
        {error ? <Text>{error}</Text> : null}
      </View>
    ),
  };
});
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: React.ReactNode }) => children,
    BottomSheetStickyFooter: ({ children }: { children: React.ReactNode }) => children,
    BottomSheetModal: mockReact.forwardRef(
      (props: { children: React.ReactNode; footerComponent?: (p: object) => React.ReactNode }, ref) => {
        const [open, setOpen] = mockReact.useState(false);
        mockReact.useImperativeHandle(ref, () => ({ present: () => setOpen(true), dismiss: () => setOpen(false) }));
        return open ? (
          <>
            {props.children}
            {props.footerComponent?.({})}
          </>
        ) : null;
      },
    ),
  };
});

const spanish: SocialPostCopy = {
  hook: "Día del Malbec",
  slides: [
    { title: "Uno", body: "Cuerpo uno" },
    { title: "Dos", body: "Cuerpo dos" },
    { title: "Tres", body: "Cuerpo tres" },
  ],
  caption: `Brindemos.\n\n${LEGAL_LINES.es}`,
  hashtags: ["#vinnot", "#malbec", "#vino", "#argentina", "#wine"],
  altText: "Copa de Malbec",
  cta: "Seguinos",
  illustration: null,
};

function makePost(overrides: Partial<SocialPost> = {}): SocialPost {
  return {
    id: "p1",
    status: "PENDING_APPROVAL",
    scheduledFor: "2026-11-07T12:00:00Z",
    pillar: { code: "GRAPES", nameEs: "Uvas", nameEn: "Grapes" },
    wineDay: { code: "MALBEC", nameEs: "Día del Malbec", nameEn: "Malbec Day", date: "2027-04-17" },
    copies: { es: spanish, en: null },
    generation: {
      provider: "openai",
      model: "gpt",
      mock: true,
      attempts: 1,
      generatedAt: "2026-11-01T00:00:00Z",
      factCheck: "FLAGGED",
      issues: ["Fecha dudosa"],
      error: null,
    },
    review: {
      reviewedBy: "admin@vinnot.app",
      reviewedAt: "2026-11-02T00:00:00Z",
      reason: "Tono",
      editedBy: null,
      automatic: false,
    },
    media: {
      status: "READY",
      source: "FALLBACK",
      error: null,
      illustrationReason: "AI_IMAGE_FAILED",
      heroUrl: null,
      slides: { es: { instagram: ["https://cdn/ig-1.jpg", "https://cdn/ig-2.jpg"], tiktok: ["https://cdn/tt-1.jpg"], renderedFor: "h" }, en: null },
      updatedAt: null,
    },
    publishing: null,
    publications: [],
    canReschedule: false,
    canPublishNow: false,
    networkSchedule: [],
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState.posts = [makePost()];
  mockState.detail = makePost();
  mockState.listError = false;
  mockState.pillars = [];
  mockState.accounts = [];
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
    fn.mutateAsync.mockResolvedValue(makePost());
  }
});

it("is for administrators and lists the pending queue with the hook in the selected language", () => {
  render(<AdminSocialPostsScreen />);

  expect(mockRoles).toHaveBeenCalledWith(["ROLE_ADMIN"]);
  expect(mockListArgs).toHaveBeenLastCalledWith(0, 20, "PENDING_APPROVAL", 0);
  const row = screen.getByTestId("social-post-row-p1");
  expect(within(row).getByText("Día del Malbec")).toBeTruthy();
  expect(within(row).getByText(/Uvas/)).toBeTruthy();

  fireEvent.press(screen.getByRole("tab", { name: "admin.socialPosts.languages.en" }));
  expect(within(screen.getByTestId("social-post-row-p1")).getByText("admin.socialPosts.queue.hookPending")).toBeTruthy();

  fireEvent.press(screen.getByRole("radio", { name: "admin.socialPosts.status.APPROVED" }));
  expect(mockListArgs).toHaveBeenLastCalledWith(0, 20, "APPROVED", 0);
});

it("shows an empty queue and a failed one", () => {
  mockState.posts = [];
  const view = render(<AdminSocialPostsScreen />);
  expect(screen.getByText("admin.socialPosts.queue.empty")).toBeTruthy();

  mockState.listError = true;
  view.rerender(<AdminSocialPostsScreen />);
  expect(screen.getByText("admin.feedback.loadError")).toBeTruthy();
});

it("opens a post with its slides per format, the copy, generation and review details, and approves it", async () => {
  render(<AdminSocialPostsScreen />);
  fireEvent.press(screen.getByTestId("social-post-row-p1"));

  expect(screen.getAllByTestId(/^social-post-slide-/)).toHaveLength(2);
  expect(screen.getByText("admin.socialPosts.media.source.FALLBACK")).toBeTruthy();
  expect(screen.getByText("admin.socialPosts.media.fallbackReason.AI_IMAGE_FAILED")).toBeTruthy();
  expect(screen.getByText(spanish.caption)).toBeTruthy();
  expect(screen.getByText("admin.socialPosts.detail.legalLine")).toBeTruthy();
  expect(screen.getByText("#malbec")).toBeTruthy();
  expect(screen.getByText("Copa de Malbec")).toBeTruthy();
  expect(screen.getByText("admin.socialPosts.generation.factCheck.FLAGGED")).toBeTruthy();
  expect(screen.getByText("Fecha dudosa")).toBeTruthy();
  expect(screen.getByText("admin.socialPosts.detail.mock")).toBeTruthy();
  expect(screen.getByText(/admin.socialPosts.review.reason:Tono/)).toBeTruthy();
  expect(screen.getByText(/admin.socialPosts.review.reviewedBy:admin@vinnot.app/)).toBeTruthy();
  expect(screen.queryByText("admin.socialPosts.review.automatic")).toBeNull();
  expect(screen.queryByTestId("social-post-publications")).toBeNull();

  fireEvent.press(screen.getByRole("button", { name: "admin.socialPosts.media.formats.TIKTOK" }));
  expect(screen.getAllByTestId(/^social-post-slide-/)).toHaveLength(1);

  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "admin.socialPosts.media.open:1" }));
    fireEvent.press(screen.getByRole("button", { name: "admin.socialPosts.media.share:1" }));
  });
  expect(mockOpenLink).toHaveBeenCalledWith("https://cdn/tt-1.jpg");
  expect(mockShareSlide).toHaveBeenCalledWith("https://cdn/tt-1.jpg", "admin.socialPosts.media.shareTitle:1,1");

  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "admin.socialPosts.actions.approve" }));
  });
  expect(mockApprove.mutateAsync).toHaveBeenCalledWith("p1");
  expect(mockShowSuccess).toHaveBeenCalledWith("admin.socialPosts.actions.approved");
});

it("shows a missing language as pending and offers to regenerate an approved post from there", async () => {
  mockState.posts = [makePost({ status: "APPROVED" })];
  mockState.detail = makePost({ status: "APPROVED" });
  render(<AdminSocialPostsScreen />);
  fireEvent.press(screen.getByTestId("social-post-row-p1"));

  fireEvent.press(screen.getAllByRole("tab", { name: "admin.socialPosts.languages.en" }).at(-1)!);

  const notice = screen.getByTestId("social-post-language-pending");
  expect(within(notice).getByText("admin.socialPosts.languagePendingHelp")).toBeTruthy();
  expect(screen.queryAllByTestId(/^social-post-slide-/)).toHaveLength(0);
  expect(screen.queryByRole("button", { name: "admin.socialPosts.actions.edit" })).toBeNull();
  expect(screen.getAllByRole("button", { name: "admin.socialPosts.actions.regenerate" })).toHaveLength(1);
  await act(async () => {
    fireEvent.press(within(notice).getByRole("button", { name: "admin.socialPosts.actions.regenerate" }));
  });
  expect(mockRegenerate.mutateAsync).toHaveBeenCalledWith("p1");
});

it("shows the rendering and failed states of the slides and asks for a new illustration", async () => {
  mockState.detail = makePost({
    media: { ...makePost().media!, status: "FAILED", error: "TEXT_DOES_NOT_FIT", source: "AI", slides: { es: null, en: null } },
  });
  const view = render(<AdminSocialPostsScreen />);
  fireEvent.press(screen.getByTestId("social-post-row-p1"));

  expect(screen.getByText("admin.socialPosts.media.errors.TEXT_DOES_NOT_FIT")).toBeTruthy();
  expect(screen.getByText("admin.socialPosts.detail.previewHelp")).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "admin.socialPosts.media.newIllustration" }));
  });
  expect(mockIllustration.mutateAsync).toHaveBeenCalledWith("p1");

  mockState.detail = makePost({ media: { ...makePost().media!, status: "PENDING" } });
  view.rerender(<AdminSocialPostsScreen />);
  expect(screen.getByText("admin.socialPosts.media.pending")).toBeTruthy();
});

it("rejects with a one-tap reason", async () => {
  render(<AdminSocialPostsScreen />);
  fireEvent.press(screen.getByTestId("social-post-row-p1"));

  fireEvent.press(screen.getByRole("button", { name: "admin.socialPosts.actions.reject" }));
  fireEvent.press(screen.getByRole("radio", { name: "admin.socialPosts.rejectReasons.WEAK_HOOK" }));
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "admin.socialPosts.actions.confirmReject" }));
  });

  expect(mockReject.mutateAsync).toHaveBeenCalledWith({ id: "p1", reason: "admin.socialPosts.rejectReasons.WEAK_HOOK" });
});

it("edits the copy of the selected language in a sheet", async () => {
  render(<AdminSocialPostsScreen />);
  fireEvent.press(screen.getByTestId("social-post-row-p1"));

  fireEvent.press(screen.getByRole("button", { name: "admin.socialPosts.actions.edit" }));
  fireEvent.changeText(screen.getByLabelText("admin.socialPosts.editor.hook"), "Nuevo gancho");
  await act(async () => {
    fireEvent.press(screen.getByText("admin.socialPosts.editor.save"));
  });

  expect(mockUpdate.mutateAsync).toHaveBeenCalledWith({
    id: "p1",
    language: "es",
    draft: expect.objectContaining({ hook: "Nuevo gancho" }),
  });
});

it("plans now and tells that the AI is writing the copy", async () => {
  mockPlan.mutateAsync.mockResolvedValue({ created: 2, from: "2026-11-04", to: "2026-11-30" });
  render(<AdminSocialPostsScreen />);

  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "admin.socialPosts.planNow" }));
  });

  expect(screen.getByText("admin.socialPosts.writingCopy")).toBeTruthy();
  expect(mockListArgs).toHaveBeenLastCalledWith(0, 20, "PENDING_APPROVAL", 10_000);
});

it("lists the wine days of this month and the next", () => {
  render(<AdminSocialPostsScreen />);

  expect(screen.getByText("admin.socialPosts.wineDays.heading")).toBeTruthy();
  expect(screen.getByText("Día de hoy")).toBeTruthy();
});

it("shows each network's publication, opens a permalink and retries a failed network", async () => {
  mockState.detail = makePost({
    status: "FAILED",
    publishing: { startedAt: "2026-11-07T12:00:00Z", finishedAt: "2026-11-07T12:05:00Z", error: "MEDIA_REJECTED" },
    publications: [
      {
        network: "INSTAGRAM",
        status: "PUBLISHED",
        externalId: "ig-1",
        permalink: "https://www.instagram.com/p/1",
        attempts: 1,
        error: null,
        publishedAt: "2026-11-07T12:01:00Z",
        metrics: { views: 1200, reach: null, likes: 30, comments: null, saves: null, shares: null, follows: null },
      },
      {
        network: "THREADS",
        status: "FAILED",
        externalId: null,
        permalink: null,
        attempts: 3,
        error: "MEDIA_REJECTED",
        publishedAt: null,
        metrics: null,
      },
    ],
  });
  render(<AdminSocialPostsScreen />);
  fireEvent.press(screen.getByTestId("social-post-row-p1"));

  const section = screen.getByTestId("social-post-publications");
  expect(
    within(section).getByText(
      "admin.socialPosts.publications.postError:admin.socialPosts.publications.errors.MEDIA_REJECTED",
    ),
  ).toBeTruthy();
  const instagram = screen.getByTestId("social-publication-INSTAGRAM");
  expect(within(instagram).getByText("admin.socialPosts.publications.status.PUBLISHED")).toBeTruthy();
  expect(within(instagram).getByText(`admin.socialPosts.publications.metrics.views ${(1200).toLocaleString("es-AR")}`)).toBeTruthy();
  expect(within(instagram).queryByRole("button", { name: /retryLabel/ })).toBeNull();

  await act(async () => {
    fireEvent.press(
      screen.getByRole("button", { name: "admin.socialPosts.publications.openLabel:admin.socialPosts.networks.INSTAGRAM" }),
    );
  });
  expect(mockOpenLink).toHaveBeenCalledWith("https://www.instagram.com/p/1");

  await act(async () => {
    fireEvent.press(
      screen.getByRole("button", { name: "admin.socialPosts.publications.retryLabel:admin.socialPosts.networks.THREADS" }),
    );
  });
  expect(mockRetry.mutateAsync).toHaveBeenCalledWith({ id: "p1", network: "THREADS" });
  expect(mockShowSuccess).toHaveBeenCalledWith("admin.socialPosts.publications.retried");
});

it("shows an automatic approval instead of a reviewer", () => {
  mockState.detail = makePost({
    status: "APPROVED",
    review: {
      reviewedBy: null,
      reviewedAt: "2026-11-06T12:00:00Z",
      reason: "AUTO_APPROVED",
      editedBy: null,
      automatic: true,
    },
  });
  render(<AdminSocialPostsScreen />);
  fireEvent.press(screen.getByTestId("social-post-row-p1"));

  expect(screen.getByText("admin.socialPosts.review.automatic")).toBeTruthy();
  expect(screen.queryByText(/admin.socialPosts.review.reviewedBy/)).toBeNull();
  expect(screen.queryByText(/AUTO_APPROVED/)).toBeNull();
});

it("lists the content pillars with their switches and the network connections read-only", async () => {
  mockState.pillars = [
    {
      code: "TERROIR",
      nameEs: "Terruño",
      nameEn: "Terroir",
      weight: 3,
      active: true,
      autoApprove: false,
      performance: { measuredPosts: 4, views: 1200, interactions: 85, factor: 1.25 },
    },
  ];
  mockState.accounts = [
    {
      network: "THREADS",
      mode: "OAUTH",
      configured: true,
      connected: false,
      accountId: "1",
      displayName: "vinnot",
      status: "REFRESH_FAILED",
      expiresAt: null,
      lastError: "TOKEN_INVALID",
    },
  ];
  mockSwitchPillar.mutateAsync.mockResolvedValue(mockState.pillars[0]);
  render(<AdminSocialPostsScreen />);

  const pillar = screen.getByTestId("social-pillar-TERROIR");
  expect(within(pillar).getByText("Terruño")).toBeTruthy();
  expect(within(pillar).getByText("admin.socialPosts.pillars.factor:×1.25")).toBeTruthy();
  await act(async () => {
    fireEvent.press(within(pillar).getByRole("switch", { name: "admin.socialPosts.pillars.autoApprove" }));
  });
  expect(mockSwitchPillar.mutateAsync).toHaveBeenCalledWith({ code: "TERROIR", which: "autoApprove", enabled: true });

  expect(screen.getByText("admin.socialPosts.accounts.webHint")).toBeTruthy();
  const threads = screen.getByTestId("social-account-THREADS");
  expect(within(threads).getByText("admin.socialPosts.accounts.state.NEEDS_RECONNECT")).toBeTruthy();
  expect(within(threads).queryByRole("button")).toBeNull();
});

it("shows each network's publishing time in Argentina time", () => {
  mockState.detail = makePost({
    networkSchedule: [
      { network: "INSTAGRAM", publishAt: "2026-11-11T15:30:00Z" },
      { network: "TIKTOK", publishAt: "2026-11-11T22:30:00Z" },
    ],
  });
  render(<AdminSocialPostsScreen />);
  fireEvent.press(screen.getByTestId("social-post-row-p1"));

  const times = screen.getByTestId("social-post-network-times");
  expect(within(times).getByText("admin.socialPosts.schedule.networkTimes")).toBeTruthy();
  expect(within(times).getByText("admin.socialPosts.schedule.networkTime:admin.socialPosts.networks.INSTAGRAM,12:30")).toBeTruthy();
  expect(within(times).getByText("admin.socialPosts.schedule.networkTime:admin.socialPosts.networks.TIKTOK,19:30")).toBeTruthy();
});

it("offers neither moving nor publishing now when the backend allows neither", () => {
  render(<AdminSocialPostsScreen />);
  fireEvent.press(screen.getByTestId("social-post-row-p1"));

  expect(screen.queryByRole("button", { name: "admin.socialPosts.schedule.change" })).toBeNull();
  expect(screen.queryByRole("button", { name: "admin.socialPosts.publishNow.action" })).toBeNull();
  expect(screen.queryByTestId("social-post-network-times")).toBeNull();
  expect(screen.getByRole("button", { name: "admin.socialPosts.actions.approve" })).toBeTruthy();
});

it("moves a post to another date and time picked in Argentina time, warning that its copy names the wine day", async () => {
  mockState.detail = makePost({ status: "DRAFT", canReschedule: true });
  render(<AdminSocialPostsScreen />);
  fireEvent.press(screen.getByTestId("social-post-row-p1"));

  fireEvent.press(screen.getByRole("button", { name: "admin.socialPosts.schedule.change" }));
  const form = screen.getByTestId("social-post-reschedule");
  expect(within(form).getByText("admin.socialPosts.schedule.argentinaTime")).toBeTruthy();
  expect(within(form).getByText("admin.socialPosts.schedule.wineDayWarning:Día del Malbec")).toBeTruthy();
  const datePicker = within(form).getByTestId("schedule-picker-date");
  expect(datePicker.props.timeZoneName).toBe("America/Argentina/Buenos_Aires");
  expect(datePicker.props.value.toISOString()).toBe("2026-11-07T12:00:00.000Z");

  fireEvent(datePicker, "change", { type: "set" }, new Date("2026-11-10T12:00:00Z"));
  fireEvent(within(form).getByTestId("schedule-picker-time"), "change", { type: "set" }, new Date("2026-11-07T22:30:00Z"));
  await act(async () => {
    fireEvent.press(within(form).getByRole("button", { name: "admin.socialPosts.schedule.confirm" }));
  });

  expect(mockReschedule.mutateAsync).toHaveBeenCalledWith({ id: "p1", scheduledFor: "2026-11-10T22:30:00.000Z" });
  expect(mockShowSuccess).toHaveBeenCalledWith("admin.socialPosts.schedule.saved");
  expect(screen.queryByTestId("social-post-reschedule")).toBeNull();
});

it("does not warn about a wine day when moving a pillar post, and cancels the move", () => {
  mockState.detail = makePost({ wineDay: null, canReschedule: true });
  render(<AdminSocialPostsScreen />);
  fireEvent.press(screen.getByTestId("social-post-row-p1"));

  fireEvent.press(screen.getByRole("button", { name: "admin.socialPosts.schedule.change" }));
  expect(screen.queryByText(/wineDayWarning/)).toBeNull();
  fireEvent.press(within(screen.getByTestId("social-post-reschedule")).getByRole("button", { name: "common.cancel" }));

  expect(screen.queryByTestId("social-post-reschedule")).toBeNull();
  expect(mockReschedule.mutateAsync).not.toHaveBeenCalled();
});

it("asks for confirmation before publishing an approved post now", async () => {
  mockState.detail = makePost({ status: "APPROVED", canPublishNow: true });
  render(<AdminSocialPostsScreen />);
  fireEvent.press(screen.getByTestId("social-post-row-p1"));

  fireEvent.press(screen.getByRole("button", { name: "admin.socialPosts.publishNow.action" }));
  const confirm = screen.getByTestId("social-post-publish-now");
  expect(within(confirm).getByText("admin.socialPosts.publishNow.confirmText")).toBeTruthy();
  expect(mockPublishNow.mutateAsync).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.press(within(confirm).getByRole("button", { name: "admin.socialPosts.publishNow.confirm" }));
  });

  expect(mockPublishNow.mutateAsync).toHaveBeenCalledWith("p1");
  expect(mockShowSuccess).toHaveBeenCalledWith("admin.socialPosts.publishNow.started");
  expect(screen.queryByTestId("social-post-publish-now")).toBeNull();
});

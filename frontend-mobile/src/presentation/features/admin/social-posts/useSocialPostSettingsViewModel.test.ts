import { act, renderHook } from "@testing-library/react-native";
import type { AdminContentPillar } from "@/domain/admin/socialPost";
import type { SocialAccount } from "@/domain/admin/socialAccount";
import { useSocialPostSettingsViewModel } from "./useSocialPostSettingsViewModel";

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockSwitch = { mutateAsync: jest.fn(), isPending: false };
const mockRefetchPillars = jest.fn();
const mockRefetchAccounts = jest.fn();
const mockPillars = { data: undefined as AdminContentPillar[] | undefined, isLoading: false, isError: false };
const mockAccounts = { data: undefined as SocialAccount[] | undefined, isLoading: false, isError: false };
const mockLanguage = { value: "es-AR" };

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
    i18n: { language: mockLanguage.value },
  }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminSocialPillars: () => ({ ...mockPillars, refetch: mockRefetchPillars }),
  useSwitchSocialPillar: () => mockSwitch,
}));
jest.mock("@/presentation/hooks/queries/admin/useAdminSocialAccounts", () => ({
  useAdminSocialAccounts: () => ({ ...mockAccounts, refetch: mockRefetchAccounts }),
}));

const terroir: AdminContentPillar = {
  code: "TERROIR",
  nameEs: "Terruño",
  nameEn: "Terroir",
  weight: 3,
  active: true,
  autoApprove: false,
  performance: { measuredPosts: 4, views: 1200, interactions: 85, factor: 1.25 },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockLanguage.value = "es-AR";
  mockPillars.data = [terroir];
  mockPillars.isLoading = false;
  mockPillars.isError = false;
  mockAccounts.data = undefined;
  mockAccounts.isLoading = true;
  mockAccounts.isError = true;
  mockSwitch.mutateAsync.mockResolvedValue(terroir);
});

it("exposes the pillars and the accounts with their loading and error states, and refetches them", () => {
  const { result } = renderHook(() => useSocialPostSettingsViewModel());

  expect(result.current.language).toBe("es");
  expect(result.current.pillars).toEqual([terroir]);
  expect(result.current.pillarsLoading).toBe(false);
  expect(result.current.pillarsError).toBe(false);
  expect(result.current.accounts).toEqual([]);
  expect(result.current.accountsLoading).toBe(true);
  expect(result.current.accountsError).toBe(true);
  expect(result.current.switchingPillar).toBeNull();

  result.current.refetchPillars();
  result.current.refetchAccounts();
  expect(mockRefetchPillars).toHaveBeenCalled();
  expect(mockRefetchAccounts).toHaveBeenCalled();
});

it("switches a pillar off and on, naming it in the app language", async () => {
  mockLanguage.value = "en-US";
  const { result } = renderHook(() => useSocialPostSettingsViewModel());

  await act(async () => {
    await result.current.togglePillar(terroir, "active");
  });
  await act(async () => {
    await result.current.togglePillar(terroir, "autoApprove");
  });

  expect(mockSwitch.mutateAsync.mock.calls).toEqual([
    [{ code: "TERROIR", which: "active", enabled: false }],
    [{ code: "TERROIR", which: "autoApprove", enabled: true }],
  ]);
  expect(mockShowSuccess.mock.calls).toEqual([
    [`admin.socialPosts.pillars.switched.active.off:${JSON.stringify({ name: "Terroir" })}`],
    [`admin.socialPosts.pillars.switched.autoApprove.on:${JSON.stringify({ name: "Terroir" })}`],
  ]);
  expect(result.current.switchingPillar).toBeNull();
});

it("leaves the auto-approval of an inactive pillar untouched", async () => {
  const { result } = renderHook(() => useSocialPostSettingsViewModel());

  await act(async () => {
    await result.current.togglePillar({ ...terroir, active: false }, "autoApprove");
  });

  expect(mockSwitch.mutateAsync).not.toHaveBeenCalled();
});

it("explains the refusal to switch off the last active pillar, and any other failure", async () => {
  const { result } = renderHook(() => useSocialPostSettingsViewModel());
  mockSwitch.mutateAsync
    .mockRejectedValueOnce({ status: 409, code: "LAST_ROTATING_PILLAR", message: "last" })
    .mockRejectedValueOnce({ status: 500, message: "boom" });

  await act(async () => {
    await result.current.togglePillar(terroir, "active");
  });
  await act(async () => {
    await result.current.togglePillar(terroir, "active");
  });

  expect(mockShowError.mock.calls).toEqual([
    ["admin.socialPosts.pillars.lastRotating"],
    ["admin.socialPosts.pillars.switchError"],
  ]);
  expect(mockShowSuccess).not.toHaveBeenCalled();
  expect(result.current.switchingPillar).toBeNull();
});

it("marks the pillar being switched until the backend answers", async () => {
  let resolve: (value: AdminContentPillar) => void = () => undefined;
  mockSwitch.mutateAsync.mockReturnValueOnce(new Promise<AdminContentPillar>((done) => (resolve = done)));
  const { result } = renderHook(() => useSocialPostSettingsViewModel());

  let pending: Promise<void> = Promise.resolve();
  act(() => {
    pending = result.current.togglePillar(terroir, "active");
  });
  expect(result.current.switchingPillar).toBe("TERROIR");

  await act(async () => {
    resolve(terroir);
    await pending;
  });
  expect(result.current.switchingPillar).toBeNull();
});

it("formats counts and dates in the app language", () => {
  const { result } = renderHook(() => useSocialPostSettingsViewModel());
  expect(result.current.formatNumber(1200)).toBe((1200).toLocaleString("es-AR"));
  expect(result.current.formatDate("2026-11-05T12:00:00Z")).toBe(
    new Date("2026-11-05T12:00:00Z").toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" }),
  );
});

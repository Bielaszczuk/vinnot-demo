import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Alert } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import ProfileRoute from "../../../../../app/(app)/(tabs)/profile";

type MutateOptions = { onSuccess?: () => void; onError?: (error: unknown) => void };
type Action = { key: string; label: string; onPress: () => void };

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockLogout = jest.fn(async () => undefined);
const mockClearSession = jest.fn(async () => undefined);
const mockForgotPassword = jest.fn(async (_email: string) => undefined);
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockShowInfo = jest.fn();
const mockRefreshUser = jest.fn(async () => undefined);
const identity = (key: string) => key;
let mockTranslate = identity;
const mockEmailMutate = jest.fn((_email: string, _options: MutateOptions) => undefined);
const mockDeactivateMutate = jest.fn((_vars: undefined, _options: MutateOptions) => undefined);
const mockOpenDeletion = jest.fn();
const mockHasRole = jest.fn((_roles: string[]) => false);
const mockUser = {
  id: "user-1",
  name: "Ana",
  username: "ana",
  email: "ana@vinnot.com",
  avatarUrl: null,
  roles: ["ROLE_USER"],
  hasSocialIdentity: false,
  hasPassword: true,
};

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => mockTranslate(key) }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("@/presentation/navigation/guards", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/presentation/hooks/ui", () => ({
  useHaptics: () => ({ selection: jest.fn() }),
}));
jest.mock("@/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    hasRole: mockHasRole,
    refreshUser: mockRefreshUser,
    clearSession: mockClearSession,
    syncUser: jest.fn(async () => undefined),
  }),
}));
jest.mock("@/presentation/hooks/useAccountActions", () => ({
  useAccountActions: () => ({ forgotPassword: mockForgotPassword }),
}));
jest.mock("@/presentation/hooks/useLanguagePreference", () => ({
  useLanguagePreference: () => ({ language: "es", changeLanguage: jest.fn() }),
}));
jest.mock("@/presentation/hooks/queries/user", () => ({
  useUserStats: () => ({ data: undefined, isLoading: false, isFetching: false, refetch: jest.fn() }),
  useFreshPointsSummary: () => ({ data: undefined, isLoading: false, isFetching: false, refetch: jest.fn() }),
  useDeactivateAccount: () => ({ mutate: mockDeactivateMutate, isPending: false }),
  useRequestEmailChange: () => ({ mutate: mockEmailMutate, isPending: false }),
}));
jest.mock("@/presentation/hooks/queries/partner", () => ({
  useOrganizedEventCount: () => undefined,
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError, showInfo: mockShowInfo }),
}));
jest.mock("@/presentation/store/mutationAdapter", () => ({
  getMutationErrorCode: (error: { code?: string }) => error?.code,
  getMutationErrorMessage: (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback),
}));
jest.mock("@/presentation/features/community/CommunityOverview", () => ({
  useCommunityActivityLabel: () => "activity",
}));
jest.mock("@/presentation/features/user/usePermanentAccountDeletion", () => ({
  usePermanentAccountDeletion: () => ({ open: mockOpenDeletion, busy: false }),
}));
jest.mock("@/presentation/features/user/DeleteAccountDialog", () => ({
  DeleteAccountDialog: () => null,
}));
jest.mock("@/presentation/features/points/ProfilePoints", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    ProfilePoints: ({ onOpen }: { onOpen: () => void }) =>
      mockReact.createElement("Text", { testID: "profile-points-open", onPress: onOpen }, "points"),
  };
});
jest.mock("@/presentation/features/user", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const element = mockReact.createElement;
  return {
    ProfileHero: ({ displayName, onEdit, children }: { displayName: string; onEdit: () => void; children?: React.ReactNode }) =>
      element(
        "View",
        null,
        element("Text", null, displayName),
        element("Text", { testID: "hero-edit", onPress: onEdit }, "edit"),
        children,
      ),
    StatsRow: ({ onCellarPress }: { onCellarPress: () => void }) =>
      element("Text", { testID: "stats-cellar", onPress: onCellarPress }, "stats"),
    SettingsSection: ({ actions }: { actions: Action[] }) =>
      element(
        "View",
        null,
        ...actions.map((action) =>
          element("Text", { key: action.key, testID: `action-${action.key}`, onPress: action.onPress }, action.label),
        ),
      ),
    AccountSheet: ({
      visible,
      onRequestEmailChange,
      onDeactivate,
      onDelete,
    }: {
      visible: boolean;
      onRequestEmailChange: (value: string) => void;
      onDeactivate: () => void;
      onDelete: () => void;
    }) =>
      element(
        "View",
        null,
        element("Text", { testID: "account-visible" }, visible ? "open" : "closed"),
        element("Text", { testID: "email-invalid", onPress: () => onRequestEmailChange("nope") }, "x"),
        element("Text", { testID: "email-same", onPress: () => onRequestEmailChange(" ANA@vinnot.com ") }, "x"),
        element("Text", { testID: "email-new", onPress: () => onRequestEmailChange(" New@Vinnot.com ") }, "x"),
        element("Text", { testID: "account-deactivate", onPress: onDeactivate }, "x"),
        element("Text", { testID: "account-delete", onPress: onDelete }, "x"),
      ),
    AvatarPickerSheet: () => null,
    ChangePasswordSheet: ({ visible }: { visible: boolean }) =>
      element("Text", { testID: "password-visible" }, visible ? "open" : "closed"),
    EditProfileSheet: ({ visible }: { visible: boolean }) =>
      visible ? element("Text", { testID: "edit-sheet" }, "edit") : null,
    LanguageSheet: () => null,
    NotificationPreferencesSheet: ({ visible }: { visible: boolean }) =>
      visible ? element("Text", { testID: "notifications-sheet" }, "notifications") : null,
  };
});

describe("profile route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTranslate = identity;
    mockHasRole.mockReturnValue(false);
    mockUser.hasSocialIdentity = false;
    mockUser.hasPassword = true;
  });

  it("navigates to the account destinations and logs out", async () => {
    const screen = render(<ProfileRoute />);
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.queryByTestId("action-admin")).toBeNull();
    fireEvent.press(screen.getByTestId("action-community"));
    fireEvent.press(screen.getByTestId("action-tickets"));
    fireEvent.press(screen.getByTestId("action-submissions"));
    fireEvent.press(screen.getByTestId("action-privacy"));
    fireEvent.press(screen.getByTestId("action-help"));
    expect(mockPush.mock.calls.map((call) => call[0])).toEqual([
      "/(app)/community",
      "/my-tickets",
      "/my-submissions",
      "/legal",
      "/help",
    ]);
    await act(async () => {
      fireEvent.press(screen.getByText("auth.logout"));
    });
    expect(mockLogout).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
  });

  it("lists tickets and password first, and the account section before the stats", () => {
    const screen = render(<ProfileRoute />);
    const ids = screen.UNSAFE_root.findAll((node) => typeof node.props.testID === "string" && String(node.type) === "Text")
      .map((node) => node.props.testID as string);
    const actions = ids.filter((id) => id.startsWith("action-"));
    expect(actions.slice(0, 3)).toEqual(["action-tickets", "action-password", "action-settings"]);
    expect(actions.indexOf("action-community")).toBeGreaterThan(actions.indexOf("action-submissions"));
    expect(ids.indexOf("action-tickets")).toBeLessThan(ids.indexOf("stats-cellar"));
  });

  it("opens the points screen from the emblem in the header", () => {
    const view = render(<ProfileRoute />);
    fireEvent.press(view.getByTestId("profile-points-open"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/points");
  });

  it("translates the error shown when refreshing the profile fails", async () => {
    // Session errors carry a translation key, not text for the user.
    mockRefreshUser.mockRejectedValueOnce(new Error("authErrors.sessionExpired"));
    mockTranslate = (key) => (key === "authErrors.sessionExpired" ? "Tu sesión expiró." : key);
    const screen = render(<ProfileRoute />);
    const refreshable = screen.UNSAFE_root.find((node) => typeof node.props.onRefresh === "function");
    await act(async () => {
      refreshable.props.onRefresh();
    });
    expect(mockShowError).toHaveBeenCalledWith("Tu sesión expiró.");
  });

  it("edits the profile from the top button only, not from a repeated list row", () => {
    const screen = render(<ProfileRoute />);
    expect(screen.queryByTestId("action-edit")).toBeNull();
    expect(screen.queryByTestId("edit-sheet")).toBeNull();
    fireEvent.press(screen.getByTestId("hero-edit"));
    expect(screen.getByTestId("edit-sheet")).toBeTruthy();
  });

  it("opens the notification preferences sheet", () => {
    const screen = render(<ProfileRoute />);
    expect(screen.queryByTestId("notifications-sheet")).toBeNull();
    fireEvent.press(screen.getByTestId("action-notifications"));
    expect(screen.getByTestId("notifications-sheet")).toBeTruthy();
  });

  it("offers admin and partner panels by role", () => {
    mockHasRole.mockReturnValue(true);
    const screen = render(<ProfileRoute />);
    fireEvent.press(screen.getByTestId("action-admin"));
    fireEvent.press(screen.getByTestId("action-partner"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/admin");
    expect(mockPush).toHaveBeenCalledWith("/(app)/partner/events");
  });

  it("opens the password sheet for local accounts", () => {
    const screen = render(<ProfileRoute />);
    expect(screen.getByText("profile.changePassword")).toBeTruthy();
    fireEvent.press(screen.getByTestId("action-password"));
    expect(screen.getByTestId("password-visible").props.children).toBe("open");
  });

  it("opens the password sheet for social-linked accounts that keep a password", () => {
    mockUser.hasSocialIdentity = true;
    mockUser.hasPassword = true;
    const screen = render(<ProfileRoute />);
    expect(screen.getByText("profile.changePassword")).toBeTruthy();
    expect(screen.queryByText("profile.sendPasswordSetupLink")).toBeNull();
    fireEvent.press(screen.getByTestId("action-password"));
    expect(screen.getByTestId("password-visible").props.children).toBe("open");
  });

  it("sends a password setup link for social accounts", async () => {
    mockUser.hasSocialIdentity = true;
    mockUser.hasPassword = false;
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const screen = render(<ProfileRoute />);
    fireEvent.press(screen.getByTestId("action-password"));
    expect(alertSpy.mock.calls[0]![0]).toBe("profile.passwordSetupTitle");
    const buttons = alertSpy.mock.calls[0]![2] as { onPress?: () => void }[];
    await act(async () => buttons[1]!.onPress?.());
    expect(mockForgotPassword).toHaveBeenCalledWith("ana@vinnot.com");
    expect(mockShowSuccess).toHaveBeenCalledWith("profile.toastPasswordSetupSent");
    alertSpy.mockRestore();
  });

  it("validates and requests an email change", () => {
    const screen = render(<ProfileRoute />);
    fireEvent.press(screen.getByTestId("action-settings"));
    expect(screen.getByTestId("account-visible").props.children).toBe("open");
    fireEvent.press(screen.getByTestId("email-invalid"));
    expect(mockShowError).toHaveBeenCalledWith("profile.emailChangeInvalid");
    fireEvent.press(screen.getByTestId("email-same"));
    expect(mockShowInfo).toHaveBeenCalledWith("profile.emailChangeSame");
    fireEvent.press(screen.getByTestId("email-new"));
    expect(mockEmailMutate).toHaveBeenCalledWith("new@vinnot.com", expect.any(Object));
    mockEmailMutate.mock.calls[0]![1].onError?.({ code: "EMAIL_ALREADY_EXISTS" });
    expect(mockShowError).toHaveBeenCalledWith("profile.emailChangeAlreadyExists");
    act(() => mockEmailMutate.mock.calls[0]![1].onSuccess?.());
    expect(mockShowSuccess).toHaveBeenCalledWith("profile.toastEmailChangeRequested");
    expect(screen.getByTestId("account-visible").props.children).toBe("closed");
  });

  it("deactivates after confirmation and delegates permanent deletion", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const screen = render(<ProfileRoute />);
    fireEvent.press(screen.getByTestId("account-deactivate"));
    const buttons = alertSpy.mock.calls[0]![2] as { onPress?: () => void }[];
    buttons[1]!.onPress?.();
    await act(async () => mockDeactivateMutate.mock.calls[0]![1].onSuccess?.());
    expect(mockShowSuccess).toHaveBeenCalledWith("profile.toastAccountDeactivated");
    expect(mockClearSession).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
    fireEvent.press(screen.getByTestId("account-delete"));
    expect(mockOpenDeletion).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

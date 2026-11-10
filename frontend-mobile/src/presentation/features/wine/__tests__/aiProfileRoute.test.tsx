import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ROLES, type Role } from "@/shared/config/roles";
import AiProfileRoute from "../../../../../app/(app)/(tabs)/wines/[id]/ai-profile";

const mockGenerateInitial = jest.fn<(...args: unknown[]) => void>();
const mockRegenerate = jest.fn();
const mockRefetchProfile = jest.fn();
const mockRefetchStatus = jest.fn();
const mockJourneyStart = jest.fn();
const mockJourneyComplete = jest.fn();
const mockJourneyCancel = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockShowError = jest.fn();
let mockCanGoBack = true;
let mockStatusError: { status?: number; code?: string } | null = null;
let mockProfileError: { status?: number; code?: string } | null = null;
let mockRoles: Role[] = [];

let mockGenerateParam: string | undefined;
let mockProfileStatus: "NONE" | "GENERATED";
let mockProfileMissing = false;
let mockJourneyVisible = false;
let mockWineType: string | undefined;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "wine-1", generate: mockGenerateParam }),
  useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: jest.fn() }),
}));
jest.mock("@/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ hasAnyRole: (roles: Role[]) => roles.some(role => mockRoles.includes(role)) }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

jest.mock("@/presentation/navigation/guards", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/presentation/hooks/useProcessJourneyVisibility", () => ({
  useProcessJourneyVisibility: () => ({
    visible: mockJourneyVisible,
    start: mockJourneyStart,
    complete: mockJourneyComplete,
    cancel: mockJourneyCancel,
  }),
}));

jest.mock("@/presentation/hooks/queries/wine", () => ({
  useWineDetail: () => ({ data: { id: "wine-1", name: "Reserva", type: mockWineType } }),
  useAiProfileStatus: () => ({
    data: mockStatusError ? undefined : { status: mockProfileStatus },
    isLoading: false,
    isError: !!mockStatusError,
    error: mockStatusError ?? undefined,
    refetch: mockRefetchStatus,
  }),
  useAiWineProfile: (_id: string, enabled: boolean) => ({
    data: enabled && !mockProfileMissing && !mockProfileError ? { summary: "Stored profile" } : undefined,
    isLoading: false,
    isFetching: false,
    isError: enabled && (mockProfileMissing || !!mockProfileError),
    error: enabled && mockProfileError ? mockProfileError
      : enabled && mockProfileMissing ? { status: 404, message: "Not found" } : undefined,
    refetch: mockRefetchProfile,
  }),
  useGenerateAiProfile: () => ({ isPending: false, mutate: mockGenerateInitial }),
  useRegenerateAiProfile: () => ({ isPending: false, mutate: mockRegenerate }),
}));

jest.mock("@/presentation/features/wine", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    AI_PROFILE_JOURNEY_MINIMUM_DURATION_MS: 0,
    AiProfileLoadingSteps: ({ wineType }: { wineType?: string }) =>
      mockReact.createElement("Text", null, `Loading profile:${wineType ?? "unknown"}`),
    AiProfileSections: ({ profile }: { profile: { summary: string } }) =>
      mockReact.createElement("Text", null, profile.summary),
  };
});

jest.mock("@/presentation/components/ui/Button", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    Button: ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) =>
      mockReact.createElement("Text", { onPress }, children),
  };
});

jest.mock("@/presentation/components/ui/Card", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    Card: ({ children }: { children: React.ReactNode }) =>
      mockReact.createElement("View", null, children),
  };
});

jest.mock("@/presentation/components/ui/Feedback", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    EmptyState: ({ title, description, action }: {
      title: string; description?: string; action?: { label: string; onPress: () => void };
    }) => mockReact.createElement("View", null,
      mockReact.createElement("Text", null, title),
      description ? mockReact.createElement("Text", null, description) : null,
      action ? mockReact.createElement("Text", { onPress: action.onPress }, action.label) : null),
  };
});

describe("AI profile route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateParam = undefined;
    mockProfileStatus = "NONE";
    mockProfileMissing = false;
    mockJourneyVisible = false;
    mockWineType = undefined;
    mockRoles = [ROLES.USER];
    mockCanGoBack = true;
    mockStatusError = null;
    mockProfileError = null;
  });

  it("offers Retry, not Generate, when a stored profile fails to load", () => {
    mockProfileStatus = "GENERATED";
    mockProfileError = { status: 500 };
    const screen = render(<AiProfileRoute />);

    expect(screen.getByText("wines.aiProfileLoadError")).toBeTruthy();
    expect(screen.queryByText("Generar perfil")).toBeNull();
    fireEvent.press(screen.getByText("common.retry"));
    expect(mockRefetchProfile).toHaveBeenCalledTimes(1);
    expect(mockGenerateInitial).not.toHaveBeenCalled();
  });

  it("retries the profile status instead of generating when the status read fails", async () => {
    mockGenerateParam = "1";
    mockStatusError = { code: "NETWORK_ERROR" };
    const screen = render(<AiProfileRoute />);

    fireEvent.press(screen.getByText("common.retry"));
    expect(mockRefetchStatus).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockGenerateInitial).not.toHaveBeenCalled());
  });

  it.each([
    [{ code: "TIMEOUT" }, "aiProfile.errors.timeout"],
    [{ status: 429 }, "aiProfile.errors.rateLimit"],
    [{ code: "NETWORK_ERROR" }, "aiProfile.errors.network"],
    [{ status: 500, message: "Request failed with status code 500" }, "aiProfile.errors.generic"],
  ])("explains a failed generation (%o) with a translated message", (error, key) => {
    mockGenerateInitial.mockImplementationOnce((...args: unknown[]) => {
      (args[1] as { onError: (e: unknown) => void }).onError(error);
    });
    const screen = render(<AiProfileRoute />);
    fireEvent.press(screen.getByText("Generar perfil"));

    expect(mockJourneyCancel).toHaveBeenCalledTimes(1);
    expect(mockShowError).toHaveBeenCalledWith(key);
  });

  it("goes back, or to the wine when the profile was opened from a link", () => {
    const screen = render(<AiProfileRoute />);
    fireEvent.press(screen.getByText("common.back"));
    expect(mockBack).toHaveBeenCalledTimes(1);

    mockCanGoBack = false;
    fireEvent.press(screen.getByText("common.back"));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: "/(app)/(tabs)/wines/[id]", params: { id: "wine-1" } });
  });

  it("draws the loading scenes with the wine's type once it is known", () => {
    mockJourneyVisible = true;
    const loading = render(<AiProfileRoute />);
    expect(loading.getByText("Loading profile:unknown")).toBeTruthy();
    loading.unmount();

    mockWineType = "sparkling";
    const screen = render(<AiProfileRoute />);
    expect(screen.getByText("Loading profile:sparkling")).toBeTruthy();
  });

  it("treats a 404 profile read as no profile yet and offers to generate it", () => {
    mockProfileStatus = "GENERATED";
    mockProfileMissing = true;
    const screen = render(<AiProfileRoute />);

    expect(screen.getByText("wines.aiProfileUnavailable")).toBeTruthy();
    expect(screen.getByText("wines.aiProfileUnavailableDescription")).toBeTruthy();
    expect(screen.queryByText("Not found")).toBeNull();
    fireEvent.press(screen.getByText("Generar perfil"));
    expect(mockGenerateInitial).toHaveBeenCalledTimes(1);
  });

  it("uses idempotent generation for a wine without a profile", async () => {
    mockGenerateParam = "1";

    render(<AiProfileRoute />);

    await waitFor(() => expect(mockGenerateInitial).toHaveBeenCalledTimes(1));
    expect(mockRegenerate).not.toHaveBeenCalled();
  });

  it("opens an existing profile without generating it again", async () => {
    mockGenerateParam = "1";
    mockProfileStatus = "GENERATED";

    const screen = render(<AiProfileRoute />);

    await waitFor(() => expect(screen.getByText("Stored profile")).toBeTruthy());
    expect(mockGenerateInitial).not.toHaveBeenCalled();
    expect(mockRegenerate).not.toHaveBeenCalled();
  });
  it.each([ROLES.ADMIN, ROLES.MODERATOR])("opens the visual editor directly from the profile for %s", role => {
    mockRoles = [role];
    mockProfileStatus = "GENERATED";
    const screen = render(<AiProfileRoute />);
    fireEvent.press(screen.getByText("admin.aiProfile.editFullProfile"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/(app)/admin/wines/[id]/ai-profile", params: { id: "wine-1" } });
    expect(mockGenerateInitial).not.toHaveBeenCalled();
  });
  it.each([ROLES.USER, ROLES.PARTNER])("does not expose profile editing to %s", role => {
    mockRoles = [role];
    mockProfileStatus = "GENERATED";
    const screen = render(<AiProfileRoute />);
    expect(screen.queryByText("admin.aiProfile.editFullProfile")).toBeNull();
  });
});

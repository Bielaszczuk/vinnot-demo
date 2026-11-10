import React from "react";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Alert } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { ClipboardList, Edit3, Trash2 } from "lucide-react-native";
import AdminEventsRoute from "../../../../../app/(app)/admin/events";
import AdminRoutesRoute from "../../../../../app/(app)/admin/routes";
import AdminUsersRoute from "../../../../../app/(app)/admin/users";
import AdminWineriesRoute from "../../../../../app/(app)/admin/wineries";

const mockBack = jest.fn();
const mockHasRole = jest.fn((_role: unknown) => true);
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockRemove = jest.fn(async (_input: unknown) => undefined);
const mockOpenEdit = jest.fn();
const mockOpenCreate = jest.fn();

const mockEvent = {
  id: "evt-1",
  title: "Cata de Malbec",
  status: "PUBLISHED",
  startDate: "2026-06-10T18:00:00.000Z",
  locationCity: "Mendoza",
  locationRegion: "Cuyo",
  currentAttendees: 3,
  maxAttendees: 10,
};
const mockRoute = {
  id: "route-1",
  name: "Ruta del Malbec",
  status: "PUBLISHED",
  country: "Argentina",
  region: "Mendoza",
  difficulty: null,
  estimatedDays: 2,
};
const mockWinery = {
  id: "winery-1",
  name: "Bodega Norte",
  establishedYear: 1990,
  regionName: "Mendoza",
  countryName: "Argentina",
  winesCount: 4,
};
const mockUser = { id: "user-1", name: "Ana", email: "ana@vinnot.com" };
const page = (item: unknown) => ({
  data: { items: [item], totalItems: 1 },
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
});

const mockReplace = jest.fn();
const mockHistory = { canGoBack: true };
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn(), replace: mockReplace, canGoBack: () => mockHistory.canGoBack }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { title?: string; name?: string; count?: number }) =>
      options?.title
        ? `${key}:${options.title}`
        : options?.name
          ? `${key}:${options.name}`
          : options?.count !== undefined
            ? `${key}#${options.count}`
            : key,
    i18n: { language: "es", resolvedLanguage: "es" },
  }),
}));
jest.mock("@/presentation/navigation/guards", () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ hasRole: mockHasRole }),
}));
jest.mock("@/presentation/hooks/ui", () => ({
  useDebounce: (value: string) => value,
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));
jest.mock("@/presentation/hooks/queries/admin/useAdminDetailEditor", () => ({
  useAdminDetailEditor: () => ({
    editing: null,
    visible: false,
    openCreate: mockOpenCreate,
    openEdit: mockOpenEdit,
    close: jest.fn(),
    isLoading: false,
  }),
}));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminEvents: () => page(mockEvent),
  useAdminEventMutations: () => ({ remove: { mutateAsync: mockRemove } }),
  useAdminRoutes: () => page(mockRoute),
  useAdminRouteMutations: () => ({ remove: { mutateAsync: mockRemove } }),
  useAdminWineries: () => page(mockWinery),
  useAdminWineryMutations: () => ({ remove: { mutateAsync: mockRemove } }),
  useAdminCountries: () => ({ data: [] }),
  useAdminRegions: () => ({ data: [] }),
  useAdminUsers: () => page(mockUser),
}));
jest.mock("@shopify/flash-list", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    FlashList: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListFooterComponent,
    }: {
      data: { id: string }[];
      renderItem: ({ item }: { item: { id: string } }) => React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      ListFooterComponent?: React.ReactNode;
    }) =>
      mockReact.createElement(
        "View",
        null,
        ListHeaderComponent ?? null,
        ...data.map((item) => mockReact.createElement("View", { key: item.id }, renderItem({ item }))),
        ListFooterComponent ?? null,
      ),
  };
});
jest.mock("@/presentation/components/layout", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    AppHeader: ({ title, onBack }: { title: string; onBack: () => void }) =>
      mockReact.createElement("Text", { testID: "header-back", onPress: onBack }, title),
  };
});
jest.mock("@/presentation/features/event/EventRegistrationsManagerSheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    EventRegistrationsManagerSheet: ({ eventTitle }: { eventTitle: string }) =>
      mockReact.createElement("Text", { testID: "registrations-sheet" }, eventTitle),
  };
});
jest.mock("@/presentation/features/event/CancelEventSheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    CancelEventSheet: ({
      visible,
      eventTitle,
      onConfirm,
    }: {
      visible: boolean;
      eventTitle: string;
      onConfirm: (cancellation: { reason: string }) => void;
    }) =>
      mockReact.createElement(
        "Text",
        { testID: "cancel-sheet", onPress: () => onConfirm({ reason: "WEATHER" }) },
        visible ? `open:${eventTitle}` : "closed",
      ),
  };
});
jest.mock("@/presentation/features/admin", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    AdminPageHero: ({ onNew }: { onNew?: () => void }) =>
      mockReact.createElement("Text", { testID: "hero-new", onPress: onNew }, "new"),
    AdminSearchBar: () => mockReact.createElement("Text", null, "search"),
    AdminPaginationBar: () => mockReact.createElement("Text", null, "pagination"),
    AdminEventSheet: () => null,
    AdminRouteSheet: () => null,
    AdminWinerySheet: () => null,
    AdminUserActionSheet: ({ visible, user }: { visible: boolean; user: { name: string } | null }) =>
      mockReact.createElement("Text", { testID: "user-sheet" }, visible ? `open:${user?.name}` : "closed"),
  };
});
jest.mock("@/presentation/features/admin/AdminUserRow", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    AdminUserRow: ({ user, onPress }: { user: { name: string }; onPress: () => void }) =>
      mockReact.createElement("Text", { testID: "user-row", onPress }, user.name),
  };
});

async function confirmDestructiveAlert(alertSpy: ReturnType<typeof jest.spyOn>) {
  const buttons = alertSpy.mock.calls[0]![2] as { style?: string; onPress?: () => void }[];
  await act(async () => buttons.find((button) => button.style === "destructive")?.onPress?.());
}

describe("admin list routes", () => {
  let alertSpy: ReturnType<typeof jest.spyOn>;
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasRole.mockReturnValue(true);
    mockHistory.canGoBack = true;
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  });
  afterEach(() => alertSpy.mockRestore());

  it("lists events, opens registrations and cancels after confirmation", async () => {
    const screen = render(<AdminEventsRoute />);
    expect(screen.getByText("Cata de Malbec")).toBeTruthy();
    expect(screen.getByText("admin.actions.manageEvents")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("admin.events.manageRegistrationsFor:Cata de Malbec"));
    expect(screen.getByTestId("registrations-sheet").props.children).toBe("Cata de Malbec");
    expect(screen.UNSAFE_getAllByType(ClipboardList)).toHaveLength(1);
    fireEvent.press(screen.UNSAFE_getByType(Edit3));
    expect(mockOpenEdit).toHaveBeenCalledWith(mockEvent);
    expect(screen.getByTestId("cancel-sheet").props.children).toBe("closed");
    fireEvent.press(screen.getByLabelText("admin.common.cancelEventItem:Cata de Malbec"));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("cancel-sheet").props.children).toBe("open:Cata de Malbec");
    await act(async () => fireEvent.press(screen.getByTestId("cancel-sheet")));
    expect(mockRemove).toHaveBeenCalledWith({ id: "evt-1", cancellation: { reason: "WEATHER" } });
    expect(mockShowSuccess).toHaveBeenCalledWith("admin.events.toastCancelled");
    expect(screen.getByTestId("cancel-sheet").props.children).toBe("closed");
    fireEvent.press(screen.getByTestId("header-back"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("hides event cancellation for moderators", () => {
    mockHasRole.mockReturnValue(false);
    const screen = render(<AdminEventsRoute />);
    expect(screen.queryByLabelText("admin.common.cancelEventItem:Cata de Malbec")).toBeNull();
    fireEvent.press(screen.getByTestId("hero-new"));
    expect(mockOpenCreate).toHaveBeenCalled();
  });

  it("lists wine routes and deletes after confirmation", async () => {
    const screen = render(<AdminRoutesRoute />);
    expect(screen.getByText("Ruta del Malbec")).toBeTruthy();
    expect(screen.getByText("Mendoza · admin.routes.daysCount#2")).toBeTruthy();
    fireEvent.press(screen.UNSAFE_getByType(Trash2));
    expect(alertSpy.mock.calls[0]![0]).toBe("admin.routes.deleteTitle");
    await confirmDestructiveAlert(alertSpy);
    expect(mockRemove).toHaveBeenCalledWith("route-1");
  });

  it("lists wineries and reports a failed deletion", async () => {
    mockRemove.mockRejectedValueOnce(new Error("boom"));
    const screen = render(<AdminWineriesRoute />);
    expect(screen.getByText("Bodega Norte")).toBeTruthy();
    fireEvent.press(screen.UNSAFE_getByType(Trash2));
    expect(alertSpy.mock.calls[0]![0]).toBe("admin.wineries.deleteTitle");
    await confirmDestructiveAlert(alertSpy);
    expect(mockRemove).toHaveBeenCalledWith("winery-1");
    expect(mockShowError).toHaveBeenCalledWith("admin.feedback.deleteError");
  });

  it("names every row action for screen readers with a 44pt target", () => {
    const events = render(<AdminEventsRoute />);
    for (const label of ["admin.common.editItem:Cata de Malbec", "admin.common.cancelEventItem:Cata de Malbec"]) {
      expect(events.getByLabelText(label).props.hitSlop).toBe(6);
    }
    events.unmount();
    const routes = render(<AdminRoutesRoute />);
    expect(routes.getByLabelText("admin.common.editItem:Ruta del Malbec")).toBeTruthy();
    expect(routes.getByLabelText("admin.common.deleteItem:Ruta del Malbec")).toBeTruthy();
    routes.unmount();
    const wineries = render(<AdminWineriesRoute />);
    fireEvent.press(wineries.getByLabelText("admin.common.editItem:Bodega Norte"));
    expect(wineries.getByLabelText("admin.common.deleteItem:Bodega Norte")).toBeTruthy();
  });

  it("returns to the admin panel when an admin list was opened without history", () => {
    mockHistory.canGoBack = false;
    const screen = render(<AdminRoutesRoute />);
    fireEvent.press(screen.getByTestId("header-back"));
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/(app)/admin");
  });

  it("lists users and opens the action sheet for the selected user", () => {
    const screen = render(<AdminUsersRoute />);
    expect(screen.getByTestId("user-sheet").props.children).toBe("closed");
    fireEvent.press(screen.getByTestId("user-row"));
    expect(screen.getByTestId("user-sheet").props.children).toBe("open:Ana");
  });
});

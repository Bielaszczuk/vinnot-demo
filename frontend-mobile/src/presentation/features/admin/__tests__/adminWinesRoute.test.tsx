import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { Alert } from "react-native";
import AdminWinesScreen from "../../../../../app/(app)/admin/wines";
import type { AdminWine } from "@/domain/admin/admin.types";
import { Trash2 } from "lucide-react-native";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRemoveMutate = jest.fn();
const mockHasRole = jest.fn(() => true);

const mockWine: AdminWine = {
  id: "wine-1",
  name: "Malbec Reserva",
  vintage: 2023,
  wineType: "RED",
  wineryId: "winery-1",
  wineryName: "Bodega Norte",
  region: "Mendoza",
  country: "Argentina",
  style: null,
  grapes: ["Malbec"],
  allergens: [],
  alcoholContent: 13.5,
  descriptionEn: null,
  descriptionEs: null,
  imageUrl: null,
  priceMin: null,
  priceMax: null,
  ratingAverage: 4.2,
  isFeatured: true,
  isActive: true,
  createdAt: "2026-05-30T10:00:00.000Z",
  acidityScore: null,
  tanninScore: null,
  bodyScore: null,
  sweetnessScore: null,
};

jest.mock("@/presentation/store/api", () => ({
  useLazyExecuteQueryQuery: () => [jest.fn()],
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: jest.fn() }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { defaultValue?: string }) =>
      (typeof fallback === "string" ? fallback : fallback?.defaultValue) ?? key,
  }),
}));

jest.mock("@/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    hasRole: mockHasRole,
  }),
}));

jest.mock("@/presentation/hooks/ui", () => ({
  useDebounce: (value: string) => value,
}));

jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminWines: () => ({
    data: { items: [mockWine], totalItems: 1 },
    isLoading: false,
  }),
  useAdminWineMutations: () => ({
    remove: { mutate: mockRemoveMutate },
  }),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    BottomSheetModalProvider: ({ children }: { children: React.ReactNode }) =>
      mockReact.createElement("View", null, children),
  };
});

jest.mock("@shopify/flash-list", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    FlashList: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListFooterComponent,
    }: {
      data: AdminWine[];
      renderItem: ({ item }: { item: AdminWine }) => React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      ListFooterComponent?: React.ReactNode;
    }) =>
      mockReact.createElement(
        "View",
        null,
        ListHeaderComponent ?? null,
        ...data.map((item) =>
          mockReact.createElement("View", { key: item.id }, renderItem({ item })),
        ),
        ListFooterComponent ?? null,
      ),
  };
});

jest.mock("@/presentation/components/layout", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    AppHeader: ({ onBack }: { onBack: () => void }) =>
      mockReact.createElement("Text", { testID: "header-back", onPress: onBack }, "header"),
  };
});

jest.mock("@/presentation/components/ui/Feedback", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    EmptyState: () => mockReact.createElement("Text", null, "empty"),
    Skeleton: () => mockReact.createElement("Text", null, "skeleton"),
  };
});

jest.mock("@/presentation/components/ui/ImageWithFallback", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    ImageWithFallback: () => mockReact.createElement("Text", null, "img"),
  };
});

jest.mock("@/presentation/features/admin", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    AdminPageHero: ({ onNew }: { onNew: () => void }) =>
      mockReact.createElement("Text", { testID: "hero-new", onPress: onNew }, "new"),
    AdminSearchBar: ({ onChangeText }: { onChangeText: (value: string) => void }) =>
      mockReact.createElement(
        "Text",
        { testID: "search-change", onPress: () => onChangeText("malbec") },
        "search",
      ),
    AdminPaginationBar: () => mockReact.createElement("Text", null, "pagination"),
    AdminWineSheet: ({
      visible,
      onOpenAiProfile,
    }: {
      visible: boolean;
      onOpenAiProfile: (wineId: string) => void;
    }) =>
      mockReact.createElement(
        "View",
        null,
        mockReact.createElement("Text", { testID: "sheet-visible" }, visible ? "open" : "closed"),
        mockReact.createElement(
          "Text",
          { testID: "sheet-ai", onPress: () => onOpenAiProfile("wine-1") },
          "ai",
        ),
      ),
  };
});

describe("admin wines route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasRole.mockReturnValue(true);
  });

  it("keeps creation and profile access for moderators but hides wine deletion", () => {
    mockHasRole.mockReturnValue(false);
    const screen = render(<AdminWinesScreen />);
    expect(screen.UNSAFE_queryAllByType(Trash2)).toHaveLength(0);
    fireEvent.press(screen.getByTestId("hero-new"));
    expect(screen.getByTestId("sheet-visible").props.children).toBe("open");
    fireEvent.press(screen.getByTestId("sheet-ai"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/admin/wines/[id]/ai-profile",
      params: { id: "wine-1" },
    });
    expect(mockRemoveMutate).not.toHaveBeenCalled();
  });

  it("opens create sheet and routes to AI profile from sheet action", () => {
    const screen = render(<AdminWinesScreen />);

    expect(screen.getByText("Malbec Reserva 2023")).toBeTruthy();

    fireEvent.press(screen.getByTestId("hero-new"));
    expect(screen.getByTestId("sheet-visible").props.children).toBe("open");

    fireEvent.press(screen.getByTestId("sheet-ai"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/admin/wines/[id]/ai-profile",
      params: { id: "wine-1" },
    });
  });

  it("opens the wine's profile from the row, which offers to generate it only when it is missing", () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const screen = render(<AdminWinesScreen />);
    fireEvent.press(screen.getByLabelText("admin.common.aiProfileItem"));
    expect(alert).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/admin/wines/[id]/ai-profile",
      params: { id: "wine-1" },
    });
    alert.mockRestore();
  });
});

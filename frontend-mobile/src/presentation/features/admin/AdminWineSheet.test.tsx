import React from "react";
import { Alert, type AlertButton } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { AdminWine } from "@/domain/admin/admin.types";
import { AdminWineSheet } from "./AdminWineSheet";

type SheetProps = {
  onDismiss: () => void;
  enablePanDownToClose: boolean;
  children: React.ReactNode;
  footerComponent?: (props: object) => React.ReactNode;
};
const mockSheet: { props?: SheetProps } = {};
const mockPresent = jest.fn();
const mockPending = { value: false };
const mockCreateWine = jest.fn();
const mockUpdateWine = jest.fn();
const mockCreateWinery = jest.fn();
const mockShowError = jest.fn();
const mockWineries = [
  { id: "w-1", name: "Bodega Norte", regionName: "Mendoza", countryName: "Argentina" },
  { id: "w-2", name: "Bodega Sur", regionName: null, countryName: "Chile" },
];

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) => (options?.name ? `${key}(${options.name})` : key),
  }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: mockShowError, showToast: jest.fn() }),
}));
jest.mock("@/presentation/hooks/ui", () => ({
  useDebounce: (value: string) => value,
  useHaptics: () => ({ selection: jest.fn() }),
}));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminWineMutations: () => ({
    create: { mutateAsync: mockCreateWine, isPending: mockPending.value },
    update: { mutateAsync: mockUpdateWine, isPending: false },
  }),
  useAdminWinerySearch: (search: string) => ({
    currentData: {
      items: search.trim().length >= 2
        ? mockWineries.filter((winery) => winery.name.toLowerCase().includes(search.trim().toLowerCase()))
        : [],
    },
    isFetching: false,
  }),
  useAdminWineryMutations: () => ({ create: { mutateAsync: mockCreateWinery, isPending: false } }),
  useAdminCountries: () => ({ data: [{ id: "country-ar", code: "AR", name: "Argentina" }] }),
  useAdminRegions: () => ({ data: [{ id: "region-mza", name: "Mendoza" }], isFetching: false }),
}));
jest.mock("@/presentation/hooks/queries/wine/useGrapeTypes", () => ({
  useGrapeTypes: () => ({
    data: [{ id: "g-1", name: "Malbec" }, { id: "g-2", name: "Cabernet Sauvignon" }],
    isLoading: false,
  }),
}));
jest.mock("@/application/services/catalogImages.service", () => ({
  catalogImagesService: { selectAndUpload: jest.fn() },
}));
jest.mock("@/presentation/components/ui/ImageWithFallback", () => ({ ImageWithFallback: () => null }));
jest.mock("@/presentation/components/ui/TextField", () => {
  const { Text, TextInput, View } = jest.requireActual("react-native");
  return {
    TextField: ({ label, accessibilityLabel, error, ...props }: {
      label?: string;
      accessibilityLabel?: string;
      error?: string;
    }) => (
      <View>
        <TextInput {...props} accessibilityLabel={label ?? accessibilityLabel} />
        {error ? <Text>{error}</Text> : null}
      </View>
    ),
  };
});
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: mockReact.forwardRef(({ children }: { children: React.ReactNode }, ref) => {
      mockReact.useImperativeHandle(ref, () => ({ scrollTo: jest.fn() }));
      return children;
    }),
    BottomSheetStickyFooter: ({ children }: { children: React.ReactNode }) => children,
    BottomSheetModal: mockReact.forwardRef((props: SheetProps, ref) => {
      mockReact.useImperativeHandle(ref, () => ({ present: mockPresent, dismiss: jest.fn() }));
      mockSheet.props = props;
      return (
        <>
          {props.children}
          {props.footerComponent?.({})}
        </>
      );
    }),
  };
});

const wine: AdminWine = {
  id: "wine-1",
  name: "Malbec Reserva",
  vintage: 2021,
  wineType: "RED",
  wineryId: "w-1",
  wineryName: "Bodega Norte",
  region: "Mendoza",
  country: "Argentina",
  style: "Reserva",
  grapes: ["Malbec"],
  allergens: ["SULFITES"],
  alcoholContent: 14,
  descriptionEn: "Deep red",
  descriptionEs: "Rojo profundo",
  imageUrl: "https://cdn.vinnot.com/w.jpg",
  priceMin: 1500,
  priceMax: 2500,
  ratingAverage: 4.2,
  isFeatured: true,
  isActive: true,
  createdAt: "2026-05-30T10:00:00.000Z",
  acidityScore: 40,
  tanninScore: 70,
  bodyScore: 80,
  sweetnessScore: 10,
};

const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
const press = (label: string) => {
  const buttons = alert.mock.calls.at(-1)?.[2] as AlertButton[];
  act(() => buttons.find((button) => button.text === label)?.onPress?.());
};
const pressAsync = async (label: string) => {
  await act(async () => {
    fireEvent.press(screen.getByText(label));
  });
};
const chooseWinery = (query: string, label: string) => {
  fireEvent.press(screen.getByRole("combobox", { name: "admin.wines.winery" }));
  fireEvent.changeText(screen.getByLabelText("admin.wines.winerySearchPlaceholder"), query);
  fireEvent.press(screen.getByRole("button", { name: label }));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPending.value = false;
  mockCreateWine.mockResolvedValue({});
  mockUpdateWine.mockResolvedValue({});
});

describe("dismiss guard", () => {
  it("asks before a swipe throws away an edited wine and re-opens it on keep editing", () => {
    const onClose = jest.fn();
    render(<AdminWineSheet visible onClose={onClose} />);
    fireEvent.changeText(screen.getByLabelText("admin.wines.name"), "Gran Reserva");

    act(() => mockSheet.props!.onDismiss());
    press("common.unsavedChanges.keepEditing");
    expect(onClose).not.toHaveBeenCalled();
    expect(mockPresent).toHaveBeenCalled();
    expect(screen.getByLabelText("admin.wines.name").props.value).toBe("Gran Reserva");

    fireEvent.press(screen.getByText("common.cancel"));
    press("common.unsavedChanges.discard");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("still closes an untouched sheet directly", () => {
    const onClose = jest.fn();
    render(<AdminWineSheet visible onClose={onClose} />);
    act(() => mockSheet.props!.onDismiss());
    expect(alert).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cannot be swiped away while saving", () => {
    mockPending.value = true;
    render(<AdminWineSheet visible onClose={jest.fn()} />);
    expect(mockSheet.props!.enablePanDownToClose).toBe(false);
  });
});

describe("saving", () => {
  it("sends the same update payload as before for an edited wine", async () => {
    const onClose = jest.fn();
    render(<AdminWineSheet visible editingWine={wine} onClose={onClose} />);
    fireEvent.changeText(screen.getByLabelText("admin.wines.name"), "  Malbec Gran Reserva ");
    await pressAsync("common.saveChanges");

    expect(mockUpdateWine).toHaveBeenCalledWith({
      id: "wine-1",
      payload: {
        name: "Malbec Gran Reserva",
        wineType: "RED",
        wineryId: "w-1",
        vintage: 2021,
        style: "Reserva",
        grapes: ["Malbec"],
        allergens: ["SULFITES"],
        alcoholContent: 14,
        descriptionEs: "Rojo profundo",
        descriptionEn: "Deep red",
        imageUrl: "https://cdn.vinnot.com/w.jpg",
        priceMin: 1500,
        priceMax: 2500,
        isFeatured: true,
        isActive: true,
        acidityScore: 40,
        tanninScore: 70,
        bodyScore: 80,
        sweetnessScore: 10,
      },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("creates a wine with the picked winery, type and grapes", async () => {
    render(<AdminWineSheet visible onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText("admin.wines.name"), "Torrontés");
    chooseWinery("sur", "Bodega Sur");
    fireEvent.press(screen.getByRole("radio", { name: "wines.types.WHITE" }));
    fireEvent.press(screen.getByText("admin.wines.sections.composition"));
    fireEvent.press(screen.getByRole("combobox", { name: "admin.wines.grapes" }));
    fireEvent.press(screen.getByRole("checkbox", { name: "Malbec" }));
    await pressAsync("admin.wines.createWine");

    expect(mockCreateWine).toHaveBeenCalledWith(expect.objectContaining({
      name: "Torrontés",
      wineryId: "w-2",
      wineType: "WHITE",
      grapes: ["Malbec"],
      allergens: [],
      vintage: null,
      imageUrl: null,
      isActive: true,
      isFeatured: false,
    }));
  });

  it("saves once when save is tapped twice while the first save is running", async () => {
    let finish: () => void = () => {};
    mockUpdateWine.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    render(<AdminWineSheet visible editingWine={wine} onClose={jest.fn()} />);
    const save = screen.getByText("common.saveChanges");
    // Both taps land before React re-renders the disabled, loading button.
    await act(async () => {
      fireEvent.press(save);
      fireEvent.press(save);
    });
    expect(mockUpdateWine).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it("explains a duplicate wine with the backend error code", async () => {
    mockUpdateWine.mockRejectedValue({ code: "DUPLICATE_ENTRY" });
    render(<AdminWineSheet visible editingWine={wine} onClose={jest.fn()} />);
    await pressAsync("common.saveChanges");
    expect(mockShowError).toHaveBeenCalledWith("forms.errors.duplicate");
  });
});

describe("validation", () => {
  it("shows the resolver errors inline in the general section and does not save", async () => {
    render(<AdminWineSheet visible onClose={jest.fn()} />);
    await pressAsync("admin.wines.createWine");
    expect(screen.getByText("forms.fixErrors")).toBeTruthy();
    expect(screen.getByText("admin.wines.validation.nameRequired")).toBeTruthy();
    expect(screen.getByText("admin.wines.validation.wineryRequired")).toBeTruthy();
    expect(mockCreateWine).not.toHaveBeenCalled();
  });

  it("opens the closed price section to show its error", async () => {
    render(<AdminWineSheet visible editingWine={{ ...wine, priceMin: 3000, priceMax: 1000 }} onClose={jest.fn()} />);
    expect(screen.queryByLabelText("admin.wines.maxPrice")).toBeNull();
    await pressAsync("common.saveChanges");
    expect(screen.getByLabelText("admin.wines.maxPrice")).toBeTruthy();
    expect(screen.getByText("admin.wines.validation.priceRange")).toBeTruthy();
    expect(screen.queryByText("admin.wines.validation.nameRequired")).toBeNull();
    expect(mockUpdateWine).not.toHaveBeenCalled();
  });
});

describe("winery created inline", () => {
  it("offers to create a missing winery and selects it once created", async () => {
    mockCreateWinery.mockResolvedValue({ id: "w-new", name: "Bodega Nueva" });
    render(<AdminWineSheet visible onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText("admin.wines.name"), "Blend");
    fireEvent.press(screen.getByRole("combobox", { name: "admin.wines.winery" }));
    fireEvent.changeText(screen.getByLabelText("admin.wines.winerySearchPlaceholder"), "Bodega Nueva");
    expect(screen.getByText("admin.wines.noWineryMatches")).toBeTruthy();
    fireEvent.press(screen.getByText("admin.wines.createWineryNamed(Bodega Nueva)"));

    expect(screen.getByLabelText("admin.wineries.name").props.value).toBe("Bodega Nueva");
    await pressAsync("admin.wines.inlineWinery.submit");

    expect(mockCreateWinery).toHaveBeenCalledWith({ name: "Bodega Nueva", countryId: "country-ar", regionId: null });
    await waitFor(() => expect(screen.queryByTestId("inline-winery-creator")).toBeNull());
    expect(screen.getByRole("combobox", { name: "admin.wines.winery" }).props.accessibilityValue).toEqual({
      text: "Bodega Nueva",
    });

    await pressAsync("admin.wines.createWine");
    expect(mockCreateWine).toHaveBeenCalledWith(expect.objectContaining({ name: "Blend", wineryId: "w-new" }));
  });

  it("asks for the winery name before creating it", async () => {
    render(<AdminWineSheet visible onClose={jest.fn()} />);
    fireEvent.press(screen.getByRole("combobox", { name: "admin.wines.winery" }));
    fireEvent.changeText(screen.getByLabelText("admin.wines.winerySearchPlaceholder"), "Nueva");
    fireEvent.press(screen.getByText("admin.wines.createWineryNamed(Nueva)"));
    fireEvent.changeText(screen.getByLabelText("admin.wineries.name"), "  ");
    await pressAsync("admin.wines.inlineWinery.submit");
    expect(screen.getByText("admin.wines.inlineWinery.validation.nameRequired")).toBeTruthy();
    expect(mockCreateWinery).not.toHaveBeenCalled();
  });
});

describe("grapes", () => {
  it("adds catalog grapes and an unlisted one through Other", async () => {
    render(<AdminWineSheet visible editingWine={{ ...wine, grapes: [] }} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText("admin.wines.sections.composition"));
    fireEvent.press(screen.getByRole("combobox", { name: "admin.wines.grapes" }));
    fireEvent.press(screen.getByRole("checkbox", { name: "Cabernet Sauvignon" }));
    fireEvent.changeText(screen.getByLabelText("admin.wines.grapesSearch"), "Bonarda");
    fireEvent.press(screen.getByText("admin.wines.otherGrape(Bonarda)"));
    expect(screen.getAllByRole("button", { name: "forms.picker.remove" })).toHaveLength(2);

    await pressAsync("common.saveChanges");
    expect(mockUpdateWine).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ grapes: ["Cabernet Sauvignon", "Bonarda"] }) }),
    );
  });

  it("offers the taste section when creating a wine too", () => {
    render(<AdminWineSheet visible onClose={jest.fn()} />);
    fireEvent.press(screen.getByText("admin.wines.sections.taste"));
    expect(screen.getByText("admin.wines.tasteCreateHint")).toBeTruthy();
  });
});

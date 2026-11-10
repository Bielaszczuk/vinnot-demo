import React from "react";
import { Alert, type AlertButton } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { AdminWinery } from "@/domain/admin/admin.types";
import { catalogImagesService } from "@/application/services/catalogImages.service";
import { AdminWinerySheet } from "./AdminWinerySheet";

type SheetProps = {
  onDismiss: () => void;
  enablePanDownToClose: boolean;
  children: React.ReactNode;
  footerComponent?: (props: object) => React.ReactNode;
};
const mockSheet: { props?: SheetProps } = {};
const mockPresent = jest.fn();
const mockPending = { value: false };
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockShowError = jest.fn();
const mockGeocode = jest.fn();
const mockRegions: Record<string, { id: string; name: string }[]> = {
  "country-ar": [
    { id: "region-mza", name: "Mendoza" },
    { id: "region-sal", name: "Salta" },
  ],
  "country-cl": [{ id: "region-mai", name: "Maipo" }],
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: mockShowError, showToast: jest.fn() }),
}));
jest.mock("@/presentation/hooks/ui", () => ({
  useDebounce: (value: string) => value,
  useHaptics: () => ({ selection: jest.fn() }),
}));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminWineryMutations: () => ({
    create: { mutateAsync: mockCreate, isPending: mockPending.value },
    update: { mutateAsync: mockUpdate, isPending: false },
  }),
  useAdminCountries: () => ({
    data: [
      { id: "country-ar", code: "AR", name: "Argentina" },
      { id: "country-cl", code: "CL", name: "Chile" },
    ],
  }),
  useAdminRegions: (countryId?: string) => ({ data: mockRegions[countryId ?? ""] ?? [], isFetching: false }),
}));
jest.mock("@/presentation/hooks/useGeocoding", () => ({
  useGeocoding: () => ({ geocodeAddress: mockGeocode, isGeocoding: false }),
}));
jest.mock("@/application/services/catalogImages.service", () => ({
  catalogImagesService: { selectAndUpload: jest.fn() },
}));
jest.mock("@/presentation/components/ui/ImageWithFallback", () => ({ ImageWithFallback: () => null }));
jest.mock("@/presentation/components/features/location/LocationPickerMap", () => {
  const { Pressable: MockPressable } = jest.requireActual("react-native");
  return {
    LocationPickerMap: ({ onChange }: { onChange: (latitude: number, longitude: number) => void }) => (
      <MockPressable accessibilityRole="button" accessibilityLabel="map-pin" onPress={() => onChange(-32.9, -68.8)} />
    ),
  };
});
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

const winery: AdminWinery = {
  id: "winery-1",
  name: "Bodega Norte",
  countryName: "Argentina",
  countryId: "country-ar",
  regionName: "Mendoza",
  regionId: "region-mza",
  subregion: "Valle de Uco",
  description: null,
  descriptionEs: "Bodega de altura",
  descriptionEn: "High-altitude winery",
  address: "Ruta 89",
  latitude: -33.3712,
  longitude: -69.1517,
  email: "hola@norte.com",
  phone: "+5492614123456",
  website: "https://norte.com",
  logoUrl: "https://cdn.vinnot.com/logo.png",
  imageUrl: "https://cdn.vinnot.com/cover.jpg",
  establishedYear: 1902,
  winesCount: 3,
  createdAt: "2026-05-30T10:00:00.000Z",
};

const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
const pressAlert = (label: string) => {
  const buttons = alert.mock.calls.at(-1)?.[2] as AlertButton[];
  act(() => buttons.find((button) => button.text === label)?.onPress?.());
};
const pressAsync = async (label: string) => {
  await act(async () => {
    fireEvent.press(screen.getByText(label));
  });
};
const pick = (picker: string, search: string, query: string, option: string) => {
  fireEvent.press(screen.getByRole("combobox", { name: picker }));
  fireEvent.changeText(screen.getByLabelText(search), query);
  fireEvent.press(screen.getByRole("button", { name: option }));
};
const upload = jest.mocked(catalogImagesService.selectAndUpload);

beforeEach(() => {
  jest.clearAllMocks();
  mockPending.value = false;
  mockCreate.mockResolvedValue({});
  mockUpdate.mockResolvedValue({});
});

describe("sections", () => {
  it("groups the winery in identity, location, contact and images sections", () => {
    render(<AdminWinerySheet visible onClose={jest.fn()} />);
    for (const section of ["identity", "location", "contact", "images"]) {
      expect(screen.getByText(`admin.wineries.sections.${section}`)).toBeTruthy();
    }
    expect(screen.getByLabelText("admin.wineries.name")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "admin.wineries.country" })).toBeTruthy();
    expect(screen.queryByLabelText("admin.wineries.email")).toBeNull();
  });

  it("shows the resolver errors inline and does not save", async () => {
    render(<AdminWinerySheet visible onClose={jest.fn()} />);
    await pressAsync("admin.wineries.createWinery");
    expect(screen.getByText("forms.fixErrors")).toBeTruthy();
    expect(screen.getByText("admin.wineries.validation.nameRequired")).toBeTruthy();
    expect(screen.getByText("admin.wineries.validation.countryRequired")).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("opens the closed contact section to show an invalid email", async () => {
    render(<AdminWinerySheet visible editingWinery={{ ...winery, email: "hola@" }} onClose={jest.fn()} />);
    expect(screen.queryByLabelText("admin.wineries.email")).toBeNull();
    await pressAsync("common.saveChanges");
    expect(screen.getByLabelText("admin.wineries.email")).toBeTruthy();
    expect(screen.getByText("admin.wineries.validation.emailInvalid")).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("keeps only digits in the founding year and rejects an impossible year", async () => {
    render(<AdminWinerySheet visible editingWinery={winery} onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText("admin.wineries.establishedYear"), "19a2");
    expect(screen.getByLabelText("admin.wineries.establishedYear").props.value).toBe("192");
    await pressAsync("common.saveChanges");
    expect(screen.getByText("admin.wineries.validation.yearInvalid")).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("country and region", () => {
  it("searches the country, offers only its regions and clears the region on a new country", async () => {
    render(<AdminWinerySheet visible onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText("admin.wineries.name"), "Bodega Nueva");
    expect(screen.getByRole("combobox", { name: "admin.wineries.region" })).toBeDisabled();

    pick("admin.wineries.country", "admin.wineries.countrySearch", "chi", "Chile");
    fireEvent.press(screen.getByRole("combobox", { name: "admin.wineries.region" }));
    expect(screen.queryByRole("button", { name: "Mendoza" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Maipo" }));

    pick("admin.wineries.country", "admin.wineries.countrySearch", "arg", "Argentina");
    expect(screen.getByRole("combobox", { name: "admin.wineries.region" }).props.accessibilityValue).toEqual({
      text: "common.selectRegion",
    });
    pick("admin.wineries.region", "admin.wineries.regionSearch", "men", "Mendoza");
    await pressAsync("admin.wineries.createWinery");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Bodega Nueva", countryId: "country-ar", regionId: "region-mza" }),
    );
  });

  it("lets an existing winery drop its region", async () => {
    render(<AdminWinerySheet visible editingWinery={winery} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText("admin.wineries.sections.location"));
    expect(screen.getByRole("combobox", { name: "admin.wineries.region" }).props.accessibilityValue).toEqual({
      text: "Mendoza",
    });
    fireEvent.press(screen.getByRole("combobox", { name: "admin.wineries.region" }));
    fireEvent.press(screen.getByRole("button", { name: "admin.wineries.noRegion" }));
    await pressAsync("common.saveChanges");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ regionId: null }) }),
    );
  });
});

describe("payload", () => {
  it("saves an untouched existing winery with exactly the previous payload", async () => {
    const onClose = jest.fn();
    render(<AdminWinerySheet visible editingWinery={winery} onClose={onClose} />);
    await pressAsync("common.saveChanges");
    expect(mockUpdate).toHaveBeenCalledWith({
      id: "winery-1",
      payload: {
        name: "Bodega Norte",
        countryId: "country-ar",
        regionId: "region-mza",
        subregion: "Valle de Uco",
        descriptionEs: "Bodega de altura",
        descriptionEn: "High-altitude winery",
        address: "Ruta 89",
        latitude: -33.3712,
        longitude: -69.1517,
        establishedYear: 1902,
        email: "hola@norte.com",
        phone: "+5492614123456",
        website: "https://norte.com",
        logoUrl: "https://cdn.vinnot.com/logo.png",
        imageUrl: "https://cdn.vinnot.com/cover.jpg",
      },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("sends the English description, the uploaded logo and cover, and the phone", async () => {
    upload
      .mockResolvedValueOnce({ status: "uploaded", imageUrl: "https://cdn.vinnot.com/new-logo.png" })
      .mockResolvedValueOnce({ status: "uploaded", imageUrl: "https://cdn.vinnot.com/new-cover.jpg" });
    render(
      <AdminWinerySheet
        visible
        editingWinery={{ ...winery, descriptionEn: null, logoUrl: null, imageUrl: null, phone: null }}
        onClose={jest.fn()}
      />,
    );
    fireEvent.changeText(screen.getByLabelText("admin.wineries.descriptionEn"), " Andean winery ");
    fireEvent.press(screen.getByText("admin.wineries.sections.contact"));
    fireEvent.changeText(screen.getByLabelText("admin.wineries.phone"), "2614123456");
    fireEvent.press(screen.getByText("admin.wineries.sections.images"));
    expect(screen.getByText("admin.wineries.logo")).toBeTruthy();
    expect(screen.getByText("admin.wineries.cover")).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getAllByRole("button", { name: "media.choose" })[0]!);
    });
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "media.choose" }));
    });
    await pressAsync("common.saveChanges");

    expect(mockUpdate).toHaveBeenCalledWith({
      id: "winery-1",
      payload: expect.objectContaining({
        descriptionEn: "Andean winery",
        logoUrl: "https://cdn.vinnot.com/new-logo.png",
        imageUrl: "https://cdn.vinnot.com/new-cover.jpg",
        phone: "+5492614123456",
      }),
    });
  });

  it("keeps a winery landline without the Argentine mobile 9", async () => {
    render(<AdminWinerySheet visible editingWinery={{ ...winery, phone: "+542614123456" }} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText("admin.wineries.sections.contact"));
    expect(screen.getByRole("radio", { name: "contactPhone.lineLandline" })).toBeChecked();
    fireEvent.changeText(screen.getByLabelText("admin.wineries.phone"), "2614999999");
    await pressAsync("common.saveChanges");
    expect(mockUpdate).toHaveBeenCalledWith({ id: "winery-1", payload: expect.objectContaining({ phone: "+542614999999" }) });
  });

  it("lets a new phone be marked as a landline", async () => {
    render(<AdminWinerySheet visible editingWinery={{ ...winery, phone: null }} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText("admin.wineries.sections.contact"));
    fireEvent.press(screen.getByRole("radio", { name: "contactPhone.lineLandline" }));
    fireEvent.changeText(screen.getByLabelText("admin.wineries.phone"), "261 412 3456");
    await pressAsync("common.saveChanges");
    expect(mockUpdate).toHaveBeenCalledWith({ id: "winery-1", payload: expect.objectContaining({ phone: "+542614123456" }) });
  });

  it("fills the coordinates and the empty address from the geocoder and the map pin", async () => {
    mockGeocode.mockResolvedValue({
      ok: true,
      location: { latitude: -24.78, longitude: -65.41, formattedAddress: "Cafayate, Salta" },
    });
    render(<AdminWinerySheet visible editingWinery={{ ...winery, address: null }} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText("admin.wineries.sections.location"));
    fireEvent.changeText(screen.getByPlaceholderText("admin.wineries.locationSearchPlaceholder"), "Cafayate");
    await pressAsync("common.search");
    expect(mockGeocode).toHaveBeenCalledWith("Cafayate");
    expect(screen.getByLabelText("admin.wineries.address").props.value).toBe("Cafayate, Salta");
    await pressAsync("common.saveChanges");
    expect(mockUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ latitude: -24.78, longitude: -65.41, address: "Cafayate, Salta" }),
      }),
    );

    fireEvent.press(screen.getByRole("button", { name: "map-pin" }));
    await pressAsync("common.saveChanges");
    expect(mockUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ latitude: -32.9, longitude: -68.8 }) }),
    );
  });
});

describe("advanced coordinates", () => {
  it("keeps raw latitude and longitude behind the Avanzado toggle", async () => {
    render(<AdminWinerySheet visible editingWinery={winery} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText("admin.wineries.sections.location"));
    expect(screen.queryByLabelText("admin.wineries.latitude")).toBeNull();

    const toggle = screen.getByRole("button", { name: "admin.wineries.advanced" });
    expect(toggle.props.accessibilityState).toMatchObject({ expanded: false });
    fireEvent.press(toggle);
    expect(screen.getByLabelText("admin.wineries.latitude").props.value).toBe("-33.3712");
    fireEvent.changeText(screen.getByLabelText("admin.wineries.latitude"), "-33,5");
    await pressAsync("common.saveChanges");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ latitude: -33.5, longitude: -69.1517 }) }),
    );
  });

  it("reopens the advanced coordinates to show an out-of-range latitude", async () => {
    render(<AdminWinerySheet visible editingWinery={winery} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText("admin.wineries.sections.location"));
    fireEvent.press(screen.getByRole("button", { name: "admin.wineries.advanced" }));
    fireEvent.changeText(screen.getByLabelText("admin.wineries.latitude"), "120");
    fireEvent.press(screen.getByRole("button", { name: "admin.wineries.advanced" }));
    expect(screen.queryByLabelText("admin.wineries.latitude")).toBeNull();

    await pressAsync("common.saveChanges");
    expect(screen.getByLabelText("admin.wineries.latitude")).toBeTruthy();
    expect(screen.getByText("admin.wineries.validation.latitudeInvalid")).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("dismiss guard", () => {
  it("asks before a swipe throws away an edited winery and re-opens it on keep editing", () => {
    const onClose = jest.fn();
    render(<AdminWinerySheet visible editingWinery={winery} onClose={onClose} />);
    fireEvent.changeText(screen.getByLabelText("admin.wineries.name"), "Bodega Norte Alta");

    act(() => mockSheet.props!.onDismiss());
    pressAlert("common.unsavedChanges.keepEditing");
    expect(onClose).not.toHaveBeenCalled();
    expect(mockPresent).toHaveBeenCalled();
    expect(screen.getByLabelText("admin.wineries.name").props.value).toBe("Bodega Norte Alta");

    fireEvent.press(screen.getByText("common.cancel"));
    pressAlert("common.unsavedChanges.discard");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes an untouched sheet directly and cannot be swiped away while saving", () => {
    const onClose = jest.fn();
    const { rerender } = render(<AdminWinerySheet visible editingWinery={winery} onClose={onClose} />);
    act(() => mockSheet.props!.onDismiss());
    expect(alert).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);

    mockPending.value = true;
    rerender(<AdminWinerySheet visible editingWinery={winery} onClose={onClose} />);
    expect(mockSheet.props!.enablePanDownToClose).toBe(false);
  });
});

describe("saving", () => {
  it("saves once when save is tapped twice while the first save is running", async () => {
    let finish: () => void = () => {};
    mockUpdate.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    render(<AdminWinerySheet visible editingWinery={winery} onClose={jest.fn()} />);
    const save = screen.getByText("common.saveChanges");
    await act(async () => {
      fireEvent.press(save);
      fireEvent.press(save);
    });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it("explains a duplicate winery with the backend error code", async () => {
    mockUpdate.mockRejectedValue({ code: "DUPLICATE_ENTRY" });
    const onClose = jest.fn();
    render(<AdminWinerySheet visible editingWinery={winery} onClose={onClose} />);
    await pressAsync("common.saveChanges");
    expect(mockShowError).toHaveBeenCalledWith("forms.errors.duplicate");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("falls back to the winery save error for an unknown failure", async () => {
    mockCreate.mockRejectedValue(new Error("boom"));
    render(<AdminWinerySheet visible onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText("admin.wineries.name"), "Bodega Sur");
    pick("admin.wineries.country", "admin.wineries.countrySearch", "chi", "Chile");
    await pressAsync("admin.wineries.createWinery");
    expect(mockShowError).toHaveBeenCalledWith("admin.wineries.saveError");
  });
});


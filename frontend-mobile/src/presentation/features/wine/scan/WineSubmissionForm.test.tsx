import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { WineSubmissionResult } from "@/domain/wine/wine.types";
import { WineSubmissionForm } from "./WineSubmissionForm";

const mockSubmit = jest.fn();
const mockRelease = jest.fn();
const mockRetain = jest.fn(() => mockRelease);
const mockError = jest.fn();
const mockSuccess = jest.fn();

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/hooks/queries/wine/useWines", () => ({
  useSubmitWine: () => ({ mutateAsync: mockSubmit, isPending: false }),
}));
const mockCountries = [
  { id: "ar", name: "Argentina" },
  { id: "cl", name: "Chile" },
];
const mockCatalog = jest.fn((country: { id: string | null; name: string }, winerySearch: string) => {
  const { linkChoice } = jest.requireActual<typeof import("@/domain/wine/catalogChoice")>("@/domain/wine/catalogChoice");
  const linked = linkChoice(country, mockCountries);
  return {
    countries: mockCountries,
    country: linked,
    regions: linked.id === "ar" ? [{ id: "mza", name: "Mendoza" }] : [],
    grapes: [
      { id: "malbec", name: "Malbec" },
      { id: "torrontes", name: "Torrontes" },
    ],
    wineries: winerySearch.toLowerCase().includes("catena") ? [{ id: "catena", name: "Catena Zapata" }] : [],
    wineriesLoading: false,
  };
});
jest.mock("./useWineSubmissionCatalog", () => ({
  useWineSubmissionCatalog: (country: { id: string | null; name: string }, winerySearch: string) =>
    mockCatalog(country, winerySearch),
}));
jest.mock("@/presentation/providers/WineLabelCameraProvider", () => ({
  useWineLabelCamera: () => ({ retainImage: mockRetain }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockError, showSuccess: mockSuccess }),
}));
jest.mock("@/presentation/components/ui/Button", () => {
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    Button: ({ onPress, children }: { onPress: () => void; children: string }) => (
      <Pressable onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    ),
  };
});
jest.mock("@/presentation/components/ui/TextField", () => {
  const { TextInput } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    TextField: ({
      label,
      value,
      onChangeText,
      onBlur,
    }: {
      label: string;
      value: string;
      onChangeText: (value: string) => void;
      onBlur?: () => void;
    }) => <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} onBlur={onBlur} />,
  };
});

describe("WineSubmissionForm image lifetime", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(["APPROVED", "REJECTED"] as const)(
    "retains the image through a %s response, including unmount",
    async (status) => {
      let complete!: (value: WineSubmissionResult) => void;
      mockSubmit.mockImplementation(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      );
      const onComplete = jest.fn();
      const screen = render(
        <WineSubmissionForm
          imageUri="file:///capture.jpg"
          extractedData={null}
          onCancel={jest.fn()}
          onComplete={onComplete}
        />,
      );
      fireEvent.changeText(screen.getByLabelText("scan.submissionForm.wineName"), " New wine ");
      fireEvent.changeText(screen.getByLabelText("scan.submissionForm.wineryName"), " Winery ");
      fireEvent.press(screen.getByText("scan.submissionForm.submit"));
      await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUri: "file:///capture.jpg",
          wineName: "New wine",
          wineryName: "Winery",
        }),
      );
      screen.unmount();
      expect(mockRetain).toHaveBeenCalledWith("file:///capture.jpg");
      expect(mockRelease).not.toHaveBeenCalled();
      const result: WineSubmissionResult = {
        submissionId: "submission",
        status,
        message: "Reviewed",
        wine: null,
      };
      await act(async () => complete(result));
      expect(mockRelease).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(result);
      expect(status === "REJECTED" ? mockError : mockSuccess)
        .toHaveBeenCalledWith(`scan.submissionForm.result.${status}`);
      expect(mockSuccess).not.toHaveBeenCalledWith("Reviewed");
      expect(mockError).not.toHaveBeenCalledWith("Reviewed");
    },
  );

  it("releases the lease on upload failure without claiming completion", async () => {
    mockSubmit.mockRejectedValueOnce(new Error("offline"));
    const onComplete = jest.fn();
    const screen = render(
      <WineSubmissionForm
        imageUri="file:///capture.jpg"
        extractedData={null}
        onCancel={jest.fn()}
        onComplete={onComplete}
      />,
    );
    fireEvent.changeText(screen.getByLabelText("scan.submissionForm.wineName"), "Wine");
    fireEvent.changeText(screen.getByLabelText("scan.submissionForm.wineryName"), "Winery");
    fireEvent.press(screen.getByText("scan.submissionForm.submit"));
    await waitFor(() => expect(mockRelease).toHaveBeenCalledTimes(1));
    expect(mockError).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });
});


beforeEach(() => jest.clearAllMocks());

it.each(["13,6", "13.6"])("submits decimal alcohol %s without truncation", async (alcohol) => {
  mockSubmit.mockResolvedValueOnce({ submissionId: "submission", status: "APPROVED", message: "Created", wine: null });
  const view = render(<WineSubmissionForm imageUri="file:///capture.jpg" extractedData={null} onCancel={jest.fn()} onComplete={jest.fn()} />);
  fireEvent.changeText(view.getByLabelText("scan.submissionForm.wineName"), "Wine");
  fireEvent.changeText(view.getByLabelText("scan.submissionForm.wineryName"), "Winery");
  fireEvent.changeText(view.getByLabelText("scan.submissionForm.alcoholContent"), alcohol);
  fireEvent.press(view.getByText("scan.submissionForm.submit"));
  await waitFor(() => expect(mockSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ alcoholContent: 13.6 })));
});

describe("WineSubmissionForm catalog selectors", () => {
  const renderForm = (extractedData: Parameters<typeof WineSubmissionForm>[0]["extractedData"] = null) =>
    render(
      <WineSubmissionForm imageUri="file:///capture.jpg" extractedData={extractedData} onCancel={jest.fn()} onComplete={jest.fn()} />,
    );
  const submitted = async () => {
    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    return mockSubmit.mock.calls.at(-1)?.[0];
  };

  beforeEach(() => {
    mockSubmit.mockResolvedValue({ submissionId: "s", status: "NEEDS_REVIEW", message: "Queued", wine: null });
  });

  it("picks a catalog country with search and offers only that country's regions", async () => {
    const view = renderForm();
    fireEvent.changeText(view.getByLabelText("scan.submissionForm.wineName"), "Wine");
    fireEvent.changeText(view.getByLabelText("scan.submissionForm.country"), "arg");
    expect(view.queryByLabelText("scan.submissionForm.catalog.select")).toBeTruthy();
    fireEvent.press(view.getByText("Argentina"));
    expect(mockCatalog).toHaveBeenLastCalledWith({ id: "ar", name: "Argentina" }, expect.any(String));
    fireEvent.changeText(view.getByLabelText("scan.submissionForm.region"), "men");
    fireEvent.press(view.getByText("Mendoza"));
    fireEvent.changeText(view.getByLabelText("scan.submissionForm.wineryName"), "Bodega Nueva");
    fireEvent.press(view.getByText("scan.submissionForm.submit"));

    expect(await submitted()).toEqual(
      expect.objectContaining({ country: "Argentina", countryId: "ar", region: "Mendoza", regionId: "mza" }),
    );
  });

  it("suggests catalog wineries while typing and sends the picked one", async () => {
    const view = renderForm();
    fireEvent.changeText(view.getByLabelText("scan.submissionForm.wineName"), "Wine");
    fireEvent.changeText(view.getByLabelText("scan.submissionForm.wineryName"), "catena");
    expect(mockCatalog).toHaveBeenLastCalledWith(expect.anything(), "catena");
    fireEvent.press(view.getByText("Catena Zapata"));
    fireEvent.press(view.getByText("scan.submissionForm.submit"));

    expect(await submitted()).toEqual(expect.objectContaining({ wineryName: "Catena Zapata", wineryId: "catena" }));
  });

  it("adds catalog grapes and proposes a grape that is not in the list", async () => {
    const view = renderForm();
    fireEvent.changeText(view.getByLabelText("scan.submissionForm.wineName"), "Wine");
    fireEvent.changeText(view.getByLabelText("scan.submissionForm.wineryName"), "Bodega Nueva");
    fireEvent.changeText(view.getByLabelText("scan.submissionForm.grapes"), "malb");
    fireEvent.press(view.getByText("Malbec"));
    fireEvent.changeText(view.getByLabelText("scan.submissionForm.grapes"), "Uva Criolla");
    fireEvent.press(view.getByText("scan.submissionForm.catalog.addGrape"));
    expect(view.getByText("scan.submissionForm.catalog.proposedGrape ×")).toBeTruthy();
    fireEvent.press(view.getByText("scan.submissionForm.submit"));

    expect(await submitted()).toEqual(expect.objectContaining({ grapes: ["Malbec", "Uva Criolla"] }));
  });

  it("keeps a value that is not in the list as a proposal without a catalog id", async () => {
    const view = renderForm();
    fireEvent.changeText(view.getByLabelText("scan.submissionForm.wineName"), "Wine");
    fireEvent.changeText(view.getByLabelText("scan.submissionForm.wineryName"), "Bodega Nueva");
    fireEvent(view.getByLabelText("scan.submissionForm.wineryName"), "blur");
    fireEvent.changeText(view.getByLabelText("scan.submissionForm.country"), "Narnia");
    fireEvent.press(view.getByText("scan.submissionForm.catalog.notInList"));
    expect(view.getAllByText("scan.submissionForm.catalog.newValue").length).toBeGreaterThan(0);
    fireEvent.press(view.getByText("scan.submissionForm.submit"));

    const input = await submitted();
    expect(input).toEqual(expect.objectContaining({ wineryName: "Bodega Nueva", country: "Narnia" }));
    expect(input.wineryId).toBeUndefined();
    expect(input.countryId).toBeUndefined();
  });

  it("links label prefill to the catalog ignoring case and accents and keeps unknown values as proposals", async () => {
    const view = renderForm({
      wineryName: "CATENA zapata",
      wineName: "Malbec Argentino",
      grapeVariety: "malbec, Uva Criolla",
      vintage: 2020,
      wineType: "RED",
      region: "Valle Oculto",
      country: " argentína ",
      alcoholContent: null,
      confidence: 0.9,
      searchKeywords: null,
      visualDescription: null,
    });
    await waitFor(() => expect(view.getByDisplayValue("Argentina")).toBeTruthy());
    await waitFor(() => expect(view.getByDisplayValue("Catena Zapata")).toBeTruthy());
    fireEvent.press(view.getByText("scan.submissionForm.submit"));

    const input = await submitted();
    expect(input).toEqual(
      expect.objectContaining({
        wineryName: "Catena Zapata",
        wineryId: "catena",
        country: "Argentina",
        countryId: "ar",
        region: "Valle Oculto",
        grapes: ["Malbec", "Uva Criolla"],
      }),
    );
    expect(input.regionId).toBeUndefined();
  });
});

it("sends a wine without a photo and tells the person a moderator will check it", async () => {
  mockSubmit.mockResolvedValueOnce({ submissionId: "s", status: "NEEDS_REVIEW", message: "", wine: null });
  const view = render(
    <WineSubmissionForm imageUri={null} extractedData={null} onCancel={jest.fn()} onComplete={jest.fn()} />,
  );

  expect(view.getByText("scan.submissionForm.noPhotoNotice")).toBeTruthy();
  expect(view.getByText("scan.submissionForm.descriptionNoPhoto")).toBeTruthy();
  expect(view.queryByText("scan.submissionForm.description")).toBeNull();
  fireEvent.changeText(view.getByLabelText("scan.submissionForm.wineName"), "New wine");
  fireEvent.changeText(view.getByLabelText("scan.submissionForm.wineryName"), "Winery");
  fireEvent.press(view.getByText("scan.submissionForm.submit"));

  await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ imageUri: null })));
  expect(mockRetain).not.toHaveBeenCalledWith(null);
});

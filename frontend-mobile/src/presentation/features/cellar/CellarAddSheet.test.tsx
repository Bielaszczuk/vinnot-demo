import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { WineSummary } from "@/domain/wine/wine.types";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ratePour } from "@/test/fixtures/pourRating";
import { CellarAddSheet as Sheet } from "./CellarAddSheet";

// The pour control needs a gesture root, as under the app providers.
const CellarAddSheet = (props: React.ComponentProps<typeof Sheet>) => (
  <GestureHandlerRootView><Sheet {...props} /></GestureHandlerRootView>
);

const mockAdd = jest.fn();
const mockUpdate = jest.fn();
const mockShowError = jest.fn();
const mockCellar = jest.fn();
const wine = (id: string) => ({ id, name: `Wine ${id}`, winery: "Bodega", type: "red", vintage: null,
  imageUrl: null }) as unknown as WineSummary;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { year?: number }) => (options?.year ? `${key}:${options.year}` : key),
  }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: mockShowError }),
}));
jest.mock("@/presentation/hooks/ui", () => ({
  useDebounce: (value: string) => value,
  useHaptics: () => ({ selection: jest.fn(), impact: jest.fn(), notification: jest.fn() }),
}));
jest.mock("@/presentation/hooks/queries/wine/useWines", () => ({
  useWines: (filter?: { search?: string }) => ({
    data: filter?.search ? { items: [wine("owned"), wine("new")] } : undefined,
  }),
}));
jest.mock("@/presentation/hooks/queries/cellar", () => ({
  useCellar: (options?: { enabled?: boolean }) => mockCellar(options),
  useAddCellarEntry: () => ({ mutate: mockAdd, isPending: false }),
  useUpdateCellarEntry: () => ({ mutate: mockUpdate, isPending: false }),
}));
jest.mock("@/presentation/features/wine/WineImage", () => ({ WineImage: () => null }));
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  const Modal = mockReact.forwardRef(({ children }: { children: React.ReactNode }, ref) => {
    mockReact.useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn() }));
    return mockReact.createElement(View, null, children);
  });
  return {
    BottomSheetModal: Modal,
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: React.ReactNode }) =>
      mockReact.createElement(View, null, children),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCellar.mockReturnValue({ data: [{ id: "entry-1", wine: { id: "owned" } }] });
});

function openAndSearch() {
  const view = render(<CellarAddSheet visible onClose={jest.fn()} />);
  fireEvent.changeText(view.getByPlaceholderText("cellar.searchWinePlaceholder"), "malbec");
  return view;
}

it("marks a wine already in the cellar and does not let it be picked", async () => {
  const view = openAndSearch();

  expect(mockCellar).toHaveBeenCalledWith({ enabled: true });
  expect(view.getAllByText("cellar.alreadyInCellar")).toHaveLength(1);
  const owned = view.getByLabelText("Wine owned");
  expect(owned.props.accessibilityState).toMatchObject({ disabled: true });
  fireEvent.press(owned);
  fireEvent.press(view.getByText("common.save"));

  await waitFor(() => expect(mockShowError).toHaveBeenCalledWith("cellar.selectWineError"));
  expect(mockAdd).not.toHaveBeenCalled();
});

it("still adds a wine that is not in the cellar", async () => {
  const view = openAndSearch();

  fireEvent.press(view.getByLabelText("Wine new"));
  fireEvent.press(view.getByText("common.save"));

  await waitFor(() => expect(mockAdd).toHaveBeenCalledWith(
    { wineId: "new", rating: null, purchasePrice: null, notes: null },
    expect.any(Object),
  ));
});

it("does not read the cellar when editing an entry", () => {
  render(<CellarAddSheet visible onClose={jest.fn()} entry={{ id: "entry-1", wine: wine("owned") } as never} />);

  expect(mockCellar).toHaveBeenCalledWith({ enabled: false });
});

it("adds the wine with the tasted vintage, suggesting the catalog vintage first", async () => {
  const view = render(<CellarAddSheet visible onClose={jest.fn()} initialWine={{ ...wine("new"), vintage: 2019 }} />);

  const vintageField = () => view.getByLabelText("vintage.label");
  fireEvent(vintageField(), "focus");
  fireEvent.press(view.getByLabelText("vintage.selectSuggested:2019"));
  expect(vintageField().props.accessibilityValue).toEqual({ text: "2019, vintage.suggested" });
  fireEvent.press(view.getByText("common.save"));

  await waitFor(() => expect(mockAdd).toHaveBeenCalledWith(
    expect.objectContaining({ wineId: "new", vintage: 2019 }), expect.any(Object)));
});

it("prefills a new entry with the vintage read on the scanned label", async () => {
  const view = render(
    <CellarAddSheet visible onClose={jest.fn()} initialWine={{ ...wine("new"), vintage: 2019 }} initialVintage={2017} />,
  );

  expect(view.getByLabelText("vintage.label").props.accessibilityValue).toEqual({ text: "2017" });
  fireEvent.press(view.getByText("common.save"));

  await waitFor(() => expect(mockAdd).toHaveBeenCalledWith(
    expect.objectContaining({ wineId: "new", vintage: 2017 }), expect.any(Object)));
});

it("keeps the stored vintage of an edited entry over a scanned one", async () => {
  const entry = { id: "entry-1", wine: wine("owned"), rating: 3, purchasePrice: null, notes: null, vintage: 2018 };
  const view = render(<CellarAddSheet visible onClose={jest.fn()} entry={entry as never} initialVintage={2017} />);

  expect(view.getByLabelText("vintage.label").props.accessibilityValue).toEqual({ text: "2018" });
  fireEvent.press(view.getByText("common.save"));

  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(mockUpdate.mock.calls[0]?.[0].updates.vintage).toBeUndefined();
});

it("clears the vintage of an edited note", async () => {
  const entry = { id: "entry-1", wine: wine("owned"), rating: 4, purchasePrice: null, notes: "Nota", vintage: 2018 };
  const view = render(<CellarAddSheet visible onClose={jest.fn()} entry={entry as never} />);

  fireEvent(view.getByLabelText("vintage.label"), "focus");
  fireEvent.press(view.getByLabelText("vintage.none"));
  fireEvent.press(view.getByText("common.save"));

  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(
    { id: "entry-1", updates: { rating: 4, purchasePrice: null, notes: "Nota", vintage: null } },
    expect.any(Object),
  ));
});

it("keeps the stored vintage when an edit does not touch it", async () => {
  const entry = { id: "entry-1", wine: wine("owned"), rating: 3, purchasePrice: null, notes: null, vintage: 2018 };
  const view = render(<CellarAddSheet visible onClose={jest.fn()} entry={entry as never} />);

  expect(view.getByLabelText("vintage.label").props.accessibilityValue).toEqual({ text: "2018" });
  fireEvent.press(view.getByText("common.save"));

  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(mockUpdate.mock.calls[0]?.[0].updates.vintage).toBeUndefined();
});

describe("purchase price in the app locale", () => {
  const renderWithWine = () =>
    render(<CellarAddSheet visible onClose={jest.fn()} initialWine={wine("new")} />);

  it.each([
    ["12,50", 12.5],
    ["1.500", 1500],
    ["1.500,75", 1500.75],
  ])("sends %s as %d", async (typed, expected) => {
    const view = renderWithWine();
    fireEvent.changeText(view.getByLabelText("cellar.purchasePrice"), typed);
    fireEvent.press(view.getByText("common.save"));

    await waitFor(() => expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ wineId: "new", purchasePrice: expected }), expect.any(Object)));
  });

  it("shows a field error and never sends an ambiguous price", async () => {
    const view = renderWithWine();
    fireEvent.changeText(view.getByLabelText("cellar.purchasePrice"), "12.5");
    fireEvent.press(view.getByText("common.save"));

    expect(await view.findByText("cellar.purchasePriceInvalid")).toBeTruthy();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("shows a stored price with the locale decimal comma when editing", async () => {
    const entry = { id: "entry-1", wine: wine("owned"), rating: 4, purchasePrice: 12.5, notes: null, vintage: null };
    const view = render(<CellarAddSheet visible onClose={jest.fn()} entry={entry as never} />);

    expect(view.getByLabelText("cellar.purchasePrice").props.value).toBe("12,5");
    fireEvent.press(view.getByText("common.save"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ updates: expect.objectContaining({ purchasePrice: 12.5 }) }), expect.any(Object)));
  });
});

it("keeps a decimal personal rating and lets the person clear it", async () => {
  const entry = { id: "entry-1", wine: wine("owned"), rating: 3.6, purchasePrice: null, notes: null, vintage: null };
  const view = render(<CellarAddSheet visible onClose={jest.fn()} entry={entry as never} />);
  expect(view.getByTestId("rating-pour-value")).toHaveTextContent(/^3[.,]6$/);
  fireEvent.press(view.getByText("common.save"));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(mockUpdate.mock.calls[0]?.[0].updates.rating).toBe(3.6);

  fireEvent.press(view.getByText("reviews.form.clearRating"));
  fireEvent.press(view.getByText("common.save"));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
  expect(mockUpdate.mock.calls[1]?.[0].updates.rating).toBeNull();
});

it("rates a new cellar wine with the pour control", async () => {
  const view = render(<CellarAddSheet visible onClose={jest.fn()} initialWine={wine("new")} />);
  await ratePour(view, 4.3, "md");
  fireEvent.press(view.getByText("common.save"));
  await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
  expect(mockAdd.mock.calls[0]?.[0].rating).toBe(4.3);
});

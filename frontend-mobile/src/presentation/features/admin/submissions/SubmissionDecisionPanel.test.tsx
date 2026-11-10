import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { AdminWineSubmission } from "@/domain/admin/admin.types";
import { SubmissionDecisionPanel } from "./SubmissionDecisionPanel";
import { useSubmissionDecisionForm } from "./useSubmissionDecisionForm";

const mockMutation = { mutateAsync: jest.fn(), isPending: false };
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockOnDecided = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) => (options?.name ? `${key}:${options.name}` : key),
  }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));
jest.mock("@/presentation/store/mutationAdapter", () => ({
  ...jest.requireActual("@/presentation/store/mutationAdapter"),
  useOperationMutation: () => mockMutation,
}));
jest.mock("@/presentation/hooks/ui", () => ({ useDebounce: (value: string) => value }));
jest.mock("@/presentation/hooks/queries/wine/useGrapeTypes", () => ({
  useGrapeTypes: () => ({ data: [{ name: "Malbec" }, { name: "Cabernet Franc" }], isLoading: false }),
}));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminWineSearch: (search: string) => ({
    currentData: {
      items: search.trim().length >= 2
        ? [{ id: "wine-1", name: "Malbec Reserva", wineryName: "Catena", vintage: 2019 }]
        : [],
    },
    isFetching: false,
  }),
  useAdminWinerySearch: (search: string) => ({
    currentData: { items: search.trim().length >= 2 ? [{ id: "w1", name: "Catena Zapata" }] : [] },
    isFetching: false,
  }),
  useAdminCountries: () => ({ data: [{ id: "ar", code: "AR", name: "Argentina" }], isLoading: false }),
  useAdminRegions: (countryId?: string) => ({
    data: countryId === "ar" ? [{ id: "mza", name: "Mendoza" }] : [],
    isFetching: false,
  }),
}));
jest.mock("@/presentation/components/ui/TextField", () => {
  const { TextInput } = jest.requireActual("react-native");
  return {
    TextField: ({ label, accessibilityLabel, error, ...props }: Record<string, unknown>) => {
      const { Text, View } = jest.requireActual("react-native");
      return (
        <View>
          <TextInput accessibilityLabel={(label ?? accessibilityLabel) as string} {...props} />
          {!!error && <Text>{error as string}</Text>}
        </View>
      );
    },
  };
});

const submission = {
  id: "s1", wineName: "Reserva", wineryName: "Winery", status: "NEEDS_REVIEW", grapes: [],
  countryId: null, regionId: null,
} as unknown as AdminWineSubmission;

function Harness() {
  const form = useSubmissionDecisionForm({ submissionId: "s1", onDecided: mockOnDecided });
  return <SubmissionDecisionPanel form={form} submission={submission} />;
}

const UNCHANGED = {
  targetWineId: undefined, wineName: undefined, wineryName: undefined, wineType: undefined,
  vintage: undefined, alcoholContent: undefined, country: undefined, region: undefined, grapes: undefined,
};

const decide = (decision: string) => fireEvent.press(screen.getByLabelText(`admin.submissions.decision.${decision}`));
const confirm = async (decision: string) => {
  await act(async () => {
    fireEvent.press(screen.getByText(`admin.submissions.confirm.${decision}`));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMutation.isPending = false;
  mockMutation.mutateAsync.mockResolvedValue(undefined);
});

it("keeps the previous payload of an approval with its preset reason", async () => {
  render(<Harness />);
  await confirm("APPROVE_NEW");
  expect(mockMutation.mutateAsync).toHaveBeenCalledWith({
    id: "s1",
    payload: {
      decision: "APPROVE_NEW",
      reason: "admin.submissions.reasons.VERIFIED_LABEL",
      targetWineId: undefined,
      wineName: undefined,
      wineryName: undefined,
      wineType: undefined,
      vintage: undefined,
      alcoholContent: undefined,
      country: undefined,
      region: undefined,
      grapes: undefined,
    },
  });
  expect(mockShowSuccess).toHaveBeenCalledWith("admin.submissions.decisionSaved");
  expect(mockOnDecided).toHaveBeenCalledTimes(1);
});

it("names the confirm button after the chosen decision", () => {
  render(<Harness />);
  expect(screen.getByText("admin.submissions.confirm.APPROVE_NEW")).toBeTruthy();
  decide("REJECT");
  expect(screen.getByText("admin.submissions.confirm.REJECT")).toBeTruthy();
  expect(screen.queryByText("admin.submissions.confirm.APPROVE_NEW")).toBeNull();
  expect(screen.queryByText("common.save")).toBeNull();
});

it("offers presets per decision and a free note, up to 500 characters, only under Other", async () => {
  render(<Harness />);
  expect(screen.getByLabelText("admin.submissions.reasons.VERIFIED_LABEL")).toBeTruthy();
  expect(screen.queryByLabelText("admin.submissions.reasonNote")).toBeNull();
  decide("REJECT");
  expect(screen.getByLabelText("admin.submissions.reasons.NOT_A_WINE")).toBeTruthy();
  expect(screen.queryByLabelText("admin.submissions.reasons.VERIFIED_LABEL")).toBeNull();
  fireEvent.press(screen.getByLabelText("admin.submissions.reasons.OTHER"));
  const note = screen.getByLabelText("admin.submissions.reasonNote");
  expect(note.props.maxLength).toBe(500);
  await confirm("REJECT");
  expect(mockMutation.mutateAsync).not.toHaveBeenCalled();
  expect(screen.getByText("admin.submissions.validation.reasonRequired")).toBeTruthy();
  fireEvent.changeText(note, " Foto de otra bodega ");
  await confirm("REJECT");
  expect(mockMutation.mutateAsync).toHaveBeenCalledWith({
    id: "s1",
    payload: { decision: "REJECT", reason: "Foto de otra bodega", ...UNCHANGED },
  });
});

it("picks the wine to merge with from the catalog instead of typing its id", async () => {
  render(<Harness />);
  decide("MERGE_EXISTING");
  expect(screen.queryByLabelText("admin.submissions.targetWinePlaceholder")).toBeNull();
  await confirm("MERGE_EXISTING");
  expect(mockMutation.mutateAsync).not.toHaveBeenCalled();
  expect(screen.getByText("admin.submissions.validation.targetWineRequired")).toBeTruthy();
  fireEvent.press(screen.getByRole("combobox", { name: "admin.submissions.targetWine" }));
  fireEvent.changeText(screen.getByLabelText("admin.submissions.targetWineSearch"), "Malb");
  fireEvent.press(screen.getByRole("button", { name: "Malbec Reserva" }));
  await confirm("MERGE_EXISTING");
  expect(mockMutation.mutateAsync).toHaveBeenCalledWith({
    id: "s1",
    payload: {
      decision: "MERGE_EXISTING",
      reason: "admin.submissions.reasons.ALREADY_IN_CATALOG",
      ...UNCHANGED,
      targetWineId: "wine-1",
    },
  });
});

it("corrects an approval with typed inputs and pickers", async () => {
  render(<Harness />);
  fireEvent.press(screen.getByText("admin.submissions.correctFields"));
  fireEvent.press(screen.getByLabelText("wines.types.red"));
  const vintage = screen.getByLabelText("admin.submissions.fields.vintage");
  expect(vintage.props.keyboardType).toBe("number-pad");
  fireEvent.changeText(vintage, "20x9");
  fireEvent.changeText(screen.getByLabelText("admin.submissions.fields.alcoholContent"), "13,5");
  await confirm("APPROVE_NEW");
  expect(mockMutation.mutateAsync).not.toHaveBeenCalled();
  expect(screen.getByText("admin.submissions.validation.vintageInvalid")).toBeTruthy();
  fireEvent.changeText(vintage, "2019");

  fireEvent.press(screen.getByRole("combobox", { name: "admin.submissions.fields.country" }));
  fireEvent.press(screen.getByRole("button", { name: "Argentina" }));
  fireEvent.press(screen.getByRole("combobox", { name: "admin.submissions.fields.region" }));
  fireEvent.press(screen.getByRole("button", { name: "Mendoza" }));
  fireEvent.press(screen.getByRole("combobox", { name: "admin.submissions.fields.wineryName" }));
  fireEvent.changeText(screen.getByLabelText("admin.submissions.winerySearch"), "Bodega Nueva");
  fireEvent.press(screen.getByRole("button", { name: "admin.submissions.useValue:Bodega Nueva" }));
  fireEvent.press(screen.getByRole("combobox", { name: "admin.wines.grapes" }));
  fireEvent.press(screen.getByRole("checkbox", { name: "Malbec" }));

  await confirm("APPROVE_NEW");
  expect(mockMutation.mutateAsync).toHaveBeenCalledWith({
    id: "s1",
    payload: {
      ...UNCHANGED,
      decision: "APPROVE_NEW",
      reason: "admin.submissions.reasons.VERIFIED_LABEL",
      wineryName: "Bodega Nueva",
      wineType: "RED",
      vintage: 2019,
      alcoholContent: 13.5,
      country: "Argentina",
      region: "Mendoza",
      grapes: ["Malbec"],
    },
  });
});

it("sends one decision at a time and disables the form while saving", async () => {
  let finish!: () => void;
  mockMutation.mutateAsync.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  render(<Harness />);
  await act(async () => {
    fireEvent.press(screen.getByText("admin.submissions.confirm.APPROVE_NEW"));
    fireEvent.press(screen.getByText("admin.submissions.confirm.APPROVE_NEW"));
  });
  expect(mockMutation.mutateAsync).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("admin.submissions.decision.REJECT").props.accessibilityState).toMatchObject({ disabled: true });
  await act(async () => finish());
  expect(mockOnDecided).toHaveBeenCalledTimes(1);
});

it("explains a backend error code and keeps the decision for a retry", async () => {
  mockMutation.mutateAsync.mockRejectedValueOnce({ message: "gone", code: "NOT_FOUND" });
  mockMutation.mutateAsync.mockRejectedValueOnce(new Error("offline"));
  render(<Harness />);
  decide("REJECT");
  await confirm("REJECT");
  expect(mockShowError).toHaveBeenLastCalledWith("forms.errors.notFound");
  await confirm("REJECT");
  expect(mockShowError).toHaveBeenLastCalledWith("admin.submissions.decisionError");
  expect(screen.getByText("admin.submissions.confirm.REJECT")).toBeTruthy();
  expect(mockOnDecided).not.toHaveBeenCalled();
});

import { act, renderHook } from "@testing-library/react-native";
import { useAdminSubmissionsViewModel } from "./useAdminSubmissionsViewModel";

const mockMutation = { mutateAsync: jest.fn(), isPending: false };
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));
jest.mock("@/presentation/store/api", () => ({
  useTypedQuery: (input: { key?: string }) => ({
    currentData:
      input.key === "admin.submissions"
        ? { items: [{ id: "submission" }], totalItems: 21 }
        : { id: "submission", imageAvailable: false },
  }),
}));
jest.mock("@/presentation/store/mutationAdapter", () => ({
  ...jest.requireActual("@/presentation/store/mutationAdapter"),
  useOperationMutation: () => mockMutation,
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockMutation.isPending = false;
  mockMutation.mutateAsync.mockResolvedValue(undefined);
});

it("preserves the decision draft after failure and closes only after a successful retry", async () => {
  mockMutation.mutateAsync.mockRejectedValueOnce(new Error("unavailable"));
  const { result } = renderHook(() => useAdminSubmissionsViewModel());
  act(() => result.current.select("submission"));
  act(() => {
    result.current.decisionForm.chooseDecision("REJECT");
    result.current.decisionForm.form.setValue("reasonCode", "OTHER");
    result.current.decisionForm.form.setValue("reasonNote", " Invalid label ");
  });
  await act(async () => {
    await result.current.decisionForm.submit();
  });
  expect(mockShowError).toHaveBeenCalledWith("admin.submissions.decisionError");
  expect(result.current.selectedId).toBe("submission");
  expect(result.current.decisionForm.form.getValues("reasonNote")).toBe(" Invalid label ");
  expect(result.current.decisionForm.form.getValues("decision")).toBe("REJECT");
  expect(result.current.working).toBe(false);
  await act(async () => {
    await result.current.decisionForm.submit();
  });
  expect(mockMutation.mutateAsync).toHaveBeenLastCalledWith({
    id: "submission",
    payload: expect.objectContaining({ decision: "REJECT", reason: "Invalid label" }),
  });
  expect(result.current.selectedId).toBeNull();
});

it("starts each opened submission from a clean draft", () => {
  const { result } = renderHook(() => useAdminSubmissionsViewModel());
  act(() => result.current.select("submission"));
  act(() => result.current.decisionForm.chooseDecision("MERGE_EXISTING"));
  act(() => result.current.close());
  act(() => result.current.select("submission"));
  expect(result.current.decisionForm.form.getValues("decision")).toBe("APPROVE_NEW");
  expect(result.current.decisionForm.form.getValues("reasonCode")).toBe("VERIFIED_LABEL");
});

it("prevents duplicate decisions and closing during submission, then returns from an emptied last page", async () => {
  let complete!: () => void;
  mockMutation.mutateAsync.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  const { result } = renderHook(() => useAdminSubmissionsViewModel());
  act(() => {
    result.current.changeStatus("CHANGES_REQUESTED");
    result.current.setPage(1);
    result.current.select("submission");
  });
  let pending!: Promise<void>;
  await act(async () => {
    pending = result.current.decisionForm.submit();
    await result.current.decisionForm.submit();
    result.current.close();
  });
  expect(mockMutation.mutateAsync).toHaveBeenCalledTimes(1);
  expect(result.current.selectedId).toBe("submission");
  expect(result.current.working).toBe(true);
  await act(async () => {
    complete();
    await pending;
  });
  expect(result.current.selectedId).toBeNull();
  expect(result.current.page).toBe(0);
  expect(result.current.status).toBe("CHANGES_REQUESTED");
});

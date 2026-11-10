import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AdminUserActionSheet } from "./AdminUserActionSheet";
import type { AdminUser } from "@/domain/admin/admin.types";
const mockMutations = {
  updateRole: { mutate: jest.fn(), isPending: false },
  ban: { mutate: jest.fn(), isPending: false },
  unban: { mutate: jest.fn(), isPending: false },
  remove: { mutate: jest.fn(), isPending: false },
  update: { mutate: jest.fn(), isPending: false },
};
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminUserMutations: () => mockMutations,
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20 }),
}));
const user: AdminUser = {
  id: "user",
  username: "Example",
  email: "example@example.test",
  roles: ["ROLE_USER"],
  locked: false,
  createdAt: "2026-10-02T15:00:00Z",
  name: "Ana Pérez",
  firstName: "Ana",
  lastName: "Pérez",
  enabled: true,
  lockReason: null,
  lastLoginAt: null,
  points: 1372,
  badgeTier: "RESERVA",
};
const close = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  Object.values(mockMutations).forEach((mutation) => {
    mutation.isPending = false;
  });
});
const DETAIL = "admin.users.banReasonDetail";
const reasonChip = (code: string) =>
  screen.getByRole("radio", { name: `admin.users.banReasons.${code}` });

it("opens the ban step with SPAM preselected and bans with that code and no detail", () => {
  render(<AdminUserActionSheet visible user={user} onClose={close} />);
  fireEvent.press(screen.getByText("admin.users.ban"));
  expect(screen.getAllByRole("radio")).toHaveLength(6);
  expect(reasonChip("SPAM").props.accessibilityState).toMatchObject({ checked: true });
  expect(reasonChip("OTHER").props.accessibilityState).toMatchObject({ checked: false });
  expect(screen.getByText("admin.users.banReasonHelp")).toBeTruthy();
  expect(screen.queryByLabelText(DETAIL)).toBeNull();
  fireEvent.press(reasonChip("FRAUD"));
  expect(reasonChip("FRAUD").props.accessibilityState).toMatchObject({ checked: true });
  expect(screen.queryByLabelText(DETAIL)).toBeNull();
  fireEvent.press(screen.getByText("common.confirm"));
  expect(mockMutations.ban.mutate).toHaveBeenCalledWith(
    { userId: "user", reasonCode: "FRAUD" },
    expect.any(Object),
  );
});

it("reveals the detail only for Other, keeps it after failure and closes only after a successful retry", () => {
  render(<AdminUserActionSheet visible user={user} onClose={close} />);
  fireEvent.press(screen.getByText("admin.users.ban"));
  fireEvent.press(reasonChip("OTHER"));
  fireEvent.changeText(screen.getByLabelText(DETAIL), "Repeated chargebacks");
  fireEvent.press(screen.getByText("common.confirm"));
  expect(mockMutations.ban.mutate).toHaveBeenCalledWith(
    { userId: "user", reasonCode: "OTHER", note: "Repeated chargebacks" },
    expect.any(Object),
  );
  act(() => mockMutations.ban.mutate.mock.calls[0]![1].onError());
  expect(close).not.toHaveBeenCalled();
  expect(mockShowError).toHaveBeenCalledWith("admin.users.actionError");
  expect(screen.getByLabelText(DETAIL).props.value).toBe("Repeated chargebacks");
  fireEvent.press(screen.getByText("common.confirm"));
  act(() => mockMutations.ban.mutate.mock.calls[1]![1].onSuccess());
  expect(close).toHaveBeenCalledTimes(1);
});

it("never sends a detail typed under Other once another reason is chosen", () => {
  render(<AdminUserActionSheet visible user={user} onClose={close} />);
  fireEvent.press(screen.getByText("admin.users.ban"));
  fireEvent.press(reasonChip("OTHER"));
  fireEvent.changeText(screen.getByLabelText(DETAIL), "internal");
  fireEvent.press(reasonChip("HARASSMENT"));
  expect(screen.queryByLabelText(DETAIL)).toBeNull();
  fireEvent.press(screen.getByText("common.confirm"));
  expect(mockMutations.ban.mutate).toHaveBeenCalledWith(
    { userId: "user", reasonCode: "HARASSMENT" },
    expect.any(Object),
  );
});

it("allows cancelling without banning, resets the reason and locks editing and dismissal during a ban", () => {
  const { rerender } = render(<AdminUserActionSheet visible user={user} onClose={close} />);
  fireEvent.press(screen.getByText("admin.users.ban"));
  fireEvent.press(reasonChip("OTHER"));
  fireEvent.press(screen.getByText("common.cancel"));
  expect(mockMutations.ban.mutate).not.toHaveBeenCalled();
  expect(screen.queryByRole("radio")).toBeNull();
  fireEvent.press(screen.getByText("admin.users.ban"));
  expect(reasonChip("SPAM").props.accessibilityState).toMatchObject({ checked: true });
  fireEvent.press(reasonChip("OTHER"));
  mockMutations.ban.isPending = true;
  rerender(<AdminUserActionSheet visible user={user} onClose={close} />);
  expect(screen.getByLabelText(DETAIL).props.editable).toBe(false);
  expect(reasonChip("SPAM").props.accessibilityState).toMatchObject({ disabled: true });
  fireEvent.press(reasonChip("SPAM"));
  expect(reasonChip("OTHER").props.accessibilityState).toMatchObject({ checked: true });
  screen.getAllByLabelText("common.close").forEach((button) => fireEvent.press(button));
  fireEvent.press(screen.getByLabelText("common.confirm"));
  fireEvent.press(screen.getByText("admin.users.saveRole"));
  expect(close).not.toHaveBeenCalled();
  expect(mockMutations.ban.mutate).not.toHaveBeenCalled();
  expect(mockMutations.updateRole.mutate).not.toHaveBeenCalled();
});
it("retains independent role, unban and deletion confirmations", () => {
  const { rerender } = render(<AdminUserActionSheet visible user={user} onClose={close} />);
  fireEvent.press(screen.getByText("roles.ROLE_PARTNER"));
  fireEvent.press(screen.getByText("admin.users.saveRole"));
  expect(mockMutations.updateRole.mutate).toHaveBeenCalledWith(
    { userId: "user", role: "ROLE_PARTNER" },
    expect.any(Object),
  );
  rerender(<AdminUserActionSheet visible user={{ ...user, locked: true }} onClose={close} />);
  fireEvent.press(screen.getByText("admin.users.unban"));
  expect(mockMutations.unban.mutate).not.toHaveBeenCalled();
  expect(screen.getByText("admin.users.notifiedByEmail")).toBeTruthy();
  fireEvent.press(screen.getByText("common.confirm"));
  expect(mockMutations.unban.mutate).toHaveBeenCalledWith("user", expect.any(Object));
  fireEvent.press(screen.getByText("common.cancel"));
  fireEvent.press(screen.getByText("admin.users.delete"));
  expect(mockMutations.remove.mutate).not.toHaveBeenCalled();
  expect(screen.getByText("admin.users.notifiedByEmail")).toBeTruthy();
  fireEvent.press(screen.getByText("common.confirm"));
  expect(mockMutations.remove.mutate).toHaveBeenCalledWith("user", expect.any(Object));
});
it("shows the user's tier and points so admins can spot abuse", () => {
  render(<AdminUserActionSheet visible user={user} onClose={close} />);
  expect(screen.getByRole("button", { name: "points.badgeLabel" })).toBeTruthy();
  expect(screen.getByText("points.tierAndPoints")).toBeTruthy();
});

it("edits the account names and sends both together, keeping the sheet open on failure", () => {
  render(<AdminUserActionSheet visible user={user} onClose={close} />);
  const save = screen.getByRole("button", { name: "admin.users.saveAccount" });
  expect(save.props.accessibilityState).toMatchObject({ disabled: true });
  expect(screen.getByLabelText("admin.users.firstName").props.value).toBe("Ana");
  fireEvent.changeText(screen.getByLabelText("admin.users.firstName"), " Ana María ");
  fireEvent.press(screen.getByRole("button", { name: "admin.users.saveAccount" }));
  expect(mockMutations.update.mutate).toHaveBeenCalledWith(
    { userId: "user", update: { firstName: "Ana María", lastName: "Pérez" } },
    expect.any(Object),
  );
  act(() => mockMutations.update.mutate.mock.calls[0]![1].onError());
  expect(mockShowError).toHaveBeenCalledWith("admin.users.accountError");
  expect(close).not.toHaveBeenCalled();
  act(() => mockMutations.update.mutate.mock.calls[0]![1].onSuccess());
  expect(mockShowSuccess).toHaveBeenCalledWith("admin.users.accountUpdated");
});

it("explains a name that is too long and does not save it", () => {
  render(<AdminUserActionSheet visible user={user} onClose={close} />);
  fireEvent.changeText(screen.getByLabelText("admin.users.lastName"), "x".repeat(101));
  fireEvent.press(screen.getByRole("button", { name: "admin.users.saveAccount" }));
  expect(screen.getByText("admin.users.nameTooLong")).toBeTruthy();
  expect(mockMutations.update.mutate).not.toHaveBeenCalled();
});

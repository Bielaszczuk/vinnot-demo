import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { EditProfileSheet } from "./EditProfileSheet";
import type { User } from "@/domain/user/user.types";

const mockMutate = jest.fn();
jest.mock("@/presentation/hooks/queries/user", () => ({
  useUpdateProfile: () => ({ mutate: mockMutate, isPending: false }),
}));
jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => ({ syncUser: jest.fn() }) }));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number; max?: number }) =>
      options?.max !== undefined ? `${options.count}/${options.max}` : key,
  }),
}));
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual("react");
  return {
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: ReactNode }) => children,
    BottomSheetModal: forwardRef(({ children }: { children: ReactNode }, ref: unknown) => {
      useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn() }));
      return children;
    }),
  };
});

const user = {
  id: "u-1",
  username: "ana",
  email: "ana@vinnot.com",
  firstName: "Ana",
  lastName: "Pérez",
  name: "Ana Pérez",
  phoneNumber: null,
  bio: "Malbec",
  cellarVisibility: "PUBLIC",
} as User;

function renderSheet(value: User = user) {
  return render(<EditProfileSheet visible user={value} onClose={jest.fn()} onUpdated={jest.fn()} />);
}

beforeEach(() => jest.clearAllMocks());

it("still saves the names and the phone as before", async () => {
  renderSheet({ ...user, bio: null, cellarVisibility: undefined });
  fireEvent.press(screen.getByText("common.save"));
  await waitFor(() => expect(mockMutate).toHaveBeenCalled());
  expect(mockMutate.mock.calls[0][0]).toMatchObject({
    username: "ana",
    firstName: "Ana",
    lastName: "Pérez",
    phoneNumber: "",
  });
});

it("edits the bio with a 160 character counter and sends it to PATCH /users/me", async () => {
  renderSheet();
  expect(screen.getByText("6/160")).toBeTruthy();
  const bio = screen.getByDisplayValue("Malbec");
  expect(bio.props.maxLength).toBe(160);
  fireEvent.changeText(bio, "Malbec y montaña");
  expect(screen.getByText("16/160")).toBeTruthy();
  fireEvent.press(screen.getByText("common.save"));
  await waitFor(() => expect(mockMutate).toHaveBeenCalled());
  expect(mockMutate.mock.calls[0][0]).toMatchObject({ bio: "Malbec y montaña", cellarVisibility: "PUBLIC" });
});

it("chooses who sees the cellar with one tap", async () => {
  renderSheet();
  expect(screen.getByText("social.visibility.PUBLIC")).toBeTruthy();
  expect(screen.getByText("social.visibility.PRIVATE")).toBeTruthy();
  fireEvent.press(screen.getByText("social.visibility.FOLLOWERS"));
  fireEvent.press(screen.getByText("common.save"));
  await waitFor(() => expect(mockMutate).toHaveBeenCalled());
  expect(mockMutate.mock.calls[0][0]).toMatchObject({ cellarVisibility: "FOLLOWERS" });
});

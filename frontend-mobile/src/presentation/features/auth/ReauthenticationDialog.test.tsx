import { fireEvent, render } from "@testing-library/react-native";
import { ReauthenticationHost, ReauthenticationProvider } from "./ReauthenticationDialog";
import { router } from "expo-router";
import { Modal, Pressable as MockPressable, Text as MockText } from "react-native";

const mockChallenge = {
  open: true,
  busy: false,
  failed: false,
  busyProvider: null as string | null,
  failedProvider: null as string | null,
  providers: [] as string[],
  cancel: jest.fn(),
  confirm: jest.fn(),
  confirmWithProvider: jest.fn(),
};
jest.mock("@/presentation/hooks/useReauthentication", () => ({
  useReauthentication: () => mockChallenge,
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/presentation/components/ui/Button", () => {
  return {
    Button: ({
      children,
      onPress,
      disabled,
    }: {
      children: string;
      onPress: () => void;
      disabled?: boolean;
    }) => (
      <MockPressable onPress={onPress} disabled={disabled}>
        <MockText>{children}</MockText>
      </MockPressable>
    ),
  };
});
beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockChallenge, {
    open: true, busy: false, failed: false, busyProvider: null, failedProvider: null, providers: [],
  });
});

it("confirms only the entered password and clears it when the dialog closes", () => {
  const view = render(<ReauthenticationProvider>{null}</ReauthenticationProvider>);
  const input = view.getByLabelText("reauthentication.password");
  expect(input.props.secureTextEntry).toBe(true);
  fireEvent.changeText(input, "password");
  fireEvent.press(view.getByText("reauthentication.confirm"));
  expect(mockChallenge.confirm).toHaveBeenCalledWith("password");
  mockChallenge.open = false;
  view.rerender(<ReauthenticationProvider>{null}</ReauthenticationProvider>);
  expect(view.queryByLabelText("reauthentication.password")).toBeNull();
  mockChallenge.open = true;
  view.rerender(<ReauthenticationProvider>{null}</ReauthenticationProvider>);
  expect(view.getByLabelText("reauthentication.password").props.value).toBe("");
});

it("keeps cancellation and recovery usable while showing a failure", () => {
  mockChallenge.failed = true;
  const view = render(<ReauthenticationProvider>{null}</ReauthenticationProvider>);
  expect(view.getByText("reauthentication.failed")).toBeTruthy();
  fireEvent.press(view.getByText("reauthentication.cancel"));
  expect(mockChallenge.cancel).toHaveBeenCalledTimes(1);
  fireEvent.press(view.getByText("reauthentication.recovery"));
  expect(mockChallenge.cancel).toHaveBeenCalledTimes(2);
  expect(router.push).toHaveBeenCalledWith("/(auth)/forgot-password");
  expect(mockChallenge.confirm).not.toHaveBeenCalled();
});

function NativeHost({ visible, onRecovery }: { visible: boolean; onRecovery: () => void }) {
  return (
    <ReauthenticationHost visible={visible} onRecovery={onRecovery}>
      {({ confirmation }) => <Modal visible={visible}>{confirmation}</Modal>}
    </ReauthenticationHost>
  );
}

it("keeps one challenge controller when a native host closes and restores the root dialog", () => {
  const onRecovery = jest.fn();
  const content = (visible: boolean) => (
    <ReauthenticationProvider>
      <NativeHost visible={visible} onRecovery={onRecovery} />
    </ReauthenticationProvider>
  );
  const view = render(content(true));
  expect(view.UNSAFE_getAllByType(Modal).filter((modal) => modal.props.visible)).toHaveLength(1);
  fireEvent.changeText(view.getByLabelText("reauthentication.password"), "password");
  view.rerender(content(false));
  expect(view.UNSAFE_getAllByType(Modal).filter((modal) => modal.props.visible)).toHaveLength(1);
  expect(view.getByLabelText("reauthentication.password").props.value).toBe("");
  expect(mockChallenge.cancel).not.toHaveBeenCalled();
});

it("closes the active native host before navigating to password recovery", () => {
  const onRecovery = jest.fn();
  const view = render(
    <ReauthenticationProvider>
      <NativeHost visible onRecovery={onRecovery} />
    </ReauthenticationProvider>,
  );
  fireEvent.press(view.getByText("reauthentication.recovery"));
  expect(mockChallenge.cancel).toHaveBeenCalledTimes(1);
  expect(onRecovery).toHaveBeenCalledTimes(1);
  expect(onRecovery.mock.invocationCallOrder[0]).toBeLessThan(
    (router.push as jest.Mock).mock.invocationCallOrder[0]!,
  );
  expect(router.push).toHaveBeenCalledWith("/(auth)/forgot-password");
});

it("offers no provider button when the account has no linked identity", () => {
  const view = render(<ReauthenticationProvider>{null}</ReauthenticationProvider>);
  expect(view.queryByLabelText("Google")).toBeNull();
  expect(view.queryByLabelText("Apple")).toBeNull();
  expect(view.getByText("reauthentication.description")).toBeTruthy();
});

it("offers the linked providers next to the password form inside the active host", () => {
  mockChallenge.providers = ["GOOGLE", "APPLE"];
  mockChallenge.failedProvider = "GOOGLE";
  const view = render(
    <ReauthenticationProvider>
      <NativeHost visible onRecovery={jest.fn()} />
    </ReauthenticationProvider>,
  );
  expect(view.UNSAFE_getAllByType(Modal).filter((modal) => modal.props.visible)).toHaveLength(1);
  expect(view.getByText("reauthentication.descriptionWithProvider")).toBeTruthy();
  expect(view.getByText("reauthentication.providerFailed")).toBeTruthy();
  expect(view.getByLabelText("reauthentication.password")).toBeTruthy();
  fireEvent.press(view.getByLabelText("Google"));
  fireEvent.press(view.getByLabelText("Apple"));
  expect(mockChallenge.confirmWithProvider.mock.calls).toEqual([["GOOGLE"], ["APPLE"]]);
  expect(mockChallenge.confirm).not.toHaveBeenCalled();
});

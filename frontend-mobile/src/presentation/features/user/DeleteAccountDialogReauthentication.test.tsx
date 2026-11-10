import { render } from "@testing-library/react-native";
import { Modal } from "react-native";
import { ReauthenticationProvider } from "../auth/ReauthenticationDialog";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

const mockChallenge = {
  open: true, busy: false, failed: false, providers: [], cancel: jest.fn(), confirm: jest.fn(), confirmWithProvider: jest.fn(),
};
jest.mock("@/presentation/hooks/useReauthentication", () => ({ useReauthentication: () => mockChallenge }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const confirmation = {
  visible: true, text: "", phrase: "DELETE", setText: jest.fn(), busy: false, matches: false,
  open: jest.fn(), close: jest.fn(), submit: jest.fn(),
};

it("asks for the password inside the open delete dialog instead of stacking a second native modal", () => {
  const view = render(
    <ReauthenticationProvider>
      <DeleteAccountDialog confirmation={confirmation} />
    </ReauthenticationProvider>,
  );
  expect(view.UNSAFE_getAllByType(Modal).filter((modal) => modal.props.visible)).toHaveLength(1);
  expect(view.getByLabelText("reauthentication.password")).toBeTruthy();
});

it("leaves the password prompt to the root dialog when the delete dialog is closed", () => {
  const view = render(
    <ReauthenticationProvider>
      <DeleteAccountDialog confirmation={{ ...confirmation, visible: false }} />
    </ReauthenticationProvider>,
  );
  expect(view.UNSAFE_getAllByType(Modal).filter((modal) => modal.props.visible)).toHaveLength(1);
  expect(view.getByLabelText("reauthentication.password")).toBeTruthy();
});

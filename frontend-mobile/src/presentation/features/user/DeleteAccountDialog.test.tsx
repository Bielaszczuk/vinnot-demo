import { fireEvent, render, screen } from "@testing-library/react-native";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import en from "@/shared/i18n/locales/en-US.json";
import es from "@/shared/i18n/locales/es-AR.json";
let mockLocale = en;
jest.mock("react-i18next", () => ({ useTranslation: () => ({
  t: (key: string, options?: { phrase: string }) => {
    const [group, name] = key.split(".");
    const value = (mockLocale as unknown as Record<string, Record<string, string>>)[group!]![name!]!;
    return value.replace("{{phrase}}", options?.phrase ?? "");
  },
}) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34 }) }));
it.each([en, es])("renders the translated phrase and prevents deletion until matched", locale => {
  mockLocale = locale;
  const confirmation = { visible: true, text: "", phrase: locale.profile.deleteAccountPhrase,
    setText: jest.fn(), busy: false, matches: false, open: jest.fn(), close: jest.fn(), submit: jest.fn(),
  };
  const { rerender } = render(<DeleteAccountDialog confirmation={confirmation} />);
  fireEvent.press(screen.getByText(locale.profile.deleteAccount));
  expect(confirmation.submit).not.toHaveBeenCalled();
  const label = locale.profile.deleteAccountTypePhrase.replace("{{phrase}}", confirmation.phrase);
  fireEvent.changeText(screen.getByLabelText(label), confirmation.phrase);
  expect(confirmation.setText).toHaveBeenCalledWith(confirmation.phrase);
  rerender(<DeleteAccountDialog confirmation={{ ...confirmation, text: confirmation.phrase, matches: true }} />);
  fireEvent.press(screen.getByText(locale.profile.deleteAccount));
  expect(confirmation.submit).toHaveBeenCalledTimes(1);
  rerender(<DeleteAccountDialog confirmation={{ ...confirmation, busy: true, matches: true }} />);
  expect(screen.getByLabelText(label).props.editable).toBe(false);
  fireEvent.press(screen.getByText(locale.common.cancel));
  expect(confirmation.close).not.toHaveBeenCalled();
});

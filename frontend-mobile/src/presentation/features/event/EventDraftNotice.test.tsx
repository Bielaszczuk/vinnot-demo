import { render, screen } from "@testing-library/react-native";
import { EventDraftNotice, type EventDraftNoticeProps } from "./EventDraftNotice";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/components/ui/Button", () => {
  const { Text } = jest.requireActual("react-native");
  return { Button: ({ children }: { children: string }) => <Text>{children}</Text> };
});

const props = (status: string): EventDraftNoticeProps => ({
  status,
  recovery: null,
  confirmDiscard: false,
  setConfirmDiscard: jest.fn(),
  restore: jest.fn(),
  discard: jest.fn(),
  persist: jest.fn(),
});

it("keeps the same actions while an autosave runs so the form does not shift on each keystroke", () => {
  const { rerender } = render(<EventDraftNotice {...props("saved")} />);
  expect(screen.getByText("eventDraft.discard")).toBeTruthy();
  rerender(<EventDraftNotice {...props("saving")} />);
  expect(screen.getByText("eventDraft.discard")).toBeTruthy();
});

it("offers no discard action before anything was saved", () => {
  render(<EventDraftNotice {...props("ready")} />);
  expect(screen.queryByText("eventDraft.discard")).toBeNull();
});

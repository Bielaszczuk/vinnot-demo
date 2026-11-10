import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { CancelEventSheet } from "./CancelEventSheet";
import { EVENT_CANCELLATION_REASONS } from "@/domain/event/eventCancellation";
import enUS from "@/shared/i18n/locales/en-US.json";
import esAR from "@/shared/i18n/locales/es-AR.json";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && "count" in options ? `${key}:${String(options.count)}` : key,
  }),
}));
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual("react");
  return {
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: ReactNode }) => children,
    BottomSheetModal: forwardRef(
      ({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }, ref: unknown) => {
        useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: () => onDismiss?.() }));
        return children;
      },
    ),
  };
});
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20 }),
}));

const reason = (code: string) => `events.cancellation.reasons.${code}`;
const NOTE = "events.cancellation.noteLabel";
const onConfirm = jest.fn();
const onClose = jest.fn();

function renderSheet(busy = false) {
  return render(
    <CancelEventSheet
      visible
      eventTitle="Cata de Malbec"
      busy={busy}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
}

beforeEach(() => jest.clearAllMocks());

it("names the event and preselects the default reason", () => {
  renderSheet();

  expect(screen.getByText("Cata de Malbec")).toBeTruthy();
  expect(screen.getByText("events.cancellation.consequence")).toBeTruthy();
  expect(screen.getByRole("button", { name: reason("UNFORESEEN_CIRCUMSTANCES") }).props.accessibilityState)
    .toMatchObject({ selected: true });
  expect(screen.getByRole("button", { name: reason("WEATHER") }).props.accessibilityState)
    .toMatchObject({ selected: false });
  expect(screen.queryByLabelText(NOTE)).toBeNull();
});

it("confirms with the default reason without any choice", () => {
  renderSheet();

  fireEvent.press(screen.getByLabelText("events.cancellation.confirm"));

  expect(onConfirm).toHaveBeenCalledWith({ reason: "UNFORESEEN_CIRCUMSTANCES" });
});

it("sends the chosen reason with a single tap", () => {
  renderSheet();

  fireEvent.press(screen.getByRole("button", { name: reason("VENUE_UNAVAILABLE") }));
  fireEvent.press(screen.getByLabelText("events.cancellation.confirm"));

  expect(screen.getByRole("button", { name: reason("VENUE_UNAVAILABLE") }).props.accessibilityState)
    .toMatchObject({ selected: true });
  expect(onConfirm).toHaveBeenCalledWith({ reason: "VENUE_UNAVAILABLE" });
});

it("reveals an optional note only for OTHER and sends it trimmed", () => {
  renderSheet();

  fireEvent.press(screen.getByRole("button", { name: reason("OTHER") }));
  fireEvent.changeText(screen.getByLabelText(NOTE), "  Private tasting moved  ");

  expect(screen.getByLabelText(NOTE).props.maxLength).toBe(280);
  expect(screen.getByText("events.cancellation.noteCounter:25")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("events.cancellation.confirm"));
  expect(onConfirm).toHaveBeenLastCalledWith({ reason: "OTHER", note: "Private tasting moved" });
});

it("confirms OTHER without a note and drops the note when another reason is chosen", () => {
  renderSheet();

  fireEvent.press(screen.getByRole("button", { name: reason("OTHER") }));
  fireEvent.press(screen.getByLabelText("events.cancellation.confirm"));
  expect(onConfirm).toHaveBeenLastCalledWith({ reason: "OTHER" });

  fireEvent.changeText(screen.getByLabelText(NOTE), "Moved");
  fireEvent.press(screen.getByRole("button", { name: reason("WEATHER") }));
  expect(screen.queryByLabelText(NOTE)).toBeNull();
  fireEvent.press(screen.getByLabelText("events.cancellation.confirm"));
  expect(onConfirm).toHaveBeenLastCalledWith({ reason: "WEATHER" });
});

it("keeps the event and restores the default for the next opening", () => {
  const view = renderSheet();

  fireEvent.press(screen.getByRole("button", { name: reason("WEATHER") }));
  fireEvent.press(screen.getByLabelText("events.cancellation.keep"));
  expect(onClose).toHaveBeenCalled();
  expect(onConfirm).not.toHaveBeenCalled();

  view.rerender(
    <CancelEventSheet visible={false} eventTitle="Cata de Malbec" onConfirm={onConfirm} onClose={onClose} />,
  );
  view.rerender(
    <CancelEventSheet visible eventTitle="Cata de Malbec" onConfirm={onConfirm} onClose={onClose} />,
  );
  expect(screen.getByRole("button", { name: reason("UNFORESEEN_CIRCUMSTANCES") }).props.accessibilityState)
    .toMatchObject({ selected: true });
});

it("locks every choice while the cancellation is in flight", () => {
  renderSheet(true);

  fireEvent.press(screen.getByLabelText("events.cancellation.confirm"));
  expect(onConfirm).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: reason("WEATHER") }).props.accessibilityState)
    .toMatchObject({ disabled: true });
});

it.each([["en-US", enUS], ["es-AR", esAR]])("translates every reason and action in %s", (_locale, messages) => {
  const copy = messages.events.cancellation as Record<string, unknown> & { reasons: Record<string, string> };
  EVENT_CANCELLATION_REASONS.forEach((code) => expect(copy.reasons[code]).toBeTruthy());
  ["title", "consequence", "reasonLabel", "reasonHint", "noteLabel", "notePlaceholder", "noteCounter", "confirm", "keep"]
    .forEach((key) => expect(copy[key]).toBeTruthy());
});

it.each([
  ["es-AR", esAR, "Cancelar el evento es definitivo: no se puede volver a publicar. Las personas inscriptas reciben un correo con el motivo y los pagos online se devuelven automáticamente por Mercado Pago, sin posibilidad de deshacerlo."],
  ["en-US", enUS, "Cancelling is final: the event cannot be published again. Attendees get an email with the reason, and online payments are refunded automatically through Mercado Pago. This cannot be undone."],
])("warns the organizer in %s that cancelling is final and refunds online payments", (_locale, messages, notice) => {
  expect(messages.events.cancellation.consequence).toBe(notice);
});

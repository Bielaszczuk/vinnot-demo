import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import i18n from "@/shared/i18n";
import { CellarEntryActionsMenu } from "./CellarEntryActionsMenu";

const mockPresent = jest.fn();
const mockDismiss = jest.fn();
// The real sheet reports onDismiss only after its closing animation ends.
let mockFinishDismiss: (() => void) | undefined;
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual("react");
  return {
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: ReactNode }) => children,
    BottomSheetModal: forwardRef(
      ({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }, ref: unknown) => {
        mockFinishDismiss = onDismiss;
        useImperativeHandle(ref, () => ({ present: mockPresent, dismiss: mockDismiss }));
        return children;
      },
    ),
  };
});

const finishClosing = () => act(() => mockFinishDismiss?.());

const handlers = () => ({
  onEdit: jest.fn(),
  onReview: jest.fn(),
  onOpenWine: jest.fn(),
  onDelete: jest.fn(),
});

function renderMenu(hasReview: boolean, actions = handlers()) {
  render(<CellarEntryActionsMenu wineName="Gran Malbec" hasReview={hasReview} {...actions} />);
  return actions;
}

describe("cellar entry actions menu", () => {
  const previous = i18n.language;
  beforeEach(async () => {
    jest.clearAllMocks();
    await act(async () => {
      await i18n.changeLanguage("es-AR");
    });
  });
  afterAll(async () => {
    await i18n.changeLanguage(previous);
  });

  it("opens from a three-dots button named after the wine", () => {
    renderMenu(false);
    fireEvent.press(screen.getByRole("button", { name: "Más opciones para Gran Malbec" }));
    expect(mockPresent).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["Editar notas", "onEdit"],
    ["Publicar como reseña", "onReview"],
    ["Abrir vino", "onOpenWine"],
    ["Eliminar", "onDelete"],
  ] as const)("%s closes the menu and runs its action once the menu has closed", (label, handler) => {
    const actions = renderMenu(false);
    fireEvent.press(screen.getByRole("button", { name: label }));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    // Opening another sheet while this one is still closing would be discarded.
    expect(actions[handler]).not.toHaveBeenCalled();
    finishClosing();
    expect(actions[handler]).toHaveBeenCalledTimes(1);
    finishClosing();
    expect(actions[handler]).toHaveBeenCalledTimes(1);
    for (const other of Object.keys(actions) as (keyof typeof actions)[]) {
      if (other !== handler) expect(actions[other]).not.toHaveBeenCalled();
    }
  });

  it("offers to view the review when the wine already has one", () => {
    const actions = renderMenu(true);
    expect(screen.queryByRole("button", { name: "Publicar como reseña" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Ver reseña" }));
    finishClosing();
    expect(actions.onReview).toHaveBeenCalledTimes(1);
  });

  it("cancel only closes the menu", () => {
    const actions = renderMenu(false);
    fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    finishClosing();
    for (const handler of Object.values(actions)) expect(handler).not.toHaveBeenCalled();
  });

  it("closing the menu by swiping it down runs nothing", () => {
    const actions = renderMenu(false);
    fireEvent.press(screen.getByRole("button", { name: "Más opciones para Gran Malbec" }));
    finishClosing();
    for (const handler of Object.values(actions)) expect(handler).not.toHaveBeenCalled();
  });

  it("uses English labels in en-US", async () => {
    await act(async () => {
      await i18n.changeLanguage("en-US");
    });
    renderMenu(true);
    expect(screen.getByRole("button", { name: "More options for Gran Malbec" })).toBeTruthy();
    for (const label of ["Edit notes", "View review", "Open wine", "Delete", "Cancel"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });
});

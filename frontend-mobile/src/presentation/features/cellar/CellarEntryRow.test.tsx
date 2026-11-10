import { afterAll, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import i18n from "@/shared/i18n";
import type { CellarEntry } from "@/domain/cellar/cellar.types";
import { CellarEntryRow } from "./CellarEntryRow";

jest.mock("@/presentation/features/wine/WineImage", () => ({ WineImage: () => null }));
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual<typeof React>("react");
  return {
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: React.ReactNode }) => children,
    // Closing finishes at once, so the menu runs the chosen action right away.
    BottomSheetModal: forwardRef(
      ({ children, onDismiss }: { children: React.ReactNode; onDismiss?: () => void }, ref) => {
        useImperativeHandle(ref, () => ({ present: () => undefined, dismiss: () => onDismiss?.() }));
        return children;
      },
    ),
  };
});

const entry = {
  id: "entry-1",
  wine: { id: "wine-1", name: "Gran Malbec", winery: "Bodega Norte", type: "RED", vintage: null, imageUrl: null },
  rating: null,
  notes: null,
  purchasePrice: null,
  addedAt: new Date("2026-10-01T12:00:00Z"),
} as unknown as CellarEntry;

const noop = () => undefined;
const row = () => (
  <CellarEntryRow entry={entry} onPress={noop} onEdit={noop} onPublishReview={noop} onDelete={noop} />
);

describe("cellar entry row", () => {
  const previous = i18n.language;
  afterAll(async () => {
    await i18n.changeLanguage(previous);
  });

  it.each([
    ["es-AR", "Bodega Norte · Tinto"],
    ["en-US", "Bodega Norte · Red"],
  ])("shows the wine type translated in %s", async (language, text) => {
    await act(async () => {
      await i18n.changeLanguage(language);
    });
    render(row(), { wrapper: GestureHandlerRootView });
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.queryByText(/RED/)).toBeNull();
  });

  it.each([
    ["es-AR", "Añada 2018"],
    ["en-US", "Vintage 2018"],
  ])("shows the tasted vintage as a pill in %s", async (language, text) => {
    await act(async () => {
      await i18n.changeLanguage(language);
    });
    render(<CellarEntryRow entry={{ ...entry, vintage: 2018 }} onPress={noop} onEdit={noop}
      onPublishReview={noop} onDelete={noop} />, { wrapper: GestureHandlerRootView });
    expect(screen.getByText(text)).toBeTruthy();
  });

  it.each([
    ["es-AR", "4,5"],
    ["en-US", "4.5"],
  ])("shows the numeric rating beside the glasses in %s", async (language, text) => {
    await act(async () => {
      await i18n.changeLanguage(language);
    });
    render(<CellarEntryRow entry={{ ...entry, rating: 4.5 }} onPress={noop} onEdit={noop}
      onPublishReview={noop} onDelete={noop} />, { wrapper: GestureHandlerRootView });
    expect(screen.getByText(text)).toBeTruthy();
  });

  it("shows no vintage pill when the note has none", async () => {
    await act(async () => {
      await i18n.changeLanguage("en-US");
    });
    render(row(), { wrapper: GestureHandlerRootView });
    expect(screen.queryByText(/Vintage/)).toBeNull();
    // The row title and the (mocked, always rendered) menu sheet title both show the name.
    expect(screen.getAllByText("Gran Malbec")).not.toHaveLength(0);
  });

  it("names the swipe delete action for screen readers", async () => {
    await act(async () => {
      await i18n.changeLanguage("es-AR");
    });
    const onDelete = jest.fn();
    render(<CellarEntryRow entry={entry} onPress={noop} onEdit={noop} onPublishReview={noop} onDelete={onDelete} />, {
      wrapper: GestureHandlerRootView,
    });
    const swipe = screen.UNSAFE_getByType(Swipeable);
    render((swipe.props.renderRightActions as () => React.ReactElement)());
    const action = screen.getByRole("button", { name: "Quitar Gran Malbec de tu bodega" });
    fireEvent.press(action);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("gathers edit, review, open wine and delete in the three-dots menu", async () => {
    await act(async () => {
      await i18n.changeLanguage("es-AR");
    });
    const actions = { onPress: jest.fn(), onEdit: jest.fn(), onPublishReview: jest.fn(), onDelete: jest.fn() };
    render(<CellarEntryRow entry={{ ...entry, reviewId: "review-1" }} {...actions} />, { wrapper: GestureHandlerRootView });
    expect(screen.getByRole("button", { name: "Más opciones para Gran Malbec" })).toBeTruthy();
    for (const [label, handler] of [
      ["Editar notas", actions.onEdit],
      ["Ver reseña", actions.onPublishReview],
      ["Abrir vino", actions.onPress],
      ["Eliminar", actions.onDelete],
    ] as const) {
      expect(screen.getAllByRole("button", { name: label })).toHaveLength(1);
      fireEvent.press(screen.getByRole("button", { name: label }));
      expect(handler).toHaveBeenCalledTimes(1);
    }
  });
});

import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { WineCard } from "@/presentation/features/wine/WineCard";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import type { WineSummary } from "@/domain/wine/wine.types";

let mockLanguage = "es-AR";

// The real catalogs, so the card is checked against the copy readers see.
jest.mock("react-i18next", () => {
  const { createInstance } = jest.requireActual<typeof import("i18next")>("i18next");
  const instance = createInstance();
  void instance.init({
    initAsync: false,
    resources: {
      "es-AR": { translation: jest.requireActual("@/shared/i18n/locales/es-AR.json") },
      "en-US": { translation: jest.requireActual("@/shared/i18n/locales/en-US.json") },
    },
    lng: "es-AR",
    fallbackLng: "es-AR",
    interpolation: { escapeValue: false },
  });
  return {
    useTranslation: () => ({
      t: instance.getFixedT(mockLanguage),
      i18n: { language: mockLanguage, resolvedLanguage: mockLanguage },
    }),
  };
});
jest.mock("@/presentation/features/wine/WineImage", () => ({ WineImage: () => null }));

const wine = {
  id: "w1",
  name: "Malbec Reserva",
  type: "RED",
  winery: "Bodega Sur",
  country: "Argentina",
  region: "Mendoza",
  grapeVarieties: ["Malbec"],
  rating: 4,
  reviewCount: 1,
} as unknown as WineSummary;

const withReviews = (reviewCount: number) => ({ ...wine, reviewCount }) as WineSummary;
const flat = (style: unknown) => StyleSheet.flatten(style as never) ?? {};

beforeEach(() => {
  mockLanguage = "es-AR";
});

describe("WineCard", () => {
  it("shows the rating with the app language decimal separator", () => {
    render(<WineCard wine={wine} onPress={jest.fn()} />);
    expect(screen.getByText("4,0")).toBeTruthy();
  });

  it.each([
    ["en-US", 5, "(5) reviews"],
    ["en-US", 1, "(1) review"],
    ["en-US", 0, "(0) reviews"],
    ["es-AR", 5, "(5) reseñas"],
    ["es-AR", 1, "(1) reseña"],
    ["es-AR", 0, "(0) reseñas"],
  ])("writes the review count in parentheses (%s, %i)", (language, count, text) => {
    mockLanguage = language;
    render(<WineCard wine={withReviews(count)} onPress={jest.fn()} onReviewsPress={jest.fn()} />);
    expect(screen.getByText(text)).toBeTruthy();
  });

  it("underlines only the number, in the inline link colour, when the reviews can be opened", () => {
    mockLanguage = "en-US";
    render(<WineCard wine={withReviews(5)} onPress={jest.fn()} onReviewsPress={jest.fn()} />);

    expect(flat(screen.getByText("5").props.style)).toMatchObject({
      textDecorationLine: "underline",
      color: vinnotColors.brand,
    });
    expect(flat(screen.getByText("(5) reviews").props.style).textDecorationLine).toBeUndefined();
  });

  it("opens the reviews from the count without opening the detail", () => {
    mockLanguage = "en-US";
    const onPress = jest.fn();
    const onReviewsPress = jest.fn();
    render(<WineCard wine={withReviews(5)} onPress={onPress} onReviewsPress={onReviewsPress} />);

    const link = screen.getByRole("link", { name: "5 reviews, open reviews" });
    expect(flat(link.props.style).minHeight).toBeGreaterThanOrEqual(44);
    fireEvent.press(link);

    expect(onReviewsPress).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("names the reviews link in Spanish", () => {
    render(<WineCard wine={withReviews(1)} onPress={jest.fn()} onReviewsPress={jest.fn()} />);
    expect(screen.getByRole("link", { name: "1 reseña, abrir reseñas" })).toBeTruthy();
  });

  it("keeps the rest of the card opening the detail, with the same label", () => {
    const onPress = jest.fn();
    const onReviewsPress = jest.fn();
    render(<WineCard wine={withReviews(5)} onPress={onPress} onReviewsPress={onReviewsPress} />);

    fireEvent.press(screen.getByLabelText("Malbec Reserva. Ver detalle"));
    fireEvent.press(screen.getByText("Malbec Reserva"));

    expect(onPress).toHaveBeenCalledTimes(2);
    expect(onReviewsPress).not.toHaveBeenCalled();
  });

  it.each([
    ["es-AR", "Malbec Reserva. Ver detalle", "Abrir reseñas"],
    ["en-US", "Malbec Reserva. View details", "Open reviews"],
  ])("offers screen readers an action that opens the reviews (%s)", (language, cardLabel, actionLabel) => {
    mockLanguage = language;
    const onPress = jest.fn();
    const onReviewsPress = jest.fn();
    render(<WineCard wine={withReviews(5)} onPress={onPress} onReviewsPress={onReviewsPress} />);

    const card = screen.getByLabelText(cardLabel);
    expect(card.props.accessibilityActions).toEqual([{ name: "openReviews", label: actionLabel }]);
    fireEvent(card, "accessibilityAction", { nativeEvent: { actionName: "activate" } });
    expect(onReviewsPress).not.toHaveBeenCalled();
    fireEvent(card, "accessibilityAction", { nativeEvent: { actionName: "openReviews" } });

    expect(onReviewsPress).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("keeps the count as plain text when the reviews cannot be opened from the card", () => {
    const onPress = jest.fn();
    render(<WineCard wine={withReviews(5)} onPress={onPress} />);

    expect(screen.getByText("(5) reseñas")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByLabelText("Malbec Reserva. Ver detalle").props.accessibilityActions).toBeUndefined();
    expect(flat(screen.getByText("5").props.style).textDecorationLine).toBeUndefined();
    fireEvent.press(screen.getByText("(5) reseñas"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

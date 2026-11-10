import { fireEvent, render, screen } from "@testing-library/react-native";
import { WineComparisonErrorState } from "./WineComparisonErrorState";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

describe("WineComparisonErrorState", () => {
  it.each([
    ["AI_COMPARISON_UNAVAILABLE", 503],
    ["INTERNAL_ERROR", 500],
    ["VALIDATION_ERROR", 400],
    [undefined, undefined],
  ])("does not misreport %s as an internet failure", (code, status) => {
    const retry = jest.fn();
    render(<WineComparisonErrorState error={{ message: "Failed", code, status }} onRetry={retry} />);
    expect(screen.getByText("No pudimos generar la comparación. Volvé a intentarlo en unos momentos.")).toBeTruthy();
    expect(screen.queryByText("Revisá tu conexión y volvé a intentar.")).toBeNull();
    fireEvent.press(screen.getByText("Reintentar comparación"));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("shows connectivity advice only for transport failures", () => {
    render(<WineComparisonErrorState error={{ message: "Offline", code: "NETWORK_ERROR" }} onRetry={jest.fn()} />);
    expect(screen.getByText("Revisá tu conexión y volvé a intentar.")).toBeTruthy();
  });

  it("distinguishes timeouts from connectivity and provider errors", () => {
    render(<WineComparisonErrorState error={{ message: "Timed out", code: "TIMEOUT" }} onRetry={jest.fn()} />);
    expect(screen.getByText("La comparación tardó más de lo esperado")).toBeTruthy();
    expect(screen.queryByText("Revisá tu conexión y volvé a intentar.")).toBeNull();
  });
});

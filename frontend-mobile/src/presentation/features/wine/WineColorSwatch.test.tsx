import { act, render, screen } from "@testing-library/react-native";
import { WineColorSwatch } from "./WineColorSwatch";
import { WINE_STROKE_MASKS } from "@/shared/wineColorPalette";

const mockImageSources: unknown[] = [];
jest.mock("@shopify/react-native-skia", () => {
  // The manual Skia mock, wrapped to record which stroke mask the swatch loads.
  const actual = jest.requireActual("../../../../__mocks__/@shopify/react-native-skia");
  return {
    ...actual,
    useImage: (source: unknown) => {
      mockImageSources.push(source);
      return actual.useImage(source);
    },
  };
});

type Node = { type: unknown; props: Record<string, unknown> };
const gradientsOf = (root: { findAll: (match: (node: Node) => boolean) => Node[] }) =>
  root.findAll((node) => (node.type as unknown) === "SkiaLinearGradient");

describe("WineColorSwatch", () => {
  it("paints the core color turning into the rim color", () => {
    render(<WineColorSwatch tone="RED_GARNET" rim="RED_TAWNY" label="Rojo granate con ribete teja." />);

    expect(screen.getByLabelText("Rojo granate con ribete teja.")).toBeTruthy();
    expect(screen.getByTestId("wine-color-swatch-RED_GARNET")).toBeTruthy();
    const [gradient] = gradientsOf(screen.UNSAFE_root as never);
    expect(gradient?.props.colors).toEqual(["#7A2A1E", "#7A2A1E", "#8E4424"]);
  });

  it("thins the core color at the rim when the text names no rim", () => {
    render(<WineColorSwatch tone="RED_GARNET" label="Rojo granate." />);

    const [gradient] = gradientsOf(screen.UNSAFE_root as never);
    expect(gradient?.props.colors).toEqual(["#7A2A1E", "#7A2A1E", "#A9756D"]);
  });

  it("runs a wash of each named reflection along the lower edge, one tone per pass", () => {
    jest.useFakeTimers();
    render(
      <WineColorSwatch tone="RED_RUBY_DEEP" reflections={["RED_PURPLE", "RED_TAWNY"]} highlights
        label="Rojo rubí profundo con reflejos violáceos y matices teja." />,
    );
    const gradients = () => gradientsOf(screen.UNSAFE_root as never);
    const washOf = () => (gradients()[1]?.props.colors as string[])[1];

    expect(gradients()[0]?.props.colors).toEqual(["#4F0A18", "#4F0A18", "#8D6069"]);
    expect(gradients()).toHaveLength(3);
    expect(washOf()).toBe("#B079C2");
    act(() => jest.advanceTimersByTime(900 + 4200));
    expect(washOf()).toBe("#C46A32");
    act(() => jest.advanceTimersByTime(4200));
    expect(washOf()).toBe("#B079C2");
    jest.useRealTimers();
  });

  it("shows a greenish reflection on a straw stroke in green, not in the wine's own color", () => {
    render(<WineColorSwatch tone="WHITE_STRAW" reflections={["WHITE_GREEN"]} highlights
      label="Amarillo pálido con reflejos verdosos." />);

    const gradients = gradientsOf(screen.UNSAFE_root as never);
    expect((gradients[0]?.props.colors as string[])[0]).toBe("#E6CF74");
    expect((gradients[1]?.props.colors as string[])[1]).toBe("#9DBF3A");
  });

  it("paints no reflection when the color line names none", () => {
    render(<WineColorSwatch tone="RED_RUBY_DEEP" label="Rojo rubí intenso." />);

    expect(gradientsOf(screen.UNSAFE_root as never)).toHaveLength(1);
  });

  it("shows nothing when the color line names no hue", () => {
    render(<WineColorSwatch tone={null} label="Brillante" />);

    expect(screen.queryByLabelText("Brillante")).toBeNull();
  });

  it("paints with the stroke that matches the depth the color line names", () => {
    mockImageSources.length = 0;
    render(<WineColorSwatch tone="RED_PURPLE" intensity="DEEP" label="Púrpura casi opaco." />);
    expect(mockImageSources.at(-1)).toBe(WINE_STROKE_MASKS.dense);

    render(<WineColorSwatch tone="RED_PURPLE" intensity="PALE" label="Púrpura pálido." />);
    expect(mockImageSources.at(-1)).toBe(WINE_STROKE_MASKS.light);

    render(<WineColorSwatch tone="RED_BRICK" intensity="DEEP" label="Ladrillo profundo." />);
    expect(mockImageSources.at(-1)).toBe(WINE_STROKE_MASKS.dense);

    render(<WineColorSwatch tone="RED_RUBY" label="Rubí." />);
    expect(mockImageSources.at(-1)).toBe(WINE_STROKE_MASKS.medium);
  });
});

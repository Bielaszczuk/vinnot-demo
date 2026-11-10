import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { useReducedMotion, withTiming } from "react-native-reanimated";
import { SERVING_ART } from "@/shared/profileArt";
import { ServingArt } from "./ServingArt";
import { THERMOMETER_TUBE_HEIGHT, temperatureLabel, thermometerLevel } from "./ServingThermometer";

jest.mock("react-native-reanimated", () => jest.requireActual("./reanimatedMock").createReanimatedMock());

const hidden = { includeHiddenElements: true };
// expo-image hands its host view a list of sources.
const sourceOf = (testID: string) => [screen.getByTestId(testID, hidden).props.source].flat()[0];
const mercuryHeight = () =>
  (StyleSheet.flatten(screen.getByTestId("serving-thermometer-mercury", hidden).props.style) as { height: number }).height;

beforeEach(() => {
  jest.mocked(useReducedMotion).mockReturnValue(false);
  jest.mocked(withTiming).mockClear();
});

describe("thermometer", () => {
  it("reads the middle of the range on a 0-25 °C scale", () => {
    expect(thermometerLevel({ min: 16, max: 18 })).toBeCloseTo(17 / 25);
    expect(thermometerLevel({ min: 8, max: 8 })).toBeCloseTo(8 / 25);
    expect(thermometerLevel({ min: 30, max: 40 })).toBe(1);
    expect(thermometerLevel({ min: -4, max: -2 })).toBe(0);
  });

  it("labels a range or a single value", () => {
    expect(temperatureLabel({ min: 16, max: 18 })).toBe("16–18 °C");
    expect(temperatureLabel({ min: 8, max: 8 })).toBe("8 °C");
  });

  it("raises the mercury from the bulb to the recommended temperature on appear", () => {
    render(<ServingArt box="temperature" serving={{ glass: null, decant: false, temperature: { min: 16, max: 18 } }} />);

    expect(screen.getByText("16–18 °C", hidden)).toBeTruthy();
    expect(mercuryHeight()).toBe(0);
    expect(withTiming).toHaveBeenCalledWith(1, expect.anything());
  });

  it("shows the mercury still at the recommended temperature with reduced motion", () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    render(<ServingArt box="temperature" serving={{ glass: null, decant: false, temperature: { min: 16, max: 18 } }} />);

    expect(mercuryHeight()).toBeCloseTo(THERMOMETER_TUBE_HEIGHT * (17 / 25));
    expect(withTiming).not.toHaveBeenCalled();
  });
});

describe("serving art", () => {
  const all = { glass: "RED_BALLOON", decant: true, temperature: { min: 16, max: 18 } } as const;

  it("puts the recommended glass, the decanter and the cellar on top of their boxes, hidden from screen readers", () => {
    render(
      <>
        <ServingArt box="glassware" serving={all} />
        <ServingArt box="decanting" serving={all} />
        <ServingArt box="aging" serving={all} />
      </>,
    );

    expect(sourceOf("serving-art-RED_BALLOON")).toBe(SERVING_ART.RED_BALLOON);
    expect(sourceOf("serving-art-DECANTER")).toBe(SERVING_ART.DECANTER);
    expect(sourceOf("serving-art-CELLAR")).toBe(SERVING_ART.CELLAR);
    expect(screen.queryByTestId("serving-thermometer", hidden)).toBeNull();
    const art = screen.getByTestId("serving-art-box-glassware", hidden);
    expect(art.props.accessibilityElementsHidden).toBe(true);
    expect(art.props.importantForAccessibility).toBe("no-hide-descendants");
  });

  it("shows an uncorked bottle when decanting is not needed", () => {
    render(<ServingArt box="decanting" serving={{ glass: "FLUTE", decant: false, temperature: null }} />);

    expect(sourceOf("serving-art-OPEN_BOTTLE")).toBe(SERVING_ART.OPEN_BOTTLE);
    expect(screen.queryByTestId("serving-art-DECANTER", hidden)).toBeNull();
  });

  it("leaves boxes without art when the profile names none", () => {
    render(
      <>
        <ServingArt box="glassware" serving={{ glass: null, decant: false, temperature: null }} />
        <ServingArt box="temperature" serving={{ glass: null, decant: false, temperature: null }} />
      </>,
    );

    expect(screen.queryByTestId(/^serving-art-/, hidden)).toBeNull();
    expect(screen.queryByTestId("serving-thermometer", hidden)).toBeNull();
  });
});

import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { VINTAGE_PICKER_OLDEST_YEAR } from "@/domain/wine/vintage";
import { SheetFieldFocusContext } from "./SheetInputContext";
import { VintageField } from "./VintageField";

const mockSelection = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { year?: number }) => (options?.year ? `${key}:${options.year}` : key),
  }),
}));
jest.mock("@/presentation/hooks/ui", () => ({
  useHaptics: () => ({ selection: mockSelection, impact: jest.fn(), notification: jest.fn() }),
}));

const currentYear = new Date().getFullYear();
const input = () => screen.getByLabelText("vintage.label");
const toggle = () => screen.getByTestId("vintage-toggle");
const list = () => screen.getByTestId("vintage-options");
const rowLabels = () => within(list()).queryAllByRole("button").map((row) => row.props.accessibilityLabel as string);
const open = () => fireEvent(input(), "focus");
const type = (text: string) => fireEvent.changeText(input(), text);

function Harness({ initial = null, suggested, disabled, onChange, onInputFocus }: {
  initial?: number | null;
  suggested?: number | null;
  disabled?: boolean;
  onChange?: (year: number | null) => void;
  onInputFocus?: () => void;
}) {
  const [value, setValue] = useState<number | null>(initial);
  return <VintageField value={value} suggestedYear={suggested} disabled={disabled} onInputFocus={onInputFocus}
    onChange={(year) => { setValue(year); onChange?.(year); }} />;
}

beforeEach(() => jest.clearAllMocks());

describe("closed field", () => {
  it("shows no vintage as the placeholder of an empty, typeable year input", () => {
    render(<Harness suggested={2015} />);

    expect(screen.getByText("vintage.label")).toBeTruthy();
    expect(input().props.value).toBe("");
    expect(input().props.placeholder).toBe("vintage.none");
    expect(input().props.keyboardType).toBe("number-pad");
    expect(input().props.maxLength).toBe(4);
    expect(input().props.accessibilityValue).toEqual({ text: "vintage.none" });
    expect(input().props.accessibilityState).toEqual(expect.objectContaining({ expanded: false }));
    expect(screen.queryByTestId("vintage-options")).toBeNull();
    expect(screen.queryByText("2015")).toBeNull();
  });

  it("shows the chosen year with the suggested mark when it is the catalog vintage", () => {
    render(<Harness initial={2015} suggested={2015} />);

    expect(input().props.placeholder).toBe("2015");
    expect(screen.getByText("vintage.suggested")).toBeTruthy();
    expect(input().props.accessibilityValue).toEqual({ text: "2015, vintage.suggested" });
  });
});

describe("picking from the list", () => {
  it("opens on focus with no vintage first, the suggested vintage, then every year newest first", () => {
    const onInputFocus = jest.fn();
    render(<Harness suggested={2015} onInputFocus={onInputFocus} />);

    open();

    expect(onInputFocus).toHaveBeenCalledTimes(1);
    expect(input().props.placeholder).toBe("vintage.searchPlaceholder");
    expect(input().props.accessibilityState).toEqual(expect.objectContaining({ expanded: true }));
    const labels = rowLabels();
    expect(labels.slice(0, 4)).toEqual([
      "vintage.none",
      "vintage.selectSuggested:2015",
      `vintage.select:${currentYear}`,
      `vintage.select:${currentYear - 1}`,
    ]);
    expect(labels.at(-1)).toBe(`vintage.select:${VINTAGE_PICKER_OLDEST_YEAR}`);
    expect(labels.filter((label) => label.endsWith(":2015"))).toHaveLength(1);
    expect(within(list()).getByText("vintage.suggested")).toBeTruthy();
  });

  it("marks the empty choice as selected while there is no vintage", () => {
    render(<Harness />);

    open();

    expect(within(list()).getByLabelText("vintage.none").props.accessibilityState).toEqual({ selected: true });
    expect(within(list()).getByLabelText(`vintage.select:${currentYear}`).props.accessibilityState)
      .toEqual({ selected: false });
    expect(list().props.contentOffset).toEqual({ x: 0, y: 0 });
  });

  it("opens with the selected year checked and scrolled into view", () => {
    render(<Harness initial={2000} />);

    open();

    expect(screen.getByLabelText("vintage.select:2000").props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByLabelText("vintage.none").props.accessibilityState).toEqual({ selected: false });
    const index = currentYear - 2000 + 1;
    expect(list().props.contentOffset).toEqual({ x: 0, y: index * 44 - (240 - 44) / 2 });
  });

  it("selects a tapped year, closes the list and shows the year in the field", () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    open();
    fireEvent.press(screen.getByLabelText("vintage.select:2018"));

    expect(onChange).toHaveBeenLastCalledWith(2018);
    expect(mockSelection).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("vintage-options")).toBeNull();
    expect(input().props.value).toBe("");
    expect(input().props.placeholder).toBe("2018");
    expect(input().props.accessibilityValue).toEqual({ text: "2018" });
  });

  it("clears the vintage with the no-vintage choice", () => {
    const onChange = jest.fn();
    render(<Harness initial={2018} onChange={onChange} />);

    open();
    fireEvent.press(screen.getByLabelText("vintage.none"));

    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(input().props.placeholder).toBe("vintage.none");
    expect(screen.queryByTestId("vintage-options")).toBeNull();
  });
});

describe("typing the year", () => {
  it("lists only the years starting with the typed digits and hides the no-vintage row", () => {
    render(<Harness />);

    open();
    type("201");

    expect(input().props.value).toBe("201");
    expect(rowLabels()).toEqual(
      [2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010].map((year) => `vintage.select:${year}`),
    );
    expect(within(list()).queryByLabelText("vintage.none")).toBeNull();
    expect(list().props.contentOffset).toEqual({ x: 0, y: 0 });
  });

  it("finds the year ending in two typed digits", () => {
    render(<Harness />);

    open();
    type("98");

    expect(rowLabels()).toEqual(["vintage.select:1998"]);
  });

  it("keeps only digits in the query", () => {
    render(<Harness />);

    open();
    type("2a0");

    expect(input().props.value).toBe("20");
  });

  it("selects a complete year as soon as it is typed", () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    open();
    type("2016");

    expect(onChange).toHaveBeenLastCalledWith(2016);
    expect(screen.queryByTestId("vintage-options")).toBeNull();
    expect(input().props.value).toBe("");
    expect(input().props.placeholder).toBe("2016");
  });

  it("shows a single muted row when no offered year matches", () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    open();
    type("1850");

    expect(within(list()).getByText("vintage.noMatches")).toBeTruthy();
    expect(rowLabels()).toEqual([]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows every option again when the query is erased", () => {
    render(<Harness />);

    open();
    type("201");
    type("");

    expect(rowLabels()[0]).toBe("vintage.none");
    expect(input().props.placeholder).toBe("vintage.searchPlaceholder");
  });
});

describe("chevron and disabled state", () => {
  it("toggles the list with the chevron, closing it without changing the value", () => {
    const onChange = jest.fn();
    render(<Harness initial={2018} onChange={onChange} />);

    fireEvent.press(toggle());
    expect(list()).toBeTruthy();
    expect(toggle().props.accessibilityLabel).toBe("vintage.hideYears");

    type("19");
    fireEvent.press(toggle());

    expect(screen.queryByTestId("vintage-options")).toBeNull();
    expect(toggle().props.accessibilityLabel).toBe("vintage.showYears");
    expect(input().props.value).toBe("");
    expect(input().props.placeholder).toBe("2018");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not open or accept typing while disabled", () => {
    const onChange = jest.fn();
    render(<Harness disabled onChange={onChange} />);

    fireEvent.press(toggle());
    open();

    expect(input().props.editable).toBe(false);
    expect(input().props.accessibilityState).toEqual(expect.objectContaining({ disabled: true, expanded: false }));
    expect(screen.queryByTestId("vintage-options")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("inside a sheet", () => {
  it("asks the sheet to reveal the field together with its year list, not just the input", () => {
    const reveal = jest.fn();
    render(
      <SheetFieldFocusContext.Provider value={reveal}>
        <Harness />
      </SheetFieldFocusContext.Provider>,
    );
    open();
    expect(reveal.mock.calls.at(-1)?.[0]?.props?.testID).toBe("vintage-field");
  });
});

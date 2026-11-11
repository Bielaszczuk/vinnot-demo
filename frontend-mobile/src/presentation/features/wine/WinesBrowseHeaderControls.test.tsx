import { ScrollView } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import i18n from "@/shared/i18n";
import { SheetFieldFocusContext } from "@/presentation/components/ui/SheetInputContext";
import { OptionsPanel } from "./WinesBrowseHeaderControls";

const grapes = [
  { value: "Cabernet Franc", label: "Cabernet Franc" },
  { value: "Cabernet Sauvignon", label: "Cabernet Sauvignon" },
  { value: "Malbec", label: "Malbec" },
];

describe("OptionsPanel search", () => {
  it("picks an option on the first tap while the keyboard is open", () => {
    const screen = render(<OptionsPanel options={grapes} value="" onSelect={jest.fn()} searchable />);

    expect(screen.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe("handled");
  });

  it("selects an option found by typing", () => {
    const onSelect = jest.fn();
    const screen = render(
      <OptionsPanel options={grapes} value="" onSelect={onSelect} searchable searchPlaceholder="Buscar cepa" />,
    );

    fireEvent.changeText(screen.getByPlaceholderText("Buscar cepa"), "caber");
    expect(screen.queryByText("Malbec")).toBeNull();
    fireEvent.press(screen.getByText("Cabernet Sauvignon"));

    expect(onSelect).toHaveBeenCalledWith("Cabernet Sauvignon");
  });

  it("asks the sheet to reveal the whole panel while its search is focused", () => {
    const focusInSheet = jest.fn();
    const screen = render(
      <SheetFieldFocusContext.Provider value={focusInSheet}>
        <OptionsPanel options={grapes} value="" onSelect={jest.fn()} searchable searchPlaceholder="Buscar cepa" />
      </SheetFieldFocusContext.Provider>,
    );
    const input = screen.getByPlaceholderText("Buscar cepa");

    fireEvent(input, "focus");
    expect(focusInSheet).toHaveBeenLastCalledWith(expect.objectContaining({ measureInWindow: expect.any(Function) }));
    fireEvent(input, "blur");
    expect(focusInSheet).toHaveBeenLastCalledWith(null);
  });
});

describe("OptionsPanel default copy", () => {
  const previous = i18n.language;

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage(previous);
    });
  });

  it.each([
    ["es-AR", "Buscar", "Sin resultados"],
    ["en-US", "Search", "No results"],
  ])("uses the %s search and empty labels when none are given", async (lng, search, empty) => {
    await act(async () => {
      await i18n.changeLanguage(lng);
    });
    const screen = render(<OptionsPanel options={grapes} value="" onSelect={jest.fn()} searchable />);

    fireEvent.changeText(screen.getByPlaceholderText(search), "zzz");
    expect(screen.getByText(empty)).toBeTruthy();
  });
});

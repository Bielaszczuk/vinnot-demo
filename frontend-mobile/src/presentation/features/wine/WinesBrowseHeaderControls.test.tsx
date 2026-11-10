import { ScrollView } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
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

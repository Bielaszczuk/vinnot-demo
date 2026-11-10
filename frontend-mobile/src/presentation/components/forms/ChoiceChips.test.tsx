import { fireEvent, render, screen } from "@testing-library/react-native";
import { ChoiceChips } from "./ChoiceChips";

const options = [
  { value: "RED", label: "Red" },
  { value: "WHITE", label: "White" },
] as const;

describe("ChoiceChips", () => {
  it("behaves as a radio group in single mode", () => {
    const onChange = jest.fn();
    render(<ChoiceChips label="Type" options={options} value="RED" onChange={onChange} />);
    expect(screen.getByLabelText("Type").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByRole("radio", { name: "Red" }).props.accessibilityState).toMatchObject({
      selected: true,
      checked: true,
    });
    fireEvent.press(screen.getByRole("radio", { name: "White" }));
    expect(onChange).toHaveBeenCalledWith("WHITE");
  });

  it("toggles values as checkboxes in multi mode", () => {
    const onChange = jest.fn();
    render(<ChoiceChips multiple label="Allergens" options={options} value={["RED"]} onChange={onChange} />);
    fireEvent.press(screen.getByRole("checkbox", { name: "White" }));
    expect(onChange).toHaveBeenLastCalledWith(["RED", "WHITE"]);
    fireEvent.press(screen.getByRole("checkbox", { name: "Red" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("ignores taps while disabled and shows its error", () => {
    const onChange = jest.fn();
    render(<ChoiceChips label="Type" options={options} value={null} onChange={onChange} disabled error="Required" />);
    fireEvent.press(screen.getByRole("radio", { name: "Red" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Required")).toBeTruthy();
  });
});

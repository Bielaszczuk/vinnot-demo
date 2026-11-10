import { fireEvent, render, screen } from "@testing-library/react-native";
import { AdminFilterPicker } from "./AdminFilterPicker";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/components/ui/TextField", () => {
  const { TextInput } = jest.requireActual("react-native");
  return {
    TextField: ({ accessibilityLabel, ...props }: { accessibilityLabel?: string }) => (
      <TextInput {...props} accessibilityLabel={accessibilityLabel} />
    ),
  };
});

const countries = [
  { id: "country-ar", name: "Argentina" },
  { id: "country-cl", name: "Chile" },
];

function renderFilter(value: string | null, onSelect = jest.fn()) {
  render(
    <AdminFilterPicker
      label="Country"
      value={value}
      options={countries}
      allLabel="All countries"
      searchPlaceholder="Search country"
      onSelect={onSelect}
    />,
  );
  return onSelect;
}

describe("AdminFilterPicker", () => {
  it("searches the options and filters by the chosen one", () => {
    const onSelect = renderFilter(null);
    const field = screen.getByRole("combobox", { name: "Country" });
    expect(field.props.accessibilityValue).toEqual({ text: "All countries" });
    fireEvent.press(field);
    fireEvent.changeText(screen.getByLabelText("Search country"), "chi");
    expect(screen.queryByRole("button", { name: "Argentina" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Chile" }));
    expect(onSelect).toHaveBeenCalledWith("country-cl");
  });

  it("clears the filter from the all row", () => {
    const onSelect = renderFilter("country-ar");
    const field = screen.getByRole("combobox", { name: "Country" });
    expect(field.props.accessibilityValue).toEqual({ text: "Argentina" });
    fireEvent.press(field);
    fireEvent.press(screen.getByRole("button", { name: "All countries" }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

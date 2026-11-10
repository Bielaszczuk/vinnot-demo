import { fireEvent, render, screen } from "@testing-library/react-native";
import { SheetFieldFocusContext } from "@/presentation/components/ui/SheetInputContext";
import { EntityPicker, type PickerOption } from "./EntityPicker";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number; label?: string }) =>
      options?.label ? `${key}:${options.label}` : options?.count ? `${key}:${options.count}` : key,
  }),
}));
jest.mock("@/presentation/components/ui/TextField", () => {
  const { TextInput } = jest.requireActual("react-native");
  return { TextField: (props: object) => <TextInput {...props} /> };
});

const countries: PickerOption[] = [
  { id: "ar", label: "Argentina" },
  { id: "cl", label: "Chile", description: "Sudamérica" },
];

function open(label = "Country") {
  fireEvent.press(screen.getByRole("combobox", { name: label }));
}

describe("EntityPicker", () => {
  it("filters local options ignoring accents and selects one", () => {
    const onChange = jest.fn();
    render(<EntityPicker label="Country" placeholder="Choose" options={countries} value={null} onChange={onChange} />);
    open();
    fireEvent.changeText(screen.getByLabelText("forms.picker.search"), "chíle");
    expect(screen.queryByText("Argentina")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Chile" }));
    expect(onChange).toHaveBeenCalledWith(countries[1]);
    expect(screen.queryByLabelText("forms.picker.search")).toBeNull();
  });

  it("asks the sheet to reveal the whole panel, not just the search box, when the search is focused", () => {
    const reveal = jest.fn();
    render(
      <SheetFieldFocusContext.Provider value={reveal}>
        <EntityPicker label="Country" placeholder="Choose" options={countries} value={null} onChange={jest.fn()} testID="country" />
      </SheetFieldFocusContext.Provider>,
    );
    open();
    fireEvent(screen.getByLabelText("forms.picker.search"), "focus");
    const revealed = reveal.mock.calls.at(-1)?.[0];
    expect(revealed?.props?.testID).toBe("country-panel");
  });

  it("shows the empty state and a create row for the typed query", () => {
    const onCreate = jest.fn();
    render(
      <EntityPicker
        label="Winery"
        placeholder="Choose"
        options={[]}
        value={null}
        onChange={jest.fn()}
        onQueryChange={jest.fn()}
        emptyLabel="No winery"
        createLabel={(query) => `Create «${query}»`}
        onCreate={onCreate}
      />,
    );
    open("Winery");
    fireEvent.changeText(screen.getByLabelText("forms.picker.search"), "  Bodega Nueva ");
    expect(screen.getByText("No winery")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Create «Bodega Nueva»" }));
    expect(onCreate).toHaveBeenCalledWith("Bodega Nueva");
  });

  it("hides the create row when the query matches an option exactly", () => {
    render(
      <EntityPicker
        label="Country"
        placeholder="Choose"
        options={countries}
        value={null}
        onChange={jest.fn()}
        createLabel={(query) => `Create «${query}»`}
        onCreate={jest.fn()}
      />,
    );
    open();
    fireEvent.changeText(screen.getByLabelText("forms.picker.search"), "argentina");
    expect(screen.queryByText("Create «argentina»")).toBeNull();
  });

  it("asks for more letters before an async search and reports loading", () => {
    const onQueryChange = jest.fn();
    const view = render(
      <EntityPicker
        label="Winery"
        placeholder="Choose"
        options={[]}
        value={null}
        onChange={jest.fn()}
        onQueryChange={onQueryChange}
        minQueryLength={2}
      />,
    );
    open("Winery");
    fireEvent.changeText(screen.getByLabelText("forms.picker.search"), "b");
    expect(onQueryChange).toHaveBeenLastCalledWith("b");
    expect(screen.getByText("forms.picker.minQuery:2")).toBeTruthy();
    view.rerender(
      <EntityPicker label="Winery" placeholder="Choose" options={[]} value={null} onChange={jest.fn()} loading
        onQueryChange={onQueryChange} minQueryLength={2} />,
    );
    expect(screen.getByText("forms.picker.loading")).toBeTruthy();
  });

  it("toggles several options in multi mode and removes a selected one", () => {
    const onChange = jest.fn();
    const view = render(
      <EntityPicker multiple label="Grapes" placeholder="Add" options={countries} value={[]} onChange={onChange} />,
    );
    open("Grapes");
    fireEvent.press(screen.getByRole("checkbox", { name: "Argentina" }));
    expect(onChange).toHaveBeenLastCalledWith([countries[0]]);
    view.rerender(
      <EntityPicker multiple label="Grapes" placeholder="Add" options={countries} value={[countries[0]!]} onChange={onChange} />,
    );
    expect(screen.getByRole("checkbox", { name: "Argentina" }).props.accessibilityState).toMatchObject({ checked: true });
    fireEvent.press(screen.getByRole("button", { name: "forms.picker.remove:Argentina" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    fireEvent.press(screen.getByText("forms.picker.done"));
    expect(screen.queryByLabelText("forms.picker.search")).toBeNull();
  });

  it("shows the selection and its inline error, and stays closed when disabled", () => {
    render(
      <EntityPicker label="Country" placeholder="Choose" options={countries} value={countries[1]!}
        onChange={jest.fn()} error="Pick one" disabled />,
    );
    expect(screen.getByText("Chile")).toBeTruthy();
    expect(screen.getByText("Sudamérica")).toBeTruthy();
    expect(screen.getByText("Pick one")).toBeTruthy();
    open();
    expect(screen.queryByLabelText("forms.picker.search")).toBeNull();
  });

  it("short fixed lists open without a search box and reveal the list in a sheet", () => {
    const reveal = jest.fn();
    const onChange = jest.fn();
    render(
      <SheetFieldFocusContext.Provider value={reveal}>
        <EntityPicker label="Country" placeholder="Choose" options={countries} value={null} onChange={onChange} searchable={false} testID="type" />
      </SheetFieldFocusContext.Provider>,
    );
    open();
    expect(screen.queryByLabelText("forms.picker.search")).toBeNull();
    fireEvent(screen.getByTestId("type-panel"), "layout", { nativeEvent: { layout: { height: 100 } } });
    expect(reveal).toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: "Argentina" }));
    expect(onChange).toHaveBeenCalledWith(countries[0]);
  });
});

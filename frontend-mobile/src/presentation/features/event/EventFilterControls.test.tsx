import { act, fireEvent, render } from "@testing-library/react-native";
import i18n from "@/shared/i18n";
import { EventAreaSearch, EventFilterOptions } from "./EventFilterControls";

describe("EventFilterControls copy", () => {
  const previous = i18n.language;

  beforeEach(async () => {
    await act(async () => {
      await i18n.changeLanguage("en-US");
    });
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage(previous);
    });
  });

  it("shows a translated area search error instead of the geocoder text", () => {
    const screen = render(
      <EventAreaSearch
        query="Mendoza"
        onQueryChange={jest.fn()}
        onSearch={jest.fn()}
        onClear={jest.fn()}
        isSearching={false}
        error="API Key de Google Maps no configurada"
      />,
    );

    expect(screen.getByText("We could not find that area. Try another city or address.")).toBeTruthy();
    expect(screen.queryByText("API Key de Google Maps no configurada")).toBeNull();
  });

  it("shows formatted country options but returns the stored value", () => {
    const onChange = jest.fn();
    const screen = render(
      <EventFilterOptions
        options={["España", "Estados Unidos"]}
        value=""
        onChange={onChange}
        formatOption={(option) => (option === "España" ? "Spain" : "United States")}
      />,
    );

    fireEvent.changeText(screen.getByPlaceholderText("Search"), "spa");
    expect(screen.queryByText("United States")).toBeNull();
    fireEvent.press(screen.getByText("Spain"));

    expect(onChange).toHaveBeenCalledWith("España");
  });

  it("keeps showing raw options when no formatter is given", () => {
    const screen = render(<EventFilterOptions options={["Argentina"]} value="Argentina" onChange={jest.fn()} />);

    expect(screen.getByText("Argentina")).toBeTruthy();
  });
});

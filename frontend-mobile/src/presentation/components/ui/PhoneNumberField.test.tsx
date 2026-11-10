import { fireEvent, render, screen } from "@testing-library/react-native";
import { PhoneNumberField } from "./PhoneNumberField";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe("PhoneNumberField", () => {
  it("treats a personal contact phone as a mobile and offers no line choice", () => {
    const onChange = jest.fn();
    render(<PhoneNumberField value="" onChange={onChange} />);
    expect(screen.queryByRole("radio", { name: "contactPhone.lineLandline" })).toBeNull();
    fireEvent.changeText(screen.getByLabelText("contactPhone.label"), "2614123456");
    expect(onChange).toHaveBeenLastCalledWith("+5492614123456");
  });

  it("switches an Argentine business number between mobile and landline", () => {
    const onChange = jest.fn();
    render(<PhoneNumberField value="+5492614123456" onChange={onChange} allowLandline label="Phone" />);
    expect(screen.getByRole("radio", { name: "contactPhone.lineMobile" })).toBeChecked();
    fireEvent.press(screen.getByRole("radio", { name: "contactPhone.lineLandline" }));
    expect(onChange).toHaveBeenLastCalledWith("+542614123456");
    expect(screen.getByText("contactPhone.landlineHint")).toBeTruthy();
    fireEvent.press(screen.getByRole("radio", { name: "contactPhone.lineMobile" }));
    expect(onChange).toHaveBeenLastCalledWith("+5492614123456");
  });

  it("hides the line choice outside Argentina", () => {
    render(<PhoneNumberField value="+56912345678" onChange={jest.fn()} allowLandline label="Phone" />);
    expect(screen.queryByRole("radio", { name: "contactPhone.lineLandline" })).toBeNull();
  });
});

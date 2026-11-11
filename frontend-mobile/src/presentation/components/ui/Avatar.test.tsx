import { fireEvent, render, screen } from "@testing-library/react-native";
import { Avatar, UserHandle } from "./Atoms";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, options?: { name?: string }) => `${key}:${options?.name ?? ""}` }),
}));

describe("Avatar", () => {
  it("shows the photo while it loads and the initials when it fails", () => {
    render(<Avatar uri="https://cdn.vinnot.com/ana.jpg" name="Ana Lopez" />);
    const photo = screen.getByLabelText("common.avatarOf:Ana Lopez");
    expect(photo.props.source).toEqual({ uri: "https://cdn.vinnot.com/ana.jpg" });
    expect(screen.queryByText("AL")).toBeNull();

    fireEvent(photo, "error");

    expect(screen.queryByLabelText("common.avatarOf:Ana Lopez")).toBeNull();
    expect(screen.getByText("AL")).toBeTruthy();
  });

  it("tries again when the photo changes after a failure", () => {
    const { rerender } = render(<Avatar uri="https://cdn.vinnot.com/broken.jpg" name="Ana" />);
    fireEvent(screen.getByLabelText("common.avatarOf:Ana"), "error");
    expect(screen.getByText("A")).toBeTruthy();

    rerender(<Avatar uri="https://cdn.vinnot.com/ana.jpg" name="Ana" />);

    expect(screen.getByLabelText("common.avatarOf:Ana").props.source).toEqual({ uri: "https://cdn.vinnot.com/ana.jpg" });
    expect(screen.queryByText("A")).toBeNull();
  });

  it("shows the initials when there is no photo", () => {
    render(<Avatar uri={null} name="Leo" />);
    expect(screen.getByText("L")).toBeTruthy();
  });
});

describe("UserHandle", () => {
  it("shows the username with an at sign", () => {
    render(<UserHandle username="ana_vino" />);
    expect(screen.getByText("@ana_vino")).toBeTruthy();
  });

  it.each([undefined, null, "", "  "])("renders nothing for a missing username (%p)", (username) => {
    render(<UserHandle username={username} />);
    expect(screen.toJSON()).toBeNull();
  });
});

import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { ProfileHero } from "../ProfileHero";

const props = {
  displayName: "Ana",
  email: "ana@vinnot.com",
  roles: [{ key: "ROLE_USER", label: "User" }],
  editLabel: "Edit profile",
  onEdit: jest.fn(),
  onAvatarPress: jest.fn(),
};

describe("ProfileHero", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps its identity, roles and edit action without extra content", () => {
    render(<ProfileHero {...props} />);
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.getByText("ana@vinnot.com")).toBeTruthy();
    expect(screen.getByText("User")).toBeTruthy();
    fireEvent.press(screen.getByText("Edit profile"));
    expect(props.onEdit).toHaveBeenCalled();
  });

  it("shows extra content such as the points emblem under the identity", () => {
    render(<ProfileHero {...props}><Text>points row</Text></ProfileHero>);
    expect(screen.getByText("points row")).toBeTruthy();
  });
});

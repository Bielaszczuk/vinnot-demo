import { render, screen } from "@testing-library/react-native";
import { AppHeader } from "./index";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("@/presentation/components/ui/BackButton", () => ({ BackButton: () => null }));

const longTitle = "Comunidad y seguridad";

it("shrinks a long title to fit one line before cutting it", () => {
  render(<AppHeader title={longTitle} showBack />);
  const title = screen.getByText(longTitle);
  expect(title.props.numberOfLines).toBe(1);
  expect(title.props.adjustsFontSizeToFit).toBe(true);
  expect(title.props.minimumFontScale).toBeLessThan(1);
});


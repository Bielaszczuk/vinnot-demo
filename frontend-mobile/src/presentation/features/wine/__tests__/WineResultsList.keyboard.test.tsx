import { render } from "@testing-library/react-native";
import { WineResultsList } from "../WineResultsList";

const mockFlashListProps: Array<Record<string, unknown>> = [];

jest.mock("@shopify/flash-list", () => ({
  FlashList: (props: Record<string, unknown>) => {
    mockFlashListProps.push(props);
    return null;
  },
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe("WineResultsList keyboard taps", () => {
  beforeEach(() => {
    mockFlashListProps.length = 0;
  });

  it("lets a tap inside the header filter sheet reach its option while the keyboard is open", () => {
    render(<WineResultsList wines={[]} onWinePress={jest.fn()} />);

    expect(mockFlashListProps.at(-1)?.keyboardShouldPersistTaps).toBe("handled");
  });
});

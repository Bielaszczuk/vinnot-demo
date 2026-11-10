import { fireEvent, render } from "@testing-library/react-native";
import { MyTicketDetailsScreen } from "./MyTicketsScreen";
const mockDismissTo = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ dismissTo: mockDismissTo }),
  useLocalSearchParams: () => ({ id: "ticket" }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));
jest.mock("@/presentation/hooks/queries/event/useMyTickets", () => ({
  useMyTicket: () => ({ isLoading: true }),
}));
jest.mock("@/presentation/components/layout", () => ({
  AppHeader: ({ onBack }: { onBack: () => void }) => {
    const { Button } = jest.requireActual("react-native");
    return <Button title="Back" onPress={onBack} />;
  },
}));
it("returns to the existing tickets list instead of replacing details with a duplicate list", () => {
  const view = render(<MyTicketDetailsScreen />);
  fireEvent.press(view.getByText("Back"));
  expect(mockDismissTo).toHaveBeenCalledWith("/my-tickets");
});

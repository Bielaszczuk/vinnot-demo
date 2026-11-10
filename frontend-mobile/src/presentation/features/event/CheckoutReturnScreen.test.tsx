import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { CheckoutReturnScreen } from "./CheckoutReturnScreen";
const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockReceipt = jest.fn();
let mockParams: Record<string, unknown> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/hooks/useCheckoutReceipt", () => ({
  useCheckoutReceipt: (token: string) => mockReceipt(token),
}));
jest.mock("@/presentation/components/layout", () => ({ AppHeader: () => null }));
jest.mock("@/presentation/components/ui/Button", () => ({
  Button: ({ children, onPress, loading }: { children: string; onPress: () => void; loading?: boolean }) => {
    const { Button } = jest.requireActual("react-native");
    return <Button title={loading ? `${children}:loading` : children} onPress={onPress} />;
  },
}));
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { receipt: "opaque", ticketId: id, status: "approved" };
});
it("shows verified confirmation and opens the protected native ticket using the existing app session", () => {
  mockReceipt.mockReturnValue({ status: "CONFIRMED", refresh: mockRefresh });
  const view = render(<CheckoutReturnScreen />);
  expect(mockReceipt).toHaveBeenCalledWith("opaque");
  expect(view.getByText("tickets.receipt.CONFIRMED.title")).toBeTruthy();
  fireEvent.press(view.getByText("tickets.view"));
  expect(mockReplace).toHaveBeenCalledWith(`/my-tickets/${id}`);
  fireEvent.press(view.getByText("tickets.title"));
  expect(mockReplace).toHaveBeenLastCalledWith("/my-tickets");
});
it("shows pending server state even when provider URL claims approved and allows refresh", () => {
  mockReceipt.mockReturnValue({ status: "PENDING", refresh: mockRefresh });
  const view = render(<CheckoutReturnScreen />);
  expect(view.queryByText("tickets.receipt.CONFIRMED.title")).toBeNull();
  fireEvent.press(view.getByText("tickets.refresh"));
  expect(mockRefresh).toHaveBeenCalledTimes(1);
});
it("rejects malformed inputs and only offers the protected tickets list", () => {
  mockParams = { receipt: ["bad", "data"], ticketId: "../../admin" };
  mockReceipt.mockReturnValue({ status: "UNAVAILABLE", refresh: mockRefresh });
  const view = render(<CheckoutReturnScreen />);
  expect(mockReceipt).toHaveBeenCalledWith(null);
  expect(view.queryByText("tickets.view")).toBeNull();
  fireEvent.press(view.getByText("tickets.title"));
  expect(mockReplace).toHaveBeenCalledWith("/my-tickets");
});
it("shows the refresh as loading while it runs", () => {
  mockReceipt.mockReturnValue({ status: "PENDING", refresh: mockRefresh, refreshing: true });
  const view = render(<CheckoutReturnScreen />);
  expect(view.getByText("tickets.refresh:loading")).toBeTruthy();
});

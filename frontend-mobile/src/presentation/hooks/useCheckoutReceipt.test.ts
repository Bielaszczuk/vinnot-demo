import { act, renderHook } from "@testing-library/react-native";
import { useCheckoutReceipt } from "./useCheckoutReceipt";
import { eventTicketsService } from "@/application/services/eventTickets.service";
import type { PaymentReceiptStatus } from "@/domain/event/eventTicket";
jest.mock("@/application/services/eventTickets.service", () => ({
  eventTicketsService: { receipt: jest.fn() },
}));
const api = jest.mocked(eventTicketsService.receipt);
beforeEach(() => {
  jest.useFakeTimers();
  api.mockReset();
});
afterEach(() => jest.useRealTimers());
it("polls pending receipts then stops when the server confirms", async () => {
  api.mockResolvedValueOnce("PENDING").mockResolvedValueOnce("CONFIRMED");
  const { result, unmount } = renderHook(() => useCheckoutReceipt("opaque"));
  await act(async () => {});
  expect(result.current.status).toBe("PENDING");
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(result.current.status).toBe("CONFIRMED");
  await act(async () => {
    jest.advanceTimersByTime(30000);
  });
  expect(api).toHaveBeenCalledTimes(2);
  unmount();
});
it("bounds automatic polling to 24 reads and permits manual refresh", async () => {
  api.mockResolvedValue("PENDING");
  const { result, unmount } = renderHook(() => useCheckoutReceipt("opaque"));
  await act(async () => {});
  for (let i = 0; i < 30; i++)
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
  expect(api).toHaveBeenCalledTimes(24);
  api.mockResolvedValue("REFUNDED");
  await act(async () => result.current.refresh());
  expect(result.current.status).toBe("REFUNDED");
  unmount();
});
it("ignores late responses for an older token or unmounted screen", async () => {
  let resolve!: (value: PaymentReceiptStatus) => void;
  api
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    )
    .mockResolvedValue("NOT_COMPLETED");
  const { result, rerender, unmount } = renderHook(({ token }) => useCheckoutReceipt(token), {
    initialProps: { token: "old" },
  });
  await act(async () => rerender({ token: "new" }));
  await act(async () => resolve("CONFIRMED"));
  expect(result.current.status).toBe("NOT_COMPLETED");
  unmount();
});
it("never treats errors or absent tokens as a successful payment", async () => {
  api.mockRejectedValue(new Error("offline"));
  const { result, rerender, unmount } = renderHook(({ token }) => useCheckoutReceipt(token), {
    initialProps: { token: null as string | null },
  });
  expect(result.current.status).toBe("UNAVAILABLE");
  expect(api).not.toHaveBeenCalled();
  await act(async () => rerender({ token: "opaque" }));
  expect(result.current.status).toBe("UNAVAILABLE");
  unmount();
});
it("reports a manual refresh as running until its answer arrives", async () => {
  api.mockResolvedValueOnce("NOT_COMPLETED");
  const { result, unmount } = renderHook(() => useCheckoutReceipt("opaque"));
  await act(async () => {});
  expect(result.current.refreshing).toBe(false);
  let resolve!: (value: PaymentReceiptStatus) => void;
  api.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
  await act(async () => result.current.refresh());
  expect(result.current.refreshing).toBe(true);
  await act(async () => resolve("CONFIRMED"));
  expect(result.current.refreshing).toBe(false);
  expect(result.current.status).toBe("CONFIRMED");
  unmount();
});

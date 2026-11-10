import { paymentReturnDestination } from "./paymentReturn";
const id = "11111111-1111-4111-8111-111111111111";
it("normalizes only known payment callbacks and strips untrusted payment status", () => {
  expect(
    paymentReturnDestination(
      `vinnot://payments/return?receipt=opaque&ticketId=${id}&status=approved`,
    ),
  ).toBe(`/payments/return?receipt=opaque&ticketId=${id}`);
  expect(paymentReturnDestination("/payments/return?receipt=opaque&ticketId=evil")).toBe(
    "/payments/return?receipt=opaque",
  );
  expect(paymentReturnDestination("/payments/connected")).toBe("/partner/events");
  expect(paymentReturnDestination("vinnot://payments/connected")).toBe("/partner/events");
  expect(paymentReturnDestination("/events")).toBeNull();
});
it.each([
  "vinnot://payments/return?status=approved",
  "vinnot://payments/return/evil?receipt=x",
  "vinnot://payments/return?receipt=%0A",
  "vinnot://payments/return?receipt=x#bad",
  "vinnot://payments/return?receipt=" + "a".repeat(513),
  "vinnot://payments/return?receipt=" + "a".repeat(2100),
])("rejects malformed payment return %s", (path) =>
  expect(paymentReturnDestination(path)).toBe("/my-tickets"),
);

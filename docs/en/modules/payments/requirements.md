# Functional requirements

Functional requirements of the module, split by platform. The "Previous ID" column keeps the identifier they had in the per-platform specification.

## Web

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-WEB-PAY-01` | Pay online for a paid registration. | With an amount, REQUESTED/AWAITING_PAYMENT state and PENDING/REPORTED payment, Mercado Pago checkout opens; payment is confirmed only when the server verifies it with Mercado Pago, never by the UI. | [`UC-PAY-01`](use-cases/uc-pay-01-pay-registration.md) | `RF-WEB-REG-005` |
| `RF-WEB-PAY-02` | Return from checkout and read the receipt. | `/payments/return` calls `GET /payments/receipt` without a session, polls while PENDING and offers `vinnot://payments/return` when returning to the app was requested; the URL does not confirm payment. | [`UC-PAY-02`](use-cases/uc-pay-02-checkout-return.md) | `RF-WEB-REG-012` |
| `RF-WEB-PAY-03` | Manage paid registrations without crediting payments. | Paid REQUESTED/AWAITING_PAYMENT registrations offer only REJECT; there is no manual crediting. When the server allows it, the organizer requests a refund with `POST /payments/checkouts/{id}/refund` and sees its status; if Mercado Pago rejects it, they get the reason by email and can retry it with the same request. | [`UC-PAY-04`](use-cases/uc-pay-04-refund-registration.md) | `RF-WEB-REG-008` |

## APK

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-APK-PAY-01` | Pay online for an eligible registration. | With an amount above zero, REQUESTED or AWAITING_PAYMENT status and PENDING or REPORTED payment (`canStartOnlinePayment`), the app opens the Mercado Pago checkout. Returning from checkout does not confirm payment: only the server verification with Mercado Pago confirms it. | [`UC-PAY-01`](use-cases/uc-pay-01-pay-registration.md) | `RF-APK-REG-005` |
| `RF-APK-PAY-02` | Limit manager actions on payment. | Management offers only APPROVE, WAITLIST or REJECT according to state (`allowedRegistrationActions`); a paid REQUESTED, AWAITING_PAYMENT or AWAITING_ATTENDEE_CONFIRMATION request only allows REJECT. Managers do not confirm payments: that confirmation comes exclusively from the server verification with Mercado Pago. A refund Mercado Pago rejected can be retried from the same sheet. | [`UC-PAY-04`](use-cases/uc-pay-04-refund-registration.md) | `RF-APK-REG-008` |

## Fee

These rules apply to the web, the app and the backend:

- Vinnot's fee comes from the current policy (`app.payments.commission.*`, 300 basis points and `VINNOT_3_PERCENT_V1` by default), never from a value fixed in the code.
- Each payment attempt stores the basis points and policy it was created with, and is always reconciled against them even if the rate changes later.
- `/partner/payments` and the event editor (web and app) show the percentage that `GET /payments/mercadopago/account` reports; without a valid value they show none.

## Deleted accounts

These rules apply to the backend:

- Deleting a buyer's or an organizer's account does not delete their payments: payment attempts, their observations and refunds are kept as the financial history of the operation, with no link to the deleted account.
- An approved payment that was never credited and whose buyer no longer exists is refunded, because there is no ticket to issue. An already credited payment stays as it is.
- A refund for a payment whose buyer or organizer no longer exists cannot be requested from Vinnot; it is made from the Mercado Pago panel.
- No payment notice is sent to a deleted account.

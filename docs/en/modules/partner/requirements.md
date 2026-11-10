# Functional requirements

Functional requirements of the module, split by platform. The "Previous ID" column keeps the identifier they had in the per-platform specification.

## Web

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-WEB-PAR-01` | Read and page owned events. | organizerId derives from the session rather than an arbitrary field; other partners' events are not listed. | [`UC-PAR-01`](use-cases/uc-par-01-list-own-events.md) | `RF-WEB-PARTNER-001` |
| `RF-WEB-PAR-02` | Create an owned event with complete data. | Requests title/type, description, dates, location, image, contacts, price/capacity and exposed registration settings; backend validates relations and dates. | [`UC-PAR-02`](use-cases/uc-par-02-create-event.md) | `RF-WEB-PARTNER-002` |
| `RF-WEB-PAR-03` | Edit an owned event from complete detail. | Loads data by ID and saves authorized fields; options absent from the draft are not overwritten. | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | `RF-WEB-PARTNER-003` |
| `RF-WEB-PAR-04` | Publish or change state within domain rules. | A cancelled event never changes state again; a completed one can go back to published or draft, but cannot be cancelled or postponed; the system computes “sold out” from capacity and the editor shows it as published; the editor does not offer “Cancelled” and the API rejects that change with 400 `USE_CANCEL_ENDPOINT`. | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | `RF-WEB-PARTNER-004` |
| `RF-WEB-PAR-05` | Cancel while preserving traceability. | Owned delete/cancel changes state and releases registrations/seats; it is not physical deletion. The cancel dialog offers a reason select with "Unforeseen circumstances" preselected (an optional note of up to 280 characters appears only for "Other reason"), so confirming never requires typing; the reason is sent as the `DELETE /partner/events/{id}` body and active attendees receive it, with refund details, by email. The dialog warns that cancelling is final and that online payments are refunded automatically through Mercado Pago. | [`UC-PAR-04`](use-cases/uc-par-04-cancel-event.md) | `RF-WEB-PARTNER-005` |
| `RF-WEB-PAR-06` | Review requests with ownership. | Manager lists/pages/filters status and offers APPROVE, WAITLIST or REJECT according to state and amount; knowing an ID grants no access to another organizer's event. | [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | `RF-WEB-REG-007` |
| `RF-WEB-PAR-07` | Manage attendees for owned events. | Uses the request/capacity/online-payment and refund manager with the same registration and ownership rules. | [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | `RF-WEB-PARTNER-006` |

## APK

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-APK-PAR-01` | Read and page owned events. | organizerId derives from the session rather than an arbitrary field; other partners' events are not listed. | [`UC-PAR-01`](use-cases/uc-par-01-list-own-events.md) | `RF-APK-PARTNER-001` |
| `RF-APK-PAR-02` | Create an owned event with complete data. | Requests title/type, description, dates, location, image, contacts, price/capacity and exposed registration settings; backend validates relations and dates. | [`UC-PAR-02`](use-cases/uc-par-02-create-event.md) | `RF-APK-PARTNER-002` |
| `RF-APK-PAR-03` | Edit an owned event from complete detail. | Loads data by ID and saves authorized fields; options absent from the draft are not overwritten. | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | `RF-APK-PARTNER-003` |
| `RF-APK-PAR-04` | Publish or change state within domain rules. | A cancelled event never changes state again; a completed one can go back to published or draft, but cannot be cancelled or postponed; the system computes “sold out” from capacity and saving a sold-out event keeps its state; the editor does not offer “Cancelled” and the API rejects that change with 400 `USE_CANCEL_ENDPOINT`. | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | `RF-APK-PARTNER-004` |
| `RF-APK-PAR-05` | Cancel while preserving traceability. | Owned delete/cancel changes state and releases registrations/seats; it is not physical deletion. Confirmation uses the shared cancel sheet: one-tap reason chips with `UNFORESEEN_CIRCUMSTANCES` preselected (confirming without a choice never shows a required-field error), an optional note of up to 280 characters only for `OTHER`, and `DELETE` sends `{reason, note?}`. Registered attendees receive an email with the reason and refund details; online payments are refunded automatically through Mercado Pago. | [`UC-PAR-04`](use-cases/uc-par-04-cancel-event.md) | `RF-APK-PARTNER-005` |
| `RF-APK-PAR-06` | Review requests with ownership. | Manager lists/pages/filters status and offers approve, reject or waitlist according to state; knowing an ID grants no access to another organizer's event. | [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | `RF-APK-REG-007` |
| `RF-APK-PAR-07` | Manage attendees for owned events. | Uses the request/capacity/online-payment and refund manager with the same registration and ownership rules. | [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | `RF-APK-PARTNER-006` |

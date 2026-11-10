# Testing

Test cases of the module: one for the main flow of each use case and one for each alternative flow. They can be run by hand on the web and in the app; the automated tests column shows which tests exercise the use case.

## Test cases

| ID | Use case | Steps | Expected result |
|---|---|---|---|
| `CP-PAR-01` | [`UC-PAR-01`](use-cases/uc-par-01-list-own-events.md) | 1) The person opens “My events”: on the web, `/partner/events`; on the app, from the profile. 2) The client calls `GET /partner/events`, 20 at a time. 3) The API takes the organizer from the session and returns only their events. 4) The client shows each event with date, state and registrations, and the edit, cancel and view registrations actions. | The person sees their events with their state. |
| `CP-PAR-02` | [`UC-PAR-01`](use-cases/uc-par-01-list-own-events.md) | Main flow → 1a. The person is neither partner nor administrator | The client does not show the section and the API answers 403. |
| `CP-PAR-03` | [`UC-PAR-02`](use-cases/uc-par-02-create-event.md) | 1) The person chooses “Create event”. 2) They fill in the editor by sections: basic data and cover, location on the map, contact and registration. 3) In registration they choose free or online payment with Mercado Pago, capacity, deadline and ticket limit. 4) The client validates dates, coordinates, price, capacity and contact, and sends `POST /partner/events`. 5) The API uses the signed-in person as organizer, applies the event rules and returns `201` with the ID. | The event was created as a draft or published. |
| `CP-PAR-04` | [`UC-PAR-02`](use-cases/uc-par-02-create-event.md) | Main flow → 2a. The person closes the editor without saving | The draft stays on the device for 7 days and resuming it is offered. |
| `CP-PAR-05` | [`UC-PAR-02`](use-cases/uc-par-02-create-event.md) | Main flow → 5a. The event is paid and publishing is requested without a linked Mercado Pago account | The API rejects it; saving it as a draft is allowed. |
| `CP-PAR-06` | [`UC-PAR-02`](use-cases/uc-par-02-create-event.md) | Main flow → 4a. Some data is invalid | The editor opens the section with the error. |
| `CP-PAR-07` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | 1) The person chooses to edit an event. 2) The client loads the full details with `GET /events/{id}` and opens the editor. 3) The person changes data or the state: draft, published or completed. The editor does not offer “Cancelled”: to cancel the event, the “Cancel event” action is used ([UC-PAR-04](use-cases/uc-par-04-cancel-event.md)). 4) The client sends `PUT /partner/events/{id}`, with the state only when it changed and with `clearFields` naming each optional field the person emptied. 5) The API checks that the event belongs to the person, applies only the fields sent, empties the optional fields listed in `clearFields` and applies the state transition. | The event was updated with its new state. |
| `CP-PAR-21` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | Main flow → 4a. The state did not change, or the event is sold out and the editor shows it as published | The client does not send the state and the API keeps the current one. |
| `CP-PAR-23` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | Main flow → 4b. The person emptied an optional field, such as the contact phone or the website | The client names it in `clearFields` and the API clears it. |
| `CP-PAR-08` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | Main flow → 5a. The event belongs to someone else | The API answers 422. |
| `CP-PAR-09` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | Main flow → 5b. The transition is not allowed, such as moving a cancelled event back to draft | The API answers 400. |
| `CP-PAR-10` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | Main flow → 5c. The event is paid, stays published or sold out and the Mercado Pago account is missing | The API rejects it. |
| `CP-PAR-22` | [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | Main flow → 5d. The request asks to move the event to cancelled | The API answers 400 `USE_CANCEL_ENDPOINT`. |
| `CP-PAR-11` | [`UC-PAR-04`](use-cases/uc-par-04-cancel-event.md) | 1) The person chooses “Cancel event”. 2) The client shows the dialog with the preselected reason “Unforeseen circumstances” and warns that cancelling is final, that the event cannot be published again and that online payments are refunded automatically through Mercado Pago, which cannot be undone. 3) The person confirms, changing the reason if they want. 4) The client sends `DELETE /partner/events/{id}` with the reason. 5) The API checks ownership, cancels the event without deleting it and answers `204`. | The event was cancelled; registered people get the notice and online payments are refunded. |
| `CP-PAR-12` | [`UC-PAR-04`](use-cases/uc-par-04-cancel-event.md) | Main flow → 3a. The reason is “Other” | An optional note of up to 280 characters appears. |
| `CP-PAR-13` | [`UC-PAR-04`](use-cases/uc-par-04-cancel-event.md) | Main flow → 3b. The person chooses “Keep event” | It is not cancelled. |
| `CP-PAR-14` | [`UC-PAR-04`](use-cases/uc-par-04-cancel-event.md) | Main flow → 5a. The event is completed | The API answers 400. |
| `CP-PAR-15` | [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | 1) The person opens an event's registrations. 2) The client calls `GET /events/{eventId}/registrations` and shows each registration with its state. 3) The client offers only the actions possible for the state and whether the event is paid. 4) The person approves, waitlists or rejects, with an optional note. 5) The client sends `PATCH /events/{eventId}/registrations/{registrationId}` and the API applies the transition. | The reviewed registrations were approved, waitlisted or rejected. |
| `CP-PAR-16` | [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | Main flow → 4a. Rejecting asks for confirmation. | Rejecting asks for confirmation. |
| `CP-PAR-17` | [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | Main flow → 5a. The event belongs to someone else | The API rejects it even if the ID is known. |
| `CP-PAR-18` | [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | Main flow → 5b. The registration is already confirmed or finished | It cannot be rejected. |
| `CP-PAR-19` | [`UC-PAR-06`](use-cases/uc-par-06-organizer-notices.md) | 1) The system emails the organizer for each new registration. 2) It adds up confirmed, requested and cancelled for the event over 15 minutes. 3) A job checks due summaries every minute. 4) It sends one push per event with the totals, which opens the organizer's events. | The organizer got an email for each registration and a push with the totals. |
| `CP-PAR-20` | [`UC-PAR-06`](use-cases/uc-par-06-organizer-notices.md) | Main flow → 4a. The event was cancelled | The summary is dropped. |

## Traceability matrix

| Use case | Requirements | Test cases | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-PAR-01`](use-cases/uc-par-01-list-own-events.md) | RF-WEB-PAR-01, RF-APK-PAR-01 | CP-PAR-01, CP-PAR-02 | 0 | 4 | 4 |
| [`UC-PAR-02`](use-cases/uc-par-02-create-event.md) | RF-WEB-PAR-02, RF-APK-PAR-02 | CP-PAR-03, CP-PAR-04, CP-PAR-05, CP-PAR-06 | 1 | 2 | 3 |
| [`UC-PAR-03`](use-cases/uc-par-03-edit-event.md) | RF-WEB-PAR-03, RF-WEB-PAR-04, RF-APK-PAR-03, RF-APK-PAR-04 | CP-PAR-07, CP-PAR-21, CP-PAR-23, CP-PAR-08, CP-PAR-09, CP-PAR-10, CP-PAR-22 | 4 | 4 | 2 |
| [`UC-PAR-04`](use-cases/uc-par-04-cancel-event.md) | RF-WEB-PAR-05, RF-APK-PAR-05 | CP-PAR-11, CP-PAR-12, CP-PAR-13, CP-PAR-14 | 2 | 2 | 3 |
| [`UC-PAR-05`](use-cases/uc-par-05-review-registrations.md) | RF-WEB-PAR-06, RF-WEB-PAR-07, RF-APK-PAR-06, RF-APK-PAR-07 | CP-PAR-15, CP-PAR-16, CP-PAR-17, CP-PAR-18 | 2 | 0 | 2 |
| [`UC-PAR-06`](use-cases/uc-par-06-organizer-notices.md) | — | CP-PAR-19, CP-PAR-20 | 3 | n/a | n/a |

The Backend, Web and App columns count the test files that exercise the case; the detail is in each use case. "n/a" means the case does not apply to that platform.

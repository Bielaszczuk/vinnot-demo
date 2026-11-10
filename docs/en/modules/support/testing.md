# Testing

Test cases of the module: one for the main flow of each use case and one for each alternative flow. They can be run by hand on the web and in the app; the automated tests column shows which tests exercise the use case.

## Test cases

| ID | Use case | Steps | Expected result |
|---|---|---|---|
| `CP-SUP-01` | [`UC-SUP-01`](use-cases/uc-sup-01-read-public-information.md) | 1) The person opens “About Vinnot” or “Help”. 2) The client shows the content in their language, which ships with the app and is not requested from the API. 3) In help, the person types in the search. 4) The client filters the questions by title and text, ignoring case and accents. 5) The person opens an answer or goes on to contact or the legal documents. | The person read the presentation or found an answer in help. |
| `CP-SUP-02` | [`UC-SUP-01`](use-cases/uc-sup-01-read-public-information.md) | Main flow → 4a. No question matches | Trying another search or writing to the team is suggested. |
| `CP-SUP-03` | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | 1) The person opens Contact. 2) They fill in name, email, reason and message; the reasons are support, privacy, report, decision review, partnership and general enquiry. 3) The client generates a request ID and sends `POST /support/requests`. 4) The API validates the data, saves the enquiry and queues an English email for the team, replying straight to the sender. 5) It queues an acknowledgement to the typed email, in the form's language, with only the reference and the reason. 6) The API answers 202 with the ID; the client shows the `VIN-…` reference and lets the person copy it. | The enquiry was recorded, the team receives an email and the person has a reference. |
| `CP-SUP-04` | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | Main flow → 3a. Sending fails | The form keeps what was written and retrying the same content reuses the ID, without duplicating the enquiry. |
| `CP-SUP-05` | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | Main flow → 4a. The same ID arrives with different content | The API answers 400. |
| `CP-SUP-06` | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | Main flow → 4b. The team email is not configured | The API answers 503. |
| `CP-SUP-07` | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | Main flow → 3b. The send limit was exceeded | The API answers 429 and the client says when to retry. |
| `CP-SUP-08` | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | Main flow → 5a. That address already got an acknowledgement today | No other is sent. |
| `CP-SUP-09` | [`UC-SUP-03`](use-cases/uc-sup-03-service-states.md) | 1) A request fails or the person reaches an address that does not exist. 2) The client classifies the error: session expired (401), forbidden (403), not found (404), too many requests (429), service unavailable (502 or 503), delay (504 or timeout), offline or server error. 3) It shows an illustration with a message and the matching action, such as retrying or going home. | The person understands what happened and what they can do. |
| `CP-SUP-10` | [`UC-SUP-03`](use-cases/uc-sup-03-service-states.md) | Main flow → 1a. The address does not exist | “not found” is shown. |

## Traceability matrix

| Use case | Requirements | Test cases | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-SUP-01`](use-cases/uc-sup-01-read-public-information.md) | RF-WEB-SUP-01, RF-APK-SUP-01 | CP-SUP-01, CP-SUP-02 | 0 | 2 | 1 |
| [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | RF-WEB-SUP-02, RF-WEB-SUP-03, RF-WEB-SUP-04, RF-APK-SUP-02, RF-APK-SUP-03, RF-APK-SUP-04 | CP-SUP-03, CP-SUP-04, CP-SUP-05, CP-SUP-06, CP-SUP-07, CP-SUP-08 | 6 | 5 | 5 |
| [`UC-SUP-03`](use-cases/uc-sup-03-service-states.md) | RF-WEB-SUP-05, RF-APK-SUP-05 | CP-SUP-09, CP-SUP-10 | 0 | 1 | 1 |

The Backend, Web and App columns count the test files that exercise the case; the detail is in each use case. "n/a" means the case does not apply to that platform.

# Testing

Test cases of the module: one for the main flow of each use case and one for each alternative flow. They can be run by hand on the web and in the app; the automated tests column shows which tests exercise the use case.

## Test cases

| ID | Use case | Steps | Expected result |
|---|---|---|---|
| `CP-COM-01` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | 1) The person chooses “Report” on the content or, on a review or a comment, “Report user” for its author. 2) They pick a reason: spam, harassment, hate, sexual content, violence, privacy, misinformation or other. 3) They can add a description of up to 2000 characters. 4) The client sends `POST /community/reports` with the content type and ID, the reason and the description. 5) The API checks that the content is public and not the reporter's, and stores the author and an excerpt of the content. 6) The API stores the report as `OPEN` and returns the receipt; the client confirms the submission. | The report is open for the moderation team and the person gets a receipt. |
| `CP-COM-02` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Main flow → 3a. The reason is “Other” and the description is missing | It cannot be sent and the API answers 422 `INVALID_REPORT_DESCRIPTION`. |
| `CP-COM-03` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Main flow → 5a. The person already has an open report on that content | The API returns that same receipt without creating another. |
| `CP-COM-04` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Main flow → 5b. The person exceeded 10 reports in 24 hours | The API answers 422 `REPORT_LIMIT` and the client explains that the daily limit was reached and that they can report again later. |
| `CP-COM-05` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Main flow → 5c. The content is their own | The API answers 422 `SELF_REPORT` and the client says that one's own content cannot be reported. |
| `CP-COM-06` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Main flow → 5d. The content is no longer public | The API answers 404 and the client says that the content is no longer available. |
| `CP-COM-07` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Main flow → 4a. The limit of 10 submissions per hour was exceeded | The API answers 429 and the client asks to wait a while before retrying. Support requests stay available. |
| `CP-COM-08` | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | Main flow → 4b. Sending fails | The client keeps the draft to retry. |
| `CP-COM-09` | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | 1) The person chooses “Block” on the review or the comment. 2) The client explains the effect and asks for confirmation. 3) The client sends `PUT /community/blocks/{userId}`. 4) The API stores the block and answers 204. 5) The client discards the stored reviews, comments and profiles and reloads them without that account's content. | The other account is blocked for the person. |
| `CP-COM-10` | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | Main flow → 2a. The person cancels | Nothing is blocked. |
| `CP-COM-11` | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | Main flow → 4a. The account was already blocked | The API answers 204 anyway. |
| `CP-COM-12` | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | Main flow → 4b. It is the person's own account | The API answers 422 `SELF_BLOCK` and the client says that one's own account cannot be blocked. |
| `CP-COM-13` | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | Main flow → 4c. The account does not exist | The API answers 404 and the client says that the content is no longer available. |
| `CP-COM-14` | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | Main flow → 4d. Blocking fails | The previous view is kept. |
| `CP-COM-15` | [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | 1) The person opens their community activity: on the web the `/community` page, from the profile; on the app from the profile. 2) The client calls `GET /community/overview` with the report totals per status and the number of blocked accounts. 3) It calls `GET /community/reports/mine` and `GET /community/blocks`, each paged separately. 4) It shows each report with its target, status and date, and each blocked account with its name and date. | The person sees their reports and blocks, and can unblock accounts. |
| `CP-COM-16` | [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | Main flow → 4a. The person unblocks an account | The client sends `DELETE /community/blocks/{userId}`, the API answers 204 and the list is updated. |
| `CP-COM-17` | [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | Main flow → 4b. There are no reports or blocks | The empty state is shown with a link to Contact. |
| `CP-COM-18` | [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | Main flow → 2a. The request fails | The error is shown, not a zero. |
| `CP-COM-19` | [`UC-COM-04`](use-cases/uc-com-04-report-outcome-and-retention.md) | 1) A moderator resolves or dismisses a report, or removes the reported content ([Administration](../admin/README.md)). 2) The API queues a `REPORT_OUTCOME` email for the reporter, with the outcome. 3) If the content was removed, its author gets a `CONTENT_REMOVED` email. 4) Every hour the scheduled job deletes up to 500 reports closed more than 90 days ago, with their action history. | The reporter knows the outcome and old closed reports are deleted. |
| `CP-COM-20` | [`UC-COM-04`](use-cases/uc-com-04-report-outcome-and-retention.md) | Main flow → 2a. The same outcome was already notified | The notice key prevents a second email. |
| `CP-COM-21` | [`UC-COM-04`](use-cases/uc-com-04-report-outcome-and-retention.md) | Main flow → 4a. More than 500 are due | The rest are deleted in the following runs. |

## Traceability matrix

| Use case | Requirements | Test cases | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | RF-WEB-COM-01, RF-WEB-COM-02, RF-APK-COM-01, RF-APK-COM-02 | CP-COM-01, CP-COM-02, CP-COM-03, CP-COM-04, CP-COM-05, CP-COM-06, CP-COM-07, CP-COM-08 | 4 | 4 | 2 |
| [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | RF-WEB-COM-03, RF-APK-COM-03 | CP-COM-09, CP-COM-10, CP-COM-11, CP-COM-12, CP-COM-13, CP-COM-14 | 2 | 2 | 1 |
| [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | RF-WEB-COM-04, RF-APK-COM-04 | CP-COM-15, CP-COM-16, CP-COM-17, CP-COM-18 | 2 | 2 | 1 |
| [`UC-COM-04`](use-cases/uc-com-04-report-outcome-and-retention.md) | — | CP-COM-19, CP-COM-20, CP-COM-21 | 4 | n/a | n/a |

The Backend, Web and App columns count the test files that exercise the case; the detail is in each use case. "n/a" means the case does not apply to that platform.

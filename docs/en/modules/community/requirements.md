# Functional requirements

Functional requirements of the module, split by platform. The "Previous ID" column keeps the identifier they had in the per-platform specification.

## Web

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-WEB-COM-01` | Report content in context. | Review, comment, user, event or route is identified by type/ID; reporting one's own content is rejected, and the action is hidden from the author or the event organizer. | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | `RF-WEB-SAFETY-001` |
| `RF-WEB-COM-02` | Select a reason and explain the report. | Spam, harassment, hate, sexual, violence, privacy, misinformation or other; OTHER requires details, up to 2000 characters. | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | `RF-WEB-SAFETY-002` |
| `RF-WEB-COM-03` | Block and unblock other users. | Contextual confirmation records a personal block; the blocked list allows reversal and is distinct from administrative banning. | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | `RF-WEB-SAFETY-003` |
| `RF-WEB-COM-04` | View personal cases and overview. | Shows available references, dates, status and counts; private evidence and other cases' internal notes are not exposed. | [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | `RF-WEB-SAFETY-004` |

## APK

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-APK-COM-01` | Report content in context. | Review, comment, user, event or route is identified by type/ID; reporting one's own content is rejected, and the action is hidden from the author or the event organizer. | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | `RF-APK-SAFETY-001` |
| `RF-APK-COM-02` | Select a reason and explain the report. | Spam, harassment, hate, sexual, violence, privacy, misinformation or other; OTHER requires details, up to 2000 characters. | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | `RF-APK-SAFETY-002` |
| `RF-APK-COM-03` | Block and unblock other users. | Contextual confirmation records a personal block; the blocked list allows reversal and is distinct from administrative banning. | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | `RF-APK-SAFETY-003` |
| `RF-APK-COM-04` | View personal cases and overview. | Shows available references, dates, status and counts; private evidence and other cases' internal notes are not exposed. | [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | `RF-APK-SAFETY-004` |

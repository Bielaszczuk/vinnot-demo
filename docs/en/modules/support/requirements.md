# Functional requirements

Functional requirements of the module, split by platform. The "Previous ID" column keeps the identifier they had in the per-platform specification.

## Web

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-WEB-SUP-01` | Read product information and help. | About Vinnot and help explain the product and link to contact and documents. | [`UC-SUP-01`](use-cases/uc-sup-01-read-public-information.md) | `RF-WEB-PUB-001` |
| `RF-WEB-SUP-02` | Submit a support enquiry. | Valid name, email, category and message produce a receipt reference; failure keeps the form and supports retry. | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | `RF-WEB-PUB-003` |
| `RF-WEB-SUP-03` | Select a contact topic. | Support, privacy, reporting, decision review, partnership and general enquiry are offered; signed-in requests use the account email. | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | `RF-WEB-PUB-004` |
| `RF-WEB-SUP-04` | Avoid duplicate enquiries on retry. | Retrying unchanged content retains requestId; changing content creates another request and concurrent submissions are blocked. | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | `RF-WEB-PUB-005` |
| `RF-WEB-SUP-05` | View errors and service states. | Not-found, forbidden, error, unavailable, rate-limit, offline and timeout views exist; these are distinct from an empty result. | [`UC-SUP-03`](use-cases/uc-sup-03-service-states.md) | `RF-WEB-PUB-006` |

## APK

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-APK-SUP-01` | Read product information and help. | About Vinnot and help explain the product and link to contact and documents. | [`UC-SUP-01`](use-cases/uc-sup-01-read-public-information.md) | `RF-APK-PUB-001` |
| `RF-APK-SUP-02` | Submit a support enquiry. | Valid name, email, category and message produce a receipt reference; failure keeps the form and supports retry. | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | `RF-APK-PUB-003` |
| `RF-APK-SUP-03` | Select a contact topic. | Support, privacy, reporting, decision review, partnership and general enquiry are offered; signed-in requests use the account email. | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | `RF-APK-PUB-004` |
| `RF-APK-SUP-04` | Avoid duplicate enquiries on retry. | Retrying unchanged content retains requestId; changing content creates another request and concurrent submissions are blocked. | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | `RF-APK-PUB-005` |
| `RF-APK-SUP-05` | View errors and service states. | Not-found, forbidden, error, unavailable, rate-limit, offline and timeout views exist; these are distinct from an empty result. | [`UC-SUP-03`](use-cases/uc-sup-03-service-states.md) | `RF-APK-PUB-006` |

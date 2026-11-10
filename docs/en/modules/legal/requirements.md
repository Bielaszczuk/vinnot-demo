# Functional requirements

Functional requirements of the module, split by platform. The "Previous ID" column keeps the identifier they had in the per-platform specification.

## Web

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-WEB-LEG-01` | Read the legal centre and ES/EN documents. | Terms, privacy, content rules, moderation, trust/safety, ranking, events/payments/cancellations and storage open without a session. | [`UC-LEG-01`](use-cases/uc-leg-01-legal-centre.md) | `RF-WEB-PUB-002` |
| `RF-WEB-LEG-02` | Present versioned terms during registration. | The current document is loaded and explicit selection required; terms acceptance does not enable marketing or optional permissions. | [`UC-LEG-02`](use-cases/uc-leg-02-accept-at-sign-up.md) | `RF-WEB-LEGAL-001` |
| `RF-WEB-LEG-03` | Check acceptance before enabling product features. | Account acceptance is queried; the check displays a waiting state and does not assume terms are missing. | [`UC-LEG-03`](use-cases/uc-leg-03-check-acceptance.md) | `RF-WEB-LEGAL-002` |
| `RF-WEB-LEG-04` | Request acceptance when the current version is missing. | The document, checkbox and accept action are shown; only server confirmation releases access. | [`UC-LEG-04`](use-cases/uc-leg-04-accept-current-version.md) | `RF-WEB-LEGAL-003` |
| `RF-WEB-LEG-05` | Persist account-linked evidence. | Document version, language and hash form the acceptance; another platform reads the same backend evidence. | [`UC-LEG-04`](use-cases/uc-leg-04-accept-current-version.md) | `RF-WEB-LEGAL-004` |
| `RF-WEB-LEG-06` | Recover a failed check or changed document. | Failure allows reloading; a changed document invalidates selection and a new version is not accepted automatically. | [`UC-LEG-04`](use-cases/uc-leg-04-accept-current-version.md) | `RF-WEB-LEGAL-005` |
| `RF-WEB-LEG-07` | Decline continuation and retain information access. | The «Not now» button signs out; legal centre/contact remain available and refusal is not treated as consent. | [`UC-LEG-05`](use-cases/uc-leg-05-decline-and-sign-out.md) | `RF-WEB-LEGAL-006` |

## APK

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-APK-LEG-01` | Read the legal centre and ES/EN documents. | Terms, privacy, content rules, moderation, trust/safety, ranking, events/payments/cancellations and storage open without a session. | [`UC-LEG-01`](use-cases/uc-leg-01-legal-centre.md) | `RF-APK-PUB-002` |
| `RF-APK-LEG-02` | Present versioned terms during registration. | The current document is loaded and explicit selection required; terms acceptance does not enable marketing or optional permissions. | [`UC-LEG-02`](use-cases/uc-leg-02-accept-at-sign-up.md) | `RF-APK-LEGAL-001` |
| `RF-APK-LEG-03` | Check acceptance before enabling product features. | Account acceptance is queried; the check displays a waiting state and does not assume terms are missing. | [`UC-LEG-03`](use-cases/uc-leg-03-check-acceptance.md) | `RF-APK-LEGAL-002` |
| `RF-APK-LEG-04` | Request acceptance when the current version is missing. | The document, checkbox and accept action are shown; only server confirmation releases access. | [`UC-LEG-04`](use-cases/uc-leg-04-accept-current-version.md) | `RF-APK-LEGAL-003` |
| `RF-APK-LEG-05` | Persist account-linked evidence. | Document version, language and hash form the acceptance; another platform reads the same backend evidence. | [`UC-LEG-04`](use-cases/uc-leg-04-accept-current-version.md) | `RF-APK-LEGAL-004` |
| `RF-APK-LEG-06` | Recover a failed check or changed document. | Failure allows reloading; a changed document invalidates selection and a new version is not accepted automatically. | [`UC-LEG-04`](use-cases/uc-leg-04-accept-current-version.md) | `RF-APK-LEGAL-005` |
| `RF-APK-LEG-07` | Decline continuation and retain information access. | The «Not now» button signs out; legal centre/contact remain available and refusal is not treated as consent. | [`UC-LEG-05`](use-cases/uc-leg-05-decline-and-sign-out.md) | `RF-APK-LEGAL-006` |

# Functional requirements

Functional requirements of the module, split by platform. The "Previous ID" column keeps the identifier they had in the per-platform specification.

## Web

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-WEB-AI-01` | Read availability and a persisted profile. | Reading by wine/language distinguishes available from absent; profile GET does not initiate generation itself. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-WEB-AI-001` |
| `RF-WEB-AI-02` | Request generation when needed. | Generation obtains confirmed content or cache; the visible process does not promise a fixed response time. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-WEB-AI-002` |
| `RF-WEB-AI-03` | Present every received profile section. | Summary, visual, aromas, palate, flavours, pairings, service, occasions and similar wines appear when present; missing scores are not invented. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-WEB-AI-003` |
| `RF-WEB-AI-04` | Separate ES/EN content and its cache. | Language participates in the request; changing language does not freely translate in the UI or overwrite the other profile. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-WEB-AI-004` |
| `RF-WEB-AI-05` | Compare two different catalogue wines. | With A and B selected the comparison is queried automatically and produces backend attributes and conclusion; invalid selection does not start a comparison. | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | `RF-WEB-AI-005` |
| `RF-WEB-AI-06` | Report failures and support AI recovery. | Network, timeout and HTTP failures are distinguished; selection is kept and no winner is declared without a valid response. | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | `RF-WEB-AI-006` |
| `RF-WEB-AI-07` | Treat editing and regeneration as distinct actions. | Authorized ADMIN/MODERATOR edit the active language without invoking AI; forced regeneration uses its authorized endpoint and confirmation. | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | `RF-WEB-AI-007` |
| `RF-WEB-AI-08` | Edit expert profiles through web administration. | Structured text/list/section editor retains language and content; the direct mobile entry is not claimed as an implemented web button. | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | `RF-WEB-WEBX-006` |

## APK

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-APK-AI-01` | Read availability and a persisted profile. | Reading by wine/language distinguishes available from absent; profile GET does not initiate generation itself. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-APK-AI-001` |
| `RF-APK-AI-02` | Request generation when needed. | Generation obtains confirmed content or cache; the visible process does not promise a fixed response time. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-APK-AI-002` |
| `RF-APK-AI-03` | Present every received profile section. | Summary, visual, aromas, palate, flavours, pairings, service, occasions and similar wines appear when present; missing scores are not invented. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-APK-AI-003` |
| `RF-APK-AI-04` | Separate ES/EN content and its cache. | Language participates in the request; changing language does not freely translate in the UI or overwrite the other profile. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-APK-AI-004` |
| `RF-APK-AI-05` | Compare two different catalogue wines. | Selecting A/B and explicitly submitting produces backend attributes and conclusion; invalid selection does not start a comparison. | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | `RF-APK-AI-005` |
| `RF-APK-AI-06` | Report failures and support AI recovery. | Network, timeout and HTTP failures are distinguished; selection is kept and no winner is declared without a valid response. | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | `RF-APK-AI-006` |
| `RF-APK-AI-07` | Treat editing and regeneration as distinct actions. | Authorized ADMIN/MODERATOR edit the active language without invoking AI; forced regeneration uses its authorized endpoint and confirmation. | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | `RF-APK-AI-007` |
| `RF-APK-AI-08` | Edit an expert profile visually from two entries. | ADMIN/MODERATOR opens the editor from admin or complete profile; editable cards/lists/scores replace raw JSON and save the active language. | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | `RF-APK-APKX-007` |
| `RF-APK-AI-09` | Validate and restore an expert-profile draft. | Non-empty summary, optional scores 0–100 with decimal comma; Restore reverts, dirty exit confirms and failure retains the draft. | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | `RF-APK-APKX-008` |
| `RF-APK-AI-10` | Keep editor actions reachable with the keyboard. | Editor scrolls content and action bar; Android uses window adjustment, iOS padding/insets; no full-screen JSON textarea is exposed. | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | `RF-APK-APKX-009` |

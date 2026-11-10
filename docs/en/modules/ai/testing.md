# Testing

Test cases of the module: one for the main flow of each use case and one for each alternative flow. They can be run by hand on the web and in the app; the automated tests column shows which tests exercise the use case.

## Test cases

| ID | Use case | Steps | Expected result |
|---|---|---|---|
| `CP-AI-01` | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | 1) The person opens the AI profile: on the web, from the sommelier card; on the app, from the wine's “Exclusive Sommelier” card with “View Profile” or “Generate profile”, or from the “Profile” tab, which shows the saved profile. 2) The client calls `GET /wines/{wineId}/ai-profile` in the interface language. 3) The API returns the saved profile without generating anything. 4) The client shows summary, visual analysis, aromas, palate, flavors, pairings, serving, occasions and similar wines, only the sections that exist. | The person sees the wine's sommelier profile in their language. |
| `CP-AI-20` | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | Main flow → 2a. The wine does not exist, or it is inactive and the person neither created it nor moderates the catalog | The API answers 404 `NOT_FOUND` without reading or generating any profile. |
| `CP-AI-02` | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | Main flow → 3a. There is no profile | The API answers 404 and the client treats it as a profile still to generate. The web shows “This wine has no AI profile yet” and the app “Profile unavailable”, both with “Generate profile”; it also requests it on arrival with “generate”. The client sends `POST /wines/{wineId}/ai-profile`. |
| `CP-AI-03` | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | Main flow → 3b. The API reuses the profile if it exists in both languages and the wine and model did not change; otherwise it generates it in Spanish and English and saves both together. | The API reuses the profile if it exists in both languages and the wine and model did not change; otherwise it generates it in Spanish and English and saves both together. |
| `CP-AI-04` | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | Main flow → 3c. Someone else is already generating the same profile | The API waits for that result instead of calling AI again. |
| `CP-AI-05` | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | Main flow → 3d. AI is unavailable or the budget is exhausted | The API answers 503 and the client allows retrying. |
| `CP-AI-06` | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | 1) The person opens Compare, from a wine or from the catalog. 2) They choose wine A and wine B with the search. 3) The client sends `POST /wines/compare`: on the web as soon as there are two wines; on the app, when tapping “Compare”. 4) The API checks that the person can see both wines and reuses the saved comparison for that pair and language, or generates it in Spanish and English. 5) The client shows summary, differences, similarities, attribute table, what each one suits and the recommendation. | The person sees the comparison of the two wines with attributes and a recommendation. |
| `CP-AI-07` | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | Main flow → 3a. A and B are the same wine | The web search does not offer the wine already in the other slot and the app does not allow comparing; the API answers 422. |
| `CP-AI-08` | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | Main flow → 4a. AI is unavailable or the budget is exhausted | The API answers 503 and the client keeps the selection and allows retrying. |
| `CP-AI-09` | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | Main flow → 4b. The network fails or the time runs out | The client tells it apart from a server error and shows no recommendation. |
| `CP-AI-10` | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | 1) The editor shows the profile sections in the active language as texts, lists and scores. 2) The person edits and saves. 3) The client sends `PATCH /wines/{wineId}/ai-profile` without calling AI. 4) The API validates the content and saves it. | The profile in the active language was edited or regenerated. |
| `CP-AI-11` | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | Main flow → 2a. The person chooses “Regenerate” and confirms | The client sends `POST /wines/{wineId}/ai-profile/generate` and the API generates both languages again, replacing the manual edits. |
| `CP-AI-12` | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | Main flow → 4a. The summary is missing, a section does not have the expected shape or a score is outside 0 to 100 | The API answers 400. |
| `CP-AI-13` | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | Main flow → 4b. The profile changed while it was being generated | The API answers 409. |
| `CP-AI-14` | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | Main flow → 2b. On the app the person leaves with unsaved changes | Confirmation is asked; “Restore” goes back to the saved content. |
| `CP-AI-15` | [`UC-AI-04`](use-cases/uc-ai-04-control-ai-cost.md) | 1) The system checks that paid calls are enabled. 2) It reserves a slot among the allowed concurrent calls. 3) It reserves the call's maximum cost against the monthly budget and, if set, the daily one. 4) It makes the call to the provider. 5) It records the real cost and releases the slot. | The call was made within budget or rejected at no cost. |
| `CP-AI-16` | [`UC-AI-04`](use-cases/uc-ai-04-control-ai-cost.md) | Main flow → 1a. Paid calls are paused | It is rejected with 503. |
| `CP-AI-17` | [`UC-AI-04`](use-cases/uc-ai-04-control-ai-cost.md) | Main flow → 2a. There is no free slot | It is rejected with 503. |
| `CP-AI-18` | [`UC-AI-04`](use-cases/uc-ai-04-control-ai-cost.md) | Main flow → 3a. The budget is not enough | It is rejected with 503. |
| `CP-AI-19` | [`UC-AI-04`](use-cases/uc-ai-04-control-ai-cost.md) | Main flow → 4a. It is unknown whether the call was charged | The cost stays reserved as unknown. |

## Traceability matrix

| Use case | Requirements | Test cases | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | RF-WEB-AI-01, RF-WEB-AI-02, RF-WEB-AI-03, RF-WEB-AI-04, RF-APK-AI-01, RF-APK-AI-02, RF-APK-AI-03, RF-APK-AI-04 | CP-AI-01, CP-AI-20, CP-AI-02, CP-AI-03, CP-AI-04, CP-AI-05 | 8 | 3 | 2 |
| [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | RF-WEB-AI-05, RF-WEB-AI-06, RF-APK-AI-05, RF-APK-AI-06 | CP-AI-06, CP-AI-07, CP-AI-08, CP-AI-09 | 5 | 2 | 4 |
| [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | RF-WEB-AI-07, RF-WEB-AI-08, RF-APK-AI-07, RF-APK-AI-08, RF-APK-AI-09, RF-APK-AI-10 | CP-AI-10, CP-AI-11, CP-AI-12, CP-AI-13, CP-AI-14 | 3 | 0 | 2 |
| [`UC-AI-04`](use-cases/uc-ai-04-control-ai-cost.md) | — | CP-AI-15, CP-AI-16, CP-AI-17, CP-AI-18, CP-AI-19 | 4 | n/a | n/a |

The Backend, Web and App columns count the test files that exercise the case; the detail is in each use case. "n/a" means the case does not apply to that platform.

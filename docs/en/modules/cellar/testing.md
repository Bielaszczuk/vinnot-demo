# Testing

Test cases of the module: one for the main flow of each use case and one for each alternative flow. They can be run by hand on the web and in the app; the automated tests column shows which tests exercise the use case.

## Test cases

| ID | Use case | Steps | Expected result |
|---|---|---|---|
| `CP-CEL-01` | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | 1) The person opens “My Cellar”: on the web from the menu or the home page; on the app from home, the profile or a wine's page. 2) The client calls `GET /cellar`. 3) The API returns only the person's entries, each with the wine, the personal rating, the purchase price, the notes, the dates and their own review when there is one. 4) The client calculates the number of wines, the average of the rated ones, the distinct regions and the mix of wine types; it does not add up a total invested. 5) It shows the metrics and the wine list. | The wines in their cellar are shown with their personal data and the collection metrics. |
| `CP-CEL-02` | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | Main flow → 3a. The cellar is empty | The empty state is shown with a way to add wines. |
| `CP-CEL-03` | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | Main flow → 5a. On the app the person searches by name, winery, region, country or notes, or filters by all, rated or with notes | The list is filtered on the device. |
| `CP-CEL-04` | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | Main flow → 5b. On the app the person pulls down | The list reloads. |
| `CP-CEL-05` | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | Main flow → 2a. The request fails | The error is shown with a retry option. |
| `CP-CEL-06` | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | 1) On the web the person chooses “Add to my cellar” on the wine's page; on the app they use the page's button or the cellar's add button and search for the wine. 2) They optionally enter a rating from 0.1 to 5.0, notes and the purchase price. 3) The client sends `POST /cellar` with the wine and that data. 4) The API checks that the wine is not already in the person's cellar and stores the entry. 5) The API answers 201 and the client confirms (“Wine added to your cellar” on the web) and updates the cellar. | The wine is in the person's cellar with the data they entered. |
| `CP-CEL-07` | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | Main flow → 1a. The wine is already in the cellar | The web shows it on the page and the app opens the cellar instead of the form. |
| `CP-CEL-08` | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | Main flow → 4a. The wine is already in the cellar | The API answers 422, or 409 if two requests arrived at once. |
| `CP-CEL-26` | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | Main flow → 1b. The app's search shows a wine that is already in the cellar | It appears with “Already in your cellar” and cannot be picked. |
| `CP-CEL-09` | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | Main flow → 3a. The rating is outside 0.1 to 5.0 or has more than one decimal, the price is negative or the notes exceed 10000 characters | The API answers 400. |
| `CP-CEL-10` | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | 1) The person chooses “Edit notes” on a wine in their cellar. 2) The form opens with the current rating, notes and price. 3) The person changes the data and saves. 4) The client sends `PATCH /cellar/{id}` with the three fields. 5) The API checks that the entry belongs to the person and replaces the three fields, empty ones included. 6) The API answers 200 and the client updates the entry and the metrics. | The entry has the new rating, price and notes. |
| `CP-CEL-11` | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | Main flow → 3a. On the web the person taps the chosen star | The rating is cleared. |
| `CP-CEL-12` | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | Main flow → 5a. The entry belongs to someone else | The API answers 422 `CELLAR_ENTRY_OWNERSHIP`. |
| `CP-CEL-13` | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | Main flow → 5b. The entry no longer exists | The API answers 404. |
| `CP-CEL-14` | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | Main flow → 4a. A field is out of range | The API answers 400. |
| `CP-CEL-15` | [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | 1) The person chooses “Delete” on the web, or on the app chooses “Delete” in the entry's “⋯” menu or swipes the entry. 2) The client asks for confirmation. 3) The client sends `DELETE /cellar/{id}`. 4) The API checks that the entry belongs to the person and deletes it. 5) The API answers 204 and the client removes the wine, updates the metrics and, on the web, says “Wine removed from your cellar”. | The wine is no longer in the cellar; the catalog wine and the review remain. |
| `CP-CEL-16` | [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | Main flow → 2a. The person cancels | Nothing is deleted. |
| `CP-CEL-17` | [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | Main flow → 4a. The entry belongs to someone else | The API answers 422 `CELLAR_ENTRY_OWNERSHIP`. |
| `CP-CEL-18` | [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | Main flow → 4b. The entry no longer exists | The API answers 404. |
| `CP-CEL-19` | [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | 1) The person chooses to publish the review from a wine in their cellar. 2) The client calls `GET /wines/{wineId}/reviews/mine` to know whether they already have a review. 3) The review form opens with the cellar's rating and notes as a draft. 4) The person reviews the draft and confirms. 5) The client publishes the review with `POST /wines/{wineId}/reviews` ([UC-REV-02](../reviews/use-cases/uc-rev-02-publish-review.md)). | The note is published as a review of the wine, or the existing review is opened. |
| `CP-CEL-20` | [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | Main flow → 2a. An own review already exists | The web opens the wine's page at that review (`?review=mine`) and the app shows it for editing; it is not replaced automatically. |
| `CP-CEL-21` | [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | Main flow → 3a. The cellar has no rating | A rating must be chosen before publishing (stars on the web, glasses on the app). |
| `CP-CEL-22` | [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | Main flow → 4a. The person cancels | Nothing is published and the cellar does not change. |
| `CP-CEL-23` | [`UC-CEL-06`](use-cases/uc-cel-06-cellar-statistics.md) | 1) `GET /cellar/stats` is called for one's own cellar or `GET /cellar/user/{userId}/stats` for another. 2) The API checks that the caller is the owner or an administrator. 3) It calculates the number of wines, the rated ones, the average, the distinct wineries and regions and the count per wine type. 4) It returns `CellarStatsResponse`. | The statistics or entries of the requested cellar are returned. |
| `CP-CEL-24` | [`UC-CEL-06`](use-cases/uc-cel-06-cellar-statistics.md) | Main flow → 1a. Another person's list is requested with `GET /cellar/user/{userId}` | The same check applies. |
| `CP-CEL-25` | [`UC-CEL-06`](use-cases/uc-cel-06-cellar-statistics.md) | Main flow → 2a. The caller is neither the owner nor an administrator | The API answers 403. |

## Traceability matrix

| Use case | Requirements | Test cases | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | RF-WEB-CEL-01, RF-WEB-CEL-02, RF-WEB-CEL-03, RF-APK-CEL-01, RF-APK-CEL-02, RF-APK-CEL-03, RF-APK-CEL-04 | CP-CEL-01, CP-CEL-02, CP-CEL-03, CP-CEL-04, CP-CEL-05 | 3 | 3 | 3 |
| [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | RF-WEB-CEL-04, RF-APK-CEL-05 | CP-CEL-06, CP-CEL-07, CP-CEL-08, CP-CEL-26, CP-CEL-09 | 2 | 3 | 2 |
| [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | RF-WEB-CEL-05, RF-APK-CEL-06 | CP-CEL-10, CP-CEL-11, CP-CEL-12, CP-CEL-13, CP-CEL-14 | 3 | 1 | 1 |
| [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | RF-WEB-CEL-06, RF-APK-CEL-07 | CP-CEL-15, CP-CEL-16, CP-CEL-17, CP-CEL-18 | 2 | 3 | 1 |
| [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | RF-WEB-CEL-07, RF-APK-CEL-08 | CP-CEL-19, CP-CEL-20, CP-CEL-21, CP-CEL-22 | 1 | 1 | 1 |
| [`UC-CEL-06`](use-cases/uc-cel-06-cellar-statistics.md) | — | CP-CEL-23, CP-CEL-24, CP-CEL-25 | 2 | n/a | n/a |

The Backend, Web and App columns count the test files that exercise the case; the detail is in each use case. "n/a" means the case does not apply to that platform.

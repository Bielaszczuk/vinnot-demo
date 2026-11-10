# Functional requirements

Functional requirements of the module, split by platform. The "Previous ID" column keeps the identifier they had in the per-platform specification.

## Web

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-WEB-CEL-01` | View the personal collection. | Only the owner's entries are fetched, including wine, personal rating, purchase price, notes and date. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-WEB-CELLAR-001` |
| `RF-WEB-CEL-02` | View collection metrics. | Count and average derive from available entries; cellar does not record bottle quantities or online purchases. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-WEB-CELLAR-006` |
| `RF-WEB-CEL-03` | Edit cellar through a modal and collection summary. | /cellar provides edit/delete and the same metrics as the app (count, average, distinct regions and type mix), with no total invested; it does not offer mobile-only swipe gestures. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-WEB-WEBX-007` |
| `RF-WEB-CEL-04` | Add a catalogue wine. | Selects wineId and personal options; an existing membership does not create a second entry for the same wine/user. | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | `RF-WEB-CELLAR-002` |
| `RF-WEB-CEL-05` | Edit entry data. | Optional rating from 0.1 to 5.0 with one decimal, non-negative purchase price and notes up to 10000 characters; the public wine detail is not changed. Saving keeps these data personal; the card says “Edit notes”. | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | `RF-WEB-CELLAR-003` |
| `RF-WEB-CEL-06` | Remove a wine with confirmation. | Deletes the entry by its ID and ownership; catalogue wine and public review are not deleted. | [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | `RF-WEB-CELLAR-004` |
| `RF-WEB-CEL-07` | Synchronize a review with the cellar. | Creating/editing a review adds or synchronizes personal rating/comment in the cellar, without erasing the notes when the review brings no comment; removing only the cellar entry does not delete the review. From Cellar, the author can review and explicitly publish a note as a review; an existing review is opened for editing without automatic replacement. “View review” opens the own review in the wine even outside the first page; “Publish as review” is offered only when absent. | [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | `RF-WEB-CELLAR-005` |

## APK

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-APK-CEL-01` | View the personal collection. | Only the owner's entries are fetched, including wine, personal rating, purchase price, notes and date. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-APK-CELLAR-001` |
| `RF-APK-CEL-02` | View collection metrics. | Count, average, distinct regions and type mix derive from available entries; no total invested is shown; cellar does not record bottle quantities or online purchases. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-APK-CELLAR-006` |
| `RF-APK-CEL-03` | Open cellar from Home/detail/statistics. | Profile's Wines in cellar card is tappable even at zero; back preserves origin or returns Home without history. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-APK-APKX-003` |
| `RF-APK-CEL-04` | Filter and remove cellar entries using gestures. | Cellar supports search, all/rated/notes, refresh, a three-dots menu per wine (edit notes, view or publish the review, open the wine, delete) and swipe deletion with confirmation. | [`UC-CEL-01`](use-cases/uc-cel-01-view-cellar.md) | `RF-APK-APKX-004` |
| `RF-APK-CEL-05` | Add a catalogue wine. | Selects wineId and personal options; an existing membership does not create a second entry for the same wine/user. | [`UC-CEL-02`](use-cases/uc-cel-02-add-wine.md) | `RF-APK-CELLAR-002` |
| `RF-APK-CEL-06` | Edit entry data. | Optional rating from 0.1 to 5.0 with one decimal, non-negative purchase price and notes up to 10000 characters; the public wine detail is not changed. Saving keeps these data personal; the card says “Edit notes”. | [`UC-CEL-03`](use-cases/uc-cel-03-edit-entry.md) | `RF-APK-CELLAR-003` |
| `RF-APK-CEL-07` | Remove a wine with confirmation. | Deletes the entry by its ID and ownership; catalogue wine and public review are not deleted. | [`UC-CEL-04`](use-cases/uc-cel-04-remove-entry.md) | `RF-APK-CELLAR-004` |
| `RF-APK-CEL-08` | Synchronize a review with the cellar. | Creating/editing a review adds or synchronizes personal rating/comment in the cellar, without erasing the notes when the review brings no comment; removing only the cellar entry does not delete the review. From Cellar, the author can review and explicitly publish a note as a review; an existing review is opened for editing without automatic replacement. “View review” opens the own review in the wine even outside the first page; “Publish as review” is offered only when absent. | [`UC-CEL-05`](use-cases/uc-cel-05-publish-note-as-review.md) | `RF-APK-CELLAR-005` |

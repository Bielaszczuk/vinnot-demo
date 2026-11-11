# Testing

Test cases of the module: one for the main flow of each use case and one for each alternative flow. They can be run by hand on the web and in the app; the automated tests column shows which tests exercise the use case.

## Test cases

| ID | Use case | Steps | Expected result |
|---|---|---|---|
| `CP-REV-01` | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | 1) The client calls `GET /wines/{wineId}/reviews` in recent order. 2) The API returns the approved reviews and the viewer's own, without those of blocked accounts. 3) The client calls `GET /wines/{wineId}/reviews/mine` to know whether the person already wrote a review. 4) The web shows pages of 20 and lets the person sort by recent or popular; the app shows pages of 10 with “Previous” and “Next” and, with more than one review, lets the person choose “Most recent” or “Most popular”. | The wine's visible reviews are shown with their author, rating, text, date and counts. Each author shows their photo, their name with the seal and their `@username` below in gray; the photo and the name open their public profile. |
| `CP-REV-02` | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | Main flow → 1a. The page opens with `?review=mine` | The client asks for the person's own review with `filter=mine` and shows it first. |
| `CP-REV-03` | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | Main flow → 2a. The wine has no visible reviews | The empty state is shown. |
| `CP-REV-04` | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | Main flow → 4a. The person changes the order | It goes back to the first page with the chosen order. |
| `CP-REV-33` | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | Main flow → 4b. In the app, the person moves to another page | The own review stays pinned only at the top of the first page and later pages follow the API order. |
| `CP-REV-05` | [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | 1) The person opens the review form on the wine's page. 2) They pick 0.1 to 5.0 with the bottle that fills the glasses and can add a title of up to 255 characters and a comment; the form says the review is published at once. 3) The client sends `POST /wines/{wineId}/reviews`. 4) The API checks that the person has no other review for that wine and stores it as `APPROVED`. 5) It recalculates the wine's average and number of approved reviews in the same transaction. 6) It adds the wine to the cellar if it was not there and stores the rating rounded to 1–5 and, when the review has a comment, the comment as notes. 7) The API answers 201 and the client confirms the publication and reloads the list and the average. | The review is published, the wine's average is updated and the wine is in the person's cellar. |
| `CP-REV-06` | [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | Main flow → 1a. The person already has a review of that wine | The form is not offered. |
| `CP-REV-07` | [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | Main flow → 4a. The person already has a review for that wine | The API answers 422, or 409 if two arrived at the same time; the web closes the form and reloads the list. |
| `CP-REV-08` | [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | Main flow → 3a. The rating is missing, outside 0.1 to 5.0 or has more than one decimal | The API answers 400. |
| `CP-REV-32` | [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | Main flow → 6a. The review has no comment | The cellar stores only the rating and keeps the notes it already had. |
| `CP-REV-09` | [`UC-REV-03`](use-cases/uc-rev-03-edit-review.md) | 1) The person chooses to edit their review and the form opens with the current data. 2) They change the rating, the title or the comment and save. 3) The client sends `PATCH /wines/{wineId}/reviews/{id}`; an omitted field keeps its value. 4) The API checks authorship or the role, applies the changes and recalculates the wine's average. 5) When the author edits, it updates the cellar with what changed: the comment replaces the notes and the rating is rounded to 1–5. 6) The API answers 200 and the client shows the updated review. | The review has the changes and the wine's average is updated. |
| `CP-REV-10` | [`UC-REV-03`](use-cases/uc-rev-03-edit-review.md) | Main flow → 4a. The editor is neither the author nor `ADMIN` | The API answers 422 `REVIEW_OWNERSHIP`. |
| `CP-REV-11` | [`UC-REV-03`](use-cases/uc-rev-03-edit-review.md) | Main flow → 4b. The review no longer exists | The API answers 404. |
| `CP-REV-12` | [`UC-REV-03`](use-cases/uc-rev-03-edit-review.md) | Main flow → 4c. The review was pending or rejected | It goes back to `PENDING` for a moderator to decide. |
| `CP-REV-13` | [`UC-REV-03`](use-cases/uc-rev-03-edit-review.md) | Main flow → 2a. The person cancels | Nothing is sent. |
| `CP-REV-14` | [`UC-REV-04`](use-cases/uc-rev-04-delete-review.md) | 1) The person chooses to delete the review. 2) The client asks for confirmation. 3) The client sends `DELETE /wines/{wineId}/reviews/{id}`. 4) The API checks authorship or the permission, deletes the review and recalculates the wine's average. 5) The client removes the review from the list and updates the average. | The review, its comments and its likes are removed and the wine's average is updated. |
| `CP-REV-15` | [`UC-REV-04`](use-cases/uc-rev-04-delete-review.md) | Main flow → 2a. The person cancels | Nothing is deleted. |
| `CP-REV-16` | [`UC-REV-04`](use-cases/uc-rev-04-delete-review.md) | Main flow → 4a. The person is neither the author nor has the permission | The API answers 422 `REVIEW_OWNERSHIP`. |
| `CP-REV-17` | [`UC-REV-04`](use-cases/uc-rev-04-delete-review.md) | Main flow → 4b. The review no longer exists | The API answers 404. |
| `CP-REV-18` | [`UC-REV-04`](use-cases/uc-rev-04-delete-review.md) | Main flow → 4c. The review belonged to someone else | A `CONTENT_REMOVED` email is sent to its author. |
| `CP-REV-19` | [`UC-REV-05`](use-cases/uc-rev-05-like-review.md) | 1) The person taps a review's like. 2) The client shows the change at once. 3) The client sends `POST /wines/{wineId}/reviews/{id}/like`, or `DELETE` if it was already liked. 4) The API locks the review, stores or removes the like and updates the count. | The review has or lacks the person's like and the count is updated. |
| `CP-REV-20` | [`UC-REV-05`](use-cases/uc-rev-05-like-review.md) | Main flow → 4a. The person already liked it, or unlikes without a like | The API answers 422 and the client reverts the change with an error notice. |
| `CP-REV-21` | [`UC-REV-05`](use-cases/uc-rev-05-like-review.md) | Main flow → 4b. The review is not approved or there is a block between the accounts | The API answers 404. |
| `CP-REV-22` | [`UC-REV-05`](use-cases/uc-rev-05-like-review.md) | Main flow → 1a. The review is pending or rejected | The like appears disabled. |
| `CP-REV-23` | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | 1) The person opens a review's comments. 2) The client calls `GET /wines/{wineId}/reviews/{id}/comments` and shows the approved comments and the person's own. 3) The person writes a comment of up to 2000 characters and sends it. 4) The client sends `POST /wines/{wineId}/reviews/{id}/comments`. 5) The API trims the text, stores it as `APPROVED` and notifies the review's author ([UC-REV-07](use-cases/uc-rev-07-activity-notices.md)). 6) The API answers 201 and the client shows the comment and updates the count. | The comment is published on the review, or deleted when that was asked. |
| `CP-REV-24` | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | Main flow → 2a. There are no comments | The empty state is shown. |
| `CP-REV-25` | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | Main flow → 4a. The text is empty or longer than 2000 characters after trimming | The API rejects it (400 or 422). |
| `CP-REV-26` | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | Main flow → 4b. The review is not approved or there is a block between the accounts | The API answers 404. |
| `CP-REV-27` | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | Main flow → 6a. The person deletes their own comment, or a moderator or administrator someone else's | The client asks for confirmation and sends `DELETE .../comments/{commentId}`; without authorship or permission the API answers 422 `REVIEW_COMMENT_OWNERSHIP`. |
| `CP-REV-28` | [`UC-REV-07`](use-cases/uc-rev-07-activity-notices.md) | 1) When a comment is published, the API queues a `REVIEW_COMMENT` email and push for the review's author. 2) Every day at 19:00 (Argentina time) the scheduled job gathers each author's new likes. 3) It sends a `REVIEW_LIKES_DAILY` push with the number of likes, of reviews and the wine with the most likes. 4) On Sundays at 10:00 it sends the week's summary by email (`REVIEW_LIKES_WEEKLY`). | The review's author gets the comment notice and a summary of the likes. |
| `CP-REV-29` | [`UC-REV-07`](use-cases/uc-rev-07-activity-notices.md) | Main flow → 1a. The commenter is the review's author or there is a block between the accounts | No notice is sent. |
| `CP-REV-30` | [`UC-REV-07`](use-cases/uc-rev-07-activity-notices.md) | Main flow → 2a. Nobody gave new likes | No summary is sent. |
| `CP-REV-31` | [`UC-REV-07`](use-cases/uc-rev-07-activity-notices.md) | Main flow → 3a. The daily push cannot be shown within the day | It is dropped. |

## Traceability matrix

| Use case | Requirements | Test cases | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | RF-WEB-REV-01, RF-WEB-REV-02, RF-APK-REV-01, RF-APK-REV-02, RF-WEB-REV-11, RF-APK-REV-11 | CP-REV-01, CP-REV-02, CP-REV-03, CP-REV-04, CP-REV-33 | 4 | 4 | 3 |
| [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | RF-WEB-REV-03, RF-WEB-REV-04, RF-APK-REV-03, RF-APK-REV-04 | CP-REV-05, CP-REV-06, CP-REV-07, CP-REV-08, CP-REV-32 | 5 | 2 | 3 |
| [`UC-REV-03`](use-cases/uc-rev-03-edit-review.md) | RF-WEB-REV-05, RF-APK-REV-05 | CP-REV-09, CP-REV-10, CP-REV-11, CP-REV-12, CP-REV-13 | 3 | 1 | 1 |
| [`UC-REV-04`](use-cases/uc-rev-04-delete-review.md) | RF-WEB-REV-06, RF-APK-REV-06 | CP-REV-14, CP-REV-15, CP-REV-16, CP-REV-17, CP-REV-18 | 2 | 1 | 1 |
| [`UC-REV-05`](use-cases/uc-rev-05-like-review.md) | RF-WEB-REV-07, RF-APK-REV-07 | CP-REV-19, CP-REV-20, CP-REV-21, CP-REV-22 | 2 | 1 | 1 |
| [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | RF-WEB-REV-08, RF-WEB-REV-09, RF-WEB-REV-10, RF-APK-REV-08, RF-APK-REV-09, RF-APK-REV-10 | CP-REV-23, CP-REV-24, CP-REV-25, CP-REV-26, CP-REV-27 | 3 | 1 | 1 |
| [`UC-REV-07`](use-cases/uc-rev-07-activity-notices.md) | — | CP-REV-28, CP-REV-29, CP-REV-30, CP-REV-31 | 5 | n/a | n/a |

The Backend, Web and App columns count the test files that exercise the case; the detail is in each use case. "n/a" means the case does not apply to that platform.

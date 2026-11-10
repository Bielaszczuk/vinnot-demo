# Functional requirements

Functional requirements of the module, split by platform. The "Previous ID" column keeps the identifier they had in the per-platform specification.

## Web

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-WEB-REV-01` | Read wine reviews in a selected order. | Reviews are paginated by recent/popular and show available author, rating, text, date and counts. | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | `RF-WEB-REVIEW-001` |
| `RF-WEB-REV-02` | Preserve publication- and block-based visibility. | Pending/rejected content is exposed only to authorized actors; block-based exclusion does not mean reviews are globally absent. | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | `RF-WEB-REVIEW-010` |
| `RF-WEB-REV-03` | Create a rated review. | One review per wine/user; UI picks 0.1–5.0 with the bottle control and API accepts 0.1–5.0 with one decimal; title and comment are optional in the creation contract. | [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | `RF-WEB-REVIEW-002` |
| `RF-WEB-REV-04` | Publish new and edited reviews directly. | Creating publishes it as APPROVED; editing keeps an approved review published and returns a pending or rejected one to PENDING; the wine's average is recalculated. | [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | `RF-WEB-REVIEW-003` |
| `RF-WEB-REV-05` | Edit an authorized review. | Author or ADMIN may edit; MODERATOR does not gain permission to rewrite another author's content merely by moderating it. | [`UC-REV-03`](use-cases/uc-rev-03-edit-review.md) | `RF-WEB-REVIEW-004` |
| `RF-WEB-REV-06` | Delete an authorized review and update aggregates. | Author or REVIEW_DELETE permission allows removal; rating/count are recalculated and cellar remains independent. | [`UC-REV-04`](use-cases/uc-rev-04-delete-review.md) | `RF-WEB-REVIEW-005` |
| `RF-WEB-REV-07` | Like or unlike. | A user contributes at most one like per review; blocked/invisible interactions are not allowed. | [`UC-REV-05`](use-cases/uc-rev-05-like-review.md) | `RF-WEB-REVIEW-006` |
| `RF-WEB-REV-08` | Open a review's comments. | Queries by reviewId; distinguishes visible content, empty and failure; the author also sees their own legacy pending or rejected comments. | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | `RF-WEB-REVIEW-007` |
| `RF-WEB-REV-09` | Post a comment. | Trimmed text between 1 and 2000 characters is published at once as APPROVED; the success message confirms the comment was posted. | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | `RF-WEB-REVIEW-008` |
| `RF-WEB-REV-10` | Delete an owned comment or use moderation permission. | commentId, ownership and permission are checked; editing arbitrary comments is not enabled. | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | `RF-WEB-REVIEW-009` |

## APK

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-APK-REV-01` | Read wine reviews in a selected order. | Reviews are paginated by recent/popular and show available author, rating, text, date and counts. | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | `RF-APK-REVIEW-001` |
| `RF-APK-REV-02` | Preserve publication- and block-based visibility. | Pending/rejected content is exposed only to authorized actors; block-based exclusion does not mean reviews are globally absent. | [`UC-REV-01`](use-cases/uc-rev-01-read-reviews.md) | `RF-APK-REVIEW-010` |
| `RF-APK-REV-03` | Create a rated review. | One review per wine/user; UI picks 0.1–5.0 with the bottle control and API accepts 0.1–5.0 with one decimal; title and comment are optional in the creation contract. | [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | `RF-APK-REVIEW-002` |
| `RF-APK-REV-04` | Publish new and edited reviews directly. | Creating publishes it as APPROVED; editing keeps an approved review published and returns a pending or rejected one to PENDING; the wine's average is recalculated. | [`UC-REV-02`](use-cases/uc-rev-02-publish-review.md) | `RF-APK-REVIEW-003` |
| `RF-APK-REV-05` | Edit an authorized review. | Author or ADMIN may edit; MODERATOR does not gain permission to rewrite another author's content merely by moderating it. | [`UC-REV-03`](use-cases/uc-rev-03-edit-review.md) | `RF-APK-REVIEW-004` |
| `RF-APK-REV-06` | Delete an authorized review and update aggregates. | Author or REVIEW_DELETE permission allows removal; rating/count are recalculated and cellar remains independent. | [`UC-REV-04`](use-cases/uc-rev-04-delete-review.md) | `RF-APK-REVIEW-005` |
| `RF-APK-REV-07` | Like or unlike. | A user contributes at most one like per review; blocked/invisible interactions are not allowed. | [`UC-REV-05`](use-cases/uc-rev-05-like-review.md) | `RF-APK-REVIEW-006` |
| `RF-APK-REV-08` | Open a review's comments. | Queries by reviewId; distinguishes visible content, empty and failure; the author also sees their own legacy pending or rejected comments. | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | `RF-APK-REVIEW-007` |
| `RF-APK-REV-09` | Post a comment. | Trimmed text between 1 and 2000 characters is published at once as APPROVED; the success message confirms the comment was posted. | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | `RF-APK-REVIEW-008` |
| `RF-APK-REV-10` | Delete an owned comment or use moderation permission. | commentId, ownership and permission are checked; editing arbitrary comments is not enabled. | [`UC-REV-06`](use-cases/uc-rev-06-review-comments.md) | `RF-APK-REVIEW-009` |

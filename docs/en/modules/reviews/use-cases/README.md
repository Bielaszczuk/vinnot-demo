# Use cases

Use cases of the reviews module: reading, publishing, editing and deleting reviews, liking, commenting and telling the review's author about the activity. Each case applies to the platforms listed.

| ID | Use case | Platforms | Actors |
|---|---|---|---|
| `UC-REV-01` | [Read a wine's reviews](uc-rev-01-read-reviews.md) | Web, APK | Signed-in user |
| `UC-REV-02` | [Publish a review](uc-rev-02-publish-review.md) | Web, APK | Signed-in user |
| `UC-REV-03` | [Edit a review](uc-rev-03-edit-review.md) | Web, APK | Review author, Administrator |
| `UC-REV-04` | [Delete a review](uc-rev-04-delete-review.md) | Web, APK | Review author, Moderator, Administrator, Email service |
| `UC-REV-05` | [Like or unlike a review](uc-rev-05-like-review.md) | Web, APK | Signed-in user |
| `UC-REV-06` | [Comment on a review](uc-rev-06-review-comments.md) | Web, APK | Signed-in user, Review author, Moderator, Administrator |
| `UC-REV-07` | [Notify a review's activity](uc-rev-07-activity-notices.md) | Backend only | System (scheduled job), Email service, Push notification service |

## Use case diagram

### Readers and authors

```mermaid
flowchart LR
    A1["👤 Signed-in user"]
    A2["👤 Review author"]
    U01(["UC-REV-01 Read a wine's reviews"])
    U02(["UC-REV-02 Publish a review"])
    U05(["UC-REV-05 Like or unlike a review"])
    U06(["UC-REV-06 Comment on a review"])
    U03(["UC-REV-03 Edit a review"])
    U04(["UC-REV-04 Delete a review"])
    A1 --- U01
    A1 --- U02
    A1 --- U05
    A1 --- U06
    A2 --- U06
    A2 --- U03
    A2 --- U04
```

[View the full “Readers and authors” diagram](https://images.vinnot.com/docs/diagrams/v1/en/modules-reviews-use-cases-readme-e561bcfd0499.svg)

### Moderation

```mermaid
flowchart LR
    A3["👤 Administrator"]
    A4["👤 Moderator"]
    A5["👤 Email service"]
    U03(["UC-REV-03 Edit a review"])
    U06(["UC-REV-06 Comment on a review"])
    U04(["UC-REV-04 Delete a review"])
    A3 --- U03
    A3 --- U06
    A4 --- U06
    A3 --- U04
    A4 --- U04
    U04 --- A5
```

[View the full “Moderation” diagram](https://images.vinnot.com/docs/diagrams/v1/en/modules-reviews-use-cases-readme-afe024ab6155.svg)

### Activity notices

```mermaid
flowchart LR
    A6["👤 System (scheduled job)"]
    A5["👤 Email service"]
    A7["👤 Push notification service"]
    U07(["UC-REV-07 Notify a review's activity"])
    A6 --- U07
    U07 --- A5
    U07 --- A7
```

[View the full “Activity notices” diagram](https://images.vinnot.com/docs/diagrams/v1/en/modules-reviews-use-cases-readme-1cde1d2e3eb1.svg)

## Lucidchart mapping

| ID | Lucidchart IDs |
|---|---|
| `UC-REV-01` | [WEB UC-REV-01](https://lucid.app/lucidchart/9f11a16b-bb5a-42fc-a9e8-0852b17bd241/edit), [APK UC-REV-01](https://lucid.app/lucidchart/e095dd25-e8ac-41ba-bf5b-396e1055f217/edit) |
| `UC-REV-02` | [WEB UC-REV-02](https://lucid.app/lucidchart/9f11a16b-bb5a-42fc-a9e8-0852b17bd241/edit), [APK UC-REV-02](https://lucid.app/lucidchart/e095dd25-e8ac-41ba-bf5b-396e1055f217/edit) |
| `UC-REV-03` | [WEB UC-REV-03](https://lucid.app/lucidchart/9f11a16b-bb5a-42fc-a9e8-0852b17bd241/edit), [APK UC-REV-02](https://lucid.app/lucidchart/e095dd25-e8ac-41ba-bf5b-396e1055f217/edit) |
| `UC-REV-04` | [WEB UC-REV-04](https://lucid.app/lucidchart/9f11a16b-bb5a-42fc-a9e8-0852b17bd241/edit), [APK UC-REV-03](https://lucid.app/lucidchart/e095dd25-e8ac-41ba-bf5b-396e1055f217/edit) |
| `UC-REV-05` | [WEB UC-REV-05](https://lucid.app/lucidchart/9f11a16b-bb5a-42fc-a9e8-0852b17bd241/edit), [APK UC-REV-04](https://lucid.app/lucidchart/e095dd25-e8ac-41ba-bf5b-396e1055f217/edit) |
| `UC-REV-06` | [WEB UC-REV-06](https://lucid.app/lucidchart/9f11a16b-bb5a-42fc-a9e8-0852b17bd241/edit), [APK UC-REV-05](https://lucid.app/lucidchart/e095dd25-e8ac-41ba-bf5b-396e1055f217/edit) |
| `UC-REV-07` | None |

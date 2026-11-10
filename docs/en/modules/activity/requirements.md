# Functional requirements

Functional requirements of the module, split by platform. They are new requirements, with no previous identifier in the per-platform specification.

## Web

The web sends no activity signals, so this module has no web requirements.

## APK

| ID | Requirement | Acceptance criterion | Use case |
|---|---|---|---|
| `RF-APK-ACT-01` | Record one view each time a detail opens. | Each time a wine, route, event or winery detail mounts with a session and an id, the app sends one view; the backend adds it to one row per user, content and UTC day. | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) |
| `RF-APK-ACT-02` | Report views without blocking the screen. | Sending does not wait for the answer; a failure leaves the screen unchanged and is only logged in development; an invalid kind or id answers 400 and a request without a session, 401. | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) |
| `RF-APK-ACT-03` | Record an app open at most once every 30 minutes. | The app reports the cold start and every return to the foreground; the app and the backend keep at most one open every 30 minutes, even with simultaneous requests. | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) |
| `RF-APK-ACT-04` | Retry a failed open and forget it on sign-out. | A failed open is reported again on the next open without waiting 30 minutes; on sign-out the app forgets the last open and stops listening. | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) |

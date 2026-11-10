# Testing

Test cases of the module: one for the main flow of each use case and one for each alternative flow. They can be run by hand on the web and in the app; the automated tests column shows which tests exercise the use case.

## Test cases

| ID | Use case | Steps | Expected result |
|---|---|---|---|
| `CP-NOT-01` | [`UC-NOT-01`](use-cases/uc-not-01-manage-preferences.md) | 1) The person opens Profile → Notifications on the web or the notifications sheet on the app. 2) The client calls `GET /users/me/notification-preferences`. 3) The API returns the marketing consent and nine categories with their email and push state and whether they can be changed. 4) The person changes a category's channel or the consent. 5) The client sends `PUT /users/me/notification-preferences` with the `WEB` or `MOBILE` source. 6) The API saves the consent first and then each choice, and returns the final state. | Their preferences are saved and later sends follow them. |
| `CP-NOT-28` | [`UC-NOT-01`](use-cases/uc-not-01-manage-preferences.md) | Main flow → 3b. A category never sends through a channel, such as email for a category that only uses push | The web shows “—” instead of the switch and the app does not show that switch. |
| `CP-NOT-02` | [`UC-NOT-01`](use-cases/uc-not-01-manage-preferences.md) | Main flow → 4a. The category is mandatory (account, security, payments or tickets) | The control is disabled and the API rejects the change. |
| `CP-NOT-03` | [`UC-NOT-01`](use-cases/uc-not-01-manage-preferences.md) | Main flow → 4b. A promotional category is turned on while consent is withdrawn | The API rejects the change. |
| `CP-NOT-04` | [`UC-NOT-01`](use-cases/uc-not-01-manage-preferences.md) | Main flow → 4c. On the app a push is turned on and the phone never asked for permission | The system prompt opens. |
| `CP-NOT-05` | [`UC-NOT-01`](use-cases/uc-not-01-manage-preferences.md) | Main flow → 3a. On the app the system permission is missing or blocked | The sheet offers “Allow notifications” or “Open Settings”. |
| `CP-NOT-06` | [`UC-NOT-02`](use-cases/uc-not-02-unsubscribe.md) | 1) The person taps “Unsubscribe” in the email. 2) The web opens `/unsubscribe?token=…` and asks to confirm. 3) The person confirms. 4) The web sends `POST /notifications/unsubscribe` with the token, without a session. 5) The API turns off that category's email and returns which one it was. 6) The web confirms the unsubscription and offers to go to the preferences. | That category stops sending them emails. |
| `CP-NOT-07` | [`UC-NOT-02`](use-cases/uc-not-02-unsubscribe.md) | Main flow → 1a. The mail client offers one-click unsubscribe | It sends the same request without opening the web. |
| `CP-NOT-08` | [`UC-NOT-02`](use-cases/uc-not-02-unsubscribe.md) | Main flow → 5a. The token is invalid or belongs to a mandatory category | The API rejects it and the web shows an error. |
| `CP-NOT-09` | [`UC-NOT-03`](use-cases/uc-not-03-allow-push.md) | 1) The person opens the app for the first time on that phone, signed in or not. 2) The app creates the Android notification channels and shows the “Turn on notifications” sheet. 3) The person taps “Turn on” and the system shows its permission prompt. 4) The person allows notifications. 5) When someone is signed in, the app registers the phone ([UC-NOT-04](use-cases/uc-not-04-register-device.md)). | The phone may show notifications and is registered when someone is signed in. |
| `CP-NOT-10` | [`UC-NOT-03`](use-cases/uc-not-03-allow-push.md) | Main flow → 3a. The person taps “Not now” | Neither the system prompt nor another sheet appears until the next launch from scratch. |
| `CP-NOT-11` | [`UC-NOT-03`](use-cases/uc-not-03-allow-push.md) | Main flow → 4a. The person declines | The app does not register the phone and removes from the account any registration that phone left. |
| `CP-NOT-12` | [`UC-NOT-03`](use-cases/uc-not-03-allow-push.md) | Main flow → 2a. Android 12 or earlier grants the permission by default | Neither the sheet nor the prompt appears. |
| `CP-NOT-29` | [`UC-NOT-03`](use-cases/uc-not-03-allow-push.md) | Main flow → 1a. Notifications are off and the person is signed in | Every launch from scratch shows “Your notifications are off”; “Turn on notifications” opens the system prompt or “Open settings” the phone settings; returning from the background does not show it. |
| `CP-NOT-30` | [`UC-NOT-03`](use-cases/uc-not-03-allow-push.md) | Main flow → 1b. A confirmed ticket while the system can still ask | A sheet explains the event alerts, unless another sheet already showed in that launch. |
| `CP-NOT-13` | [`UC-NOT-04`](use-cases/uc-not-04-register-device.md) | 1) The app gets the phone's Expo push token. 2) It sends `PUT /users/me/push-devices` with the token, the platform and the app language; on Android it adds `channels: true` once it created the channels. 3) The API validates the token and saves it for that account. 4) The app registers it again on every launch from scratch, on sign-in, language change or token change, and on return to the foreground while it is not registered. | The phone is linked to the account to receive push. |
| `CP-NOT-14` | [`UC-NOT-04`](use-cases/uc-not-04-register-device.md) | Main flow → 3a. The token is not in Expo format | The API answers 400. |
| `CP-NOT-15` | [`UC-NOT-04`](use-cases/uc-not-04-register-device.md) | Main flow → 3b. The token was on another account | It moves to the current account. |
| `CP-NOT-16` | [`UC-NOT-04`](use-cases/uc-not-04-register-device.md) | Main flow → 4a. The person signs out | The app sends the token with the sign-out and the API unregisters it. |
| `CP-NOT-17` | [`UC-NOT-04`](use-cases/uc-not-04-register-device.md) | Main flow → 2a. Registration fails | It is retried on return to the foreground. |
| `CP-NOT-31` | [`UC-NOT-04`](use-cases/uc-not-04-register-device.md) | Main flow → 1a. The phone has no notification permission | The app registers nothing and removes from the account the last token that phone registered. |
| `CP-NOT-18` | [`UC-NOT-05`](use-cases/uc-not-05-receive-push.md) | 1) The module that originated the notice puts it in the send queue. 2) The send job checks the type switch, the expiry, duplicates, the account and the preferences. 3) It checks quiet hours and the daily caps. 4) It sends the push through Expo and then checks the receipts. 5) The person taps the notification. 6) The app validates the route and opens the section: a ticket, an event, a wine, a route, a winery or the partner events. | The person received the push and, if they tapped it, is in the matching section. |
| `CP-NOT-19` | [`UC-NOT-05`](use-cases/uc-not-05-receive-push.md) | Main flow → 2a. The type is turned off by the team, the notice expired, it was already sent, the account is inactive or the person turned it off | It is not sent. |
| `CP-NOT-20` | [`UC-NOT-05`](use-cases/uc-not-05-receive-push.md) | Main flow → 3a. It is between 22:00 and 08:00 in the account's time zone and the notice can wait | It is postponed until 08:00. |
| `CP-NOT-21` | [`UC-NOT-05`](use-cases/uc-not-05-receive-push.md) | Main flow → 3b. The daily or category cap was reached | It is dropped. |
| `CP-NOT-22` | [`UC-NOT-05`](use-cases/uc-not-05-receive-push.md) | Main flow → 6a. The route is not allowed | The app ignores it. |
| `CP-NOT-23` | [`UC-NOT-05`](use-cases/uc-not-05-receive-push.md) | Main flow → 5a. The app was closed | The route opens on start, once navigation is ready. |
| `CP-NOT-32` | [`UC-NOT-05`](use-cases/uc-not-05-receive-push.md) | Main flow → 5b. Nobody is signed in | The app does not navigate; it opens the section after sign-in and reports the open. |
| `CP-NOT-33` | [`UC-NOT-05`](use-cases/uc-not-05-receive-push.md) | Main flow → 6b. The push carries no `ref` or `type` | The app opens the section without reporting the open. |
| `CP-NOT-24` | [`UC-NOT-06`](use-cases/uc-not-06-receive-email.md) | 1) The module that originated the notice puts it in the send queue, once per key. 2) The send job checks the preferences, the current address and the account language again. 3) It builds the branded HTML email and its text version. 4) If it is promotional, it adds the unsubscribe link and one-click unsubscribe. 5) It sends it through the email provider. | The person received the email in their language, or the send was discarded by a rule. |
| `CP-NOT-25` | [`UC-NOT-06`](use-cases/uc-not-06-receive-email.md) | Main flow → 2a. The person turned that category off | It is not sent. |
| `CP-NOT-26` | [`UC-NOT-06`](use-cases/uc-not-06-receive-email.md) | Main flow → 2b. The address bounced permanently or marked spam | It is not sent, not even mandatory ones. |
| `CP-NOT-27` | [`UC-NOT-06`](use-cases/uc-not-06-receive-email.md) | Main flow → 5a. The provider fails | It is retried up to 10 times with growing waits. |
| `CP-NOT-34` | [`UC-NOT-07`](use-cases/uc-not-07-receive-suggestions.md) | 1) While signed in, the person opens the app and a wine detail. 2) The app sends `POST /users/me/activity/app-open` and `POST /users/me/activity/views`. 3) The planner, between 04:00 and 10:00 in the account's time zone, gathers its candidates and picks the highest-scored one. 4) It sets the send time at the usual app-open hour or at 19:30 (12:30 at weekends). 5) At that time, the suggestion budget admits it and the push is sent. 6) The person taps it and the app opens the suggested content. | The person got a suggestion at their usual hour and, after tapping it, is on the suggested content. |
| `CP-NOT-35` | [`UC-NOT-07`](use-cases/uc-not-07-receive-suggestions.md) | Main flow → 1a. There is no session | The app reports no signal. |
| `CP-NOT-36` | [`UC-NOT-07`](use-cases/uc-not-07-receive-suggestions.md) | Main flow → 1b. The signal request fails | The screen stays the same and the open is reported again on the next open. |
| `CP-NOT-37` | [`UC-NOT-07`](use-cases/uc-not-07-receive-suggestions.md) | Main flow → 3a. Another instance holds the planner lease | This run plans nothing. |
| `CP-NOT-38` | [`UC-NOT-07`](use-cases/uc-not-07-receive-suggestions.md) | Main flow → 4a. The person has not opened the app for 14 days | Only come-back pushes compete, at most two per absence. |
| `CP-NOT-39` | [`UC-NOT-07`](use-cases/uc-not-07-receive-suggestions.md) | Main flow → 4b. There are no candidates | Nothing is sent that day. |
| `CP-NOT-40` | [`UC-NOT-07`](use-cases/uc-not-07-receive-suggestions.md) | Main flow → 5a. The account is in the holdout group | The suggestion is recorded but not sent. |
| `CP-NOT-41` | [`UC-NOT-07`](use-cases/uc-not-07-receive-suggestions.md) | Main flow → 7a. They already got 2 in 7 days, one that day or one less than 48 hours ago | It is not sent. |
| `CP-NOT-42` | [`UC-NOT-07`](use-cases/uc-not-07-receive-suggestions.md) | Main flow → 7b. The last 3 suggestions went unopened | They get at most 1 a week; after 28 days without opening any, none except come-back pushes. |
| `CP-NOT-43` | [`UC-NOT-07`](use-cases/uc-not-07-receive-suggestions.md) | Main flow → 7c. They already got one that week and the new one scores below 0.6 | It is not sent. |

## Traceability matrix

| Use case | Requirements | Test cases | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-NOT-01`](use-cases/uc-not-01-manage-preferences.md) | RF-WEB-NOT-01, RF-WEB-NOT-02, RF-APK-NOT-01, RF-APK-NOT-02 | CP-NOT-01, CP-NOT-28, CP-NOT-02, CP-NOT-03, CP-NOT-04, CP-NOT-05 | 4 | 4 | 5 |
| [`UC-NOT-02`](use-cases/uc-not-02-unsubscribe.md) | RF-WEB-NOT-03 | CP-NOT-06, CP-NOT-07, CP-NOT-08 | 3 | 1 | n/a |
| [`UC-NOT-03`](use-cases/uc-not-03-allow-push.md) | RF-APK-NOT-03 | CP-NOT-09, CP-NOT-10, CP-NOT-11, CP-NOT-12, CP-NOT-29, CP-NOT-30 | 0 | n/a | 9 |
| [`UC-NOT-04`](use-cases/uc-not-04-register-device.md) | RF-APK-NOT-04 | CP-NOT-13, CP-NOT-14, CP-NOT-15, CP-NOT-16, CP-NOT-17, CP-NOT-31 | 4 | n/a | 4 |
| [`UC-NOT-05`](use-cases/uc-not-05-receive-push.md) | RF-APK-NOT-05, RF-APK-NOT-06 | CP-NOT-18, CP-NOT-19, CP-NOT-20, CP-NOT-21, CP-NOT-22, CP-NOT-23, CP-NOT-32, CP-NOT-33 | 15 | n/a | 5 |
| [`UC-NOT-06`](use-cases/uc-not-06-receive-email.md) | RF-WEB-NOT-04, RF-WEB-NOT-05, RF-WEB-NOT-06, RF-WEB-NOT-07, RF-WEB-NOT-08, RF-WEB-NOT-09, RF-APK-NOT-07, RF-APK-NOT-08, RF-APK-NOT-09, RF-APK-NOT-10, RF-APK-NOT-11, RF-APK-NOT-12 | CP-NOT-24, CP-NOT-25, CP-NOT-26, CP-NOT-27 | 6 | 0 | 0 |
| [`UC-NOT-07`](use-cases/uc-not-07-receive-suggestions.md) | RF-APK-NOT-13, RF-APK-NOT-14 | CP-NOT-34, CP-NOT-35, CP-NOT-36, CP-NOT-37, CP-NOT-38, CP-NOT-39, CP-NOT-40, CP-NOT-41, CP-NOT-42, CP-NOT-43 | 26 | n/a | 5 |

The Backend, Web and App columns count the test files that exercise the case; the detail is in each use case. "n/a" means the case does not apply to that platform.

# Functional requirements

Functional requirements of the module, split by platform. They are new requirements, with no previous identifier in the per-platform specification.

## Web

| ID | Requirement | Acceptance criterion | Use case |
|---|---|---|---|
| `RF-WEB-GAM-01` | Earn points for real activity. | Each source grants its points: approved review 3, note of 80 characters or more 2, like received 1, comment on someone else's review 1, new wine approved 8, exact-match scan 1, cellar entry added by hand 1, confirmed registration 4 and complete profile 5; only once per person, source and source key. | [`UC-GAM-01`](use-cases/uc-gam-01-earn-and-lose-points.md) |
| `RF-WEB-GAM-02` | Apply the daily limits and the global cap. | Per day: 5 likes, 3 comments, 3 scans and 3 cellar entries; a global cap of 40 in the person's time zone, approved wines excluded; two simultaneous awards never exceed it. | [`UC-GAM-01`](use-cases/uc-gam-01-earn-and-lose-points.md) |
| `RF-WEB-GAM-03` | Revoke the points of removed content. | Deleting, removing or sending back to pending takes back exactly what was granted, received likes included; points never go below zero; creating or approving again awards again under the same key. | [`UC-GAM-01`](use-cases/uc-gam-01-earn-and-lose-points.md) |
| `RF-WEB-GAM-04` | Read points, tier and movements. | Points, the seal and tier name, progress to the next tier, today's points with the cap, how to earn, the last 20 signed movements and the whole ladder are shown; a failure offers a retry. | [`UC-GAM-02`](use-cases/uc-gam-02-view-my-points.md) |
| `RF-WEB-GAM-05` | Celebrate each new tier only once. | Reaching a tier for the first time shows the seal reveal; continuing marks that tier and lower ones as celebrated; dropping and coming back does not repeat it. | [`UC-GAM-03`](use-cases/uc-gam-03-celebrate-tier.md) |
| `RF-WEB-GAM-06` | Show and dismiss the welcome card. | After the historical calculation, the welcome card shows once and dismissing it applies to every device. | [`UC-GAM-03`](use-cases/uc-gam-03-celebrate-tier.md) |
| `RF-WEB-GAM-07` | Show the seal next to the name. | Review lists, own reviews, comments and administration users show the author's seal; a locked or inactive account, or an unknown tier, shows no seal. | [`UC-GAM-04`](use-cases/uc-gam-04-seal-next-to-name.md) |
| `RF-WEB-GAM-08` | Animate the seal without distracting. | In lists it plays once on appear and again every 8 to 16 seconds; in the profile, continuously; no sparkles below 40 px; with reduced motion it stays still with a fixed highlight. | [`UC-GAM-04`](use-cases/uc-gam-04-seal-next-to-name.md) |

## APK

| ID | Requirement | Acceptance criterion | Use case |
|---|---|---|---|
| `RF-APK-GAM-01` | Earn points for real activity. | Each source grants its points: approved review 3, note of 80 characters or more 2, like received 1, comment on someone else's review 1, new wine approved 8, exact-match scan 1, cellar entry added by hand 1, confirmed registration 4 and complete profile 5; only once per person, source and source key. | [`UC-GAM-01`](use-cases/uc-gam-01-earn-and-lose-points.md) |
| `RF-APK-GAM-02` | Apply the daily limits and the global cap. | Per day: 5 likes, 3 comments, 3 scans and 3 cellar entries; a global cap of 40 in the person's time zone, approved wines excluded; two simultaneous awards never exceed it. | [`UC-GAM-01`](use-cases/uc-gam-01-earn-and-lose-points.md) |
| `RF-APK-GAM-03` | Revoke the points of removed content. | Deleting, removing or sending back to pending takes back exactly what was granted, received likes included; points never go below zero; creating or approving again awards again under the same key. | [`UC-GAM-01`](use-cases/uc-gam-01-earn-and-lose-points.md) |
| `RF-APK-GAM-04` | Read points, tier and movements. | Points, the seal and tier name, progress to the next tier, today's points with the cap, how to earn, the last 20 signed movements and the whole ladder are shown; a failure offers a retry. | [`UC-GAM-02`](use-cases/uc-gam-02-view-my-points.md) |
| `RF-APK-GAM-05` | Celebrate each new tier only once. | Reaching a tier for the first time shows the seal reveal; continuing marks that tier and lower ones as celebrated; dropping and coming back does not repeat it. | [`UC-GAM-03`](use-cases/uc-gam-03-celebrate-tier.md) |
| `RF-APK-GAM-06` | Show and dismiss the welcome card. | After the historical calculation, the welcome card shows once and dismissing it applies to every device. | [`UC-GAM-03`](use-cases/uc-gam-03-celebrate-tier.md) |
| `RF-APK-GAM-07` | Show the seal next to the name. | Review lists, own reviews, comments and administration users show the author's seal; a locked or inactive account, or an unknown tier, shows no seal. | [`UC-GAM-04`](use-cases/uc-gam-04-seal-next-to-name.md) |
| `RF-APK-GAM-08` | Animate the seal without distracting. | In lists it plays once on appear and again every 8 to 16 seconds; in the profile, continuously; no sparkles below 40 px; with reduced motion it stays still with a fixed highlight. | [`UC-GAM-04`](use-cases/uc-gam-04-seal-next-to-name.md) |
| `RF-APK-GAM-09` | Receive the tier-reached push. | `TIER_REACHED` arrives once per person and tier, with the tier name in their language, only while the Community preference is on, and never during the historical calculation. | [`UC-GAM-03`](use-cases/uc-gam-03-celebrate-tier.md) |

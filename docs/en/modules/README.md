# Modules

Each product module is a complete chapter: what it does, use cases,
requirements, architecture, diagrams, tests and traceability. The backend
organizes its code along the same boundaries (`backend/src/main/java/com/vinnot/<module>`).

| Module | Code | What it covers |
|---|---|---|
| [Users and account](users/README.md) | `USR` | Sign-up, sign-in with email and social providers, verification, profile, privacy, re-authentication and the account lifecycle. |
| [Legal](legal/README.md) | `LEG` | Legal centre, versioned terms of use, their acceptance and the evidence stored for each one. |
| [Wines](wines/README.md) | `WIN` | Wine catalog, search and detail, user wine submissions and their review, grape types and label scanning in the app. |
| [Wineries and regions](wineries/README.md) | `WRY` | Wineries with their detail, map, contacts and wines, and wine regions. |
| [Reviews](reviews/README.md) | `REV` | Wine reviews, comments and likes. |
| [Cellar](cellar/README.md) | `CEL` | Personal cellar: the wines each user keeps. |
| [Community](community/README.md) | `COM` | Content reports, blocks between users and each person's community activity. |
| [Events and tickets](events/README.md) | `EVT` | Event discovery, registrations, tickets and events near the user. |
| [Payments](payments/README.md) | `PAY` | Registration payments with Mercado Pago, organizer payment accounts and refunds. |
| [Wine routes](wine-routes/README.md) | `RTE` | Wine routes with their stops and map. |
| [Sharing](sharing/README.md) | `SHR` | Public links to share wines, events and routes, and opening them in the app. |
| [Notifications](notifications/README.md) | `NOT` | Push and email notifications, user preferences and announcements sent by administrators. |
| [Activity](activity/README.md) | `ACT` | Engagement signals (opened details, app and push opens) that personalise suggestions and send times. |
| [Points and seals](gamification/README.md) | `GAM` | Points for real activity, daily caps, wax-seal tiers, celebrations and the `TIER_REACHED` notice. |
| [AI profiles and comparisons](ai/README.md) | `AI` | AI-generated wine profiles and wine comparisons. |
| [Social media marketing](marketing/README.md) | `MKT` | Wine-day calendar, weekly post planner, AI-written copy in Spanish and English, illustration and Instagram and TikTok slides per language, and approval queue for social media. |
| [Support and public information](support/README.md) | `SUP` | Contact, help center and public information pages. |
| [Partners](partner/README.md) | `PAR` | Organizers who publish and manage their own events and registrations. |
| [Administration and moderation](admin/README.md) | `ADM` | Team panel: catalog management, moderation, users, announcements, push control and the work digest for the moderation team. |

## Identifiers

| Item | Format | Example |
|---|---|---|
| Use case | `UC-<code>-NN`, one per case, shared by web and APK | `UC-WIN-01` |
| Web functional requirement | `RF-WEB-<code>-NN` | `RF-WEB-WIN-01` |
| APK functional requirement | `RF-APK-<code>-NN` | `RF-APK-WIN-01` |
| Test case | `CP-<code>-NN` | `CP-WIN-01` |

“APK” stands for the mobile app, which is the same on iOS and Android. Existing IDs keep
that name, which comes from the original deliverable and Lucidchart; new content uses “app”.

Each use case states the platforms it applies to and its previous Lucidchart ID
(`WEB UC-…`, `APK UC-…`).

## Traceability

The [global traceability matrix](traceability.md) links every use case of every module to
its requirements, test cases and automated tests.

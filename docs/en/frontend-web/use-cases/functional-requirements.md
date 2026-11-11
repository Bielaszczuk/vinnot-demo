# Vinnot functional requirements — web

Specification of implemented behaviour for users, moderators, administrators and partners. Each requirement identifies a capability, its access condition and an observable acceptance criterion.

**Audit baseline:** repository code as of 25 October 2026, commit `4384fc8ec8a2f35e8cda55c1c7fe88a2ea6af08c`. Routing/screens, presentation hooks, services, API clients, controllers, handlers, domain and existing tests were inspected. Criteria describe the supported contract; reading code does not establish that all scenarios ran on physical devices.

**Coverage:** 181 requirements across 20 functional groups: 168 in the 16 modules and 13 cross-cutting ones in 4 groups. `RF` denotes a functional requirement; identifiers are stable within this specification. Cited tests provide traceability rather than evidence of a new run or a claim of complete coverage.

## 1. Scope and terminology

Includes visible features, validation, permissions, persistent effects, states and alternatives. Provider configuration, device permissions and resource status condition the stated branches. An API operation is not attributed to an interface that does not expose it.

**Personal cellar** is the user's collection; **winery** is a catalogue entity. A **review** rates a wine; a **comment** belongs to a review. A **hold** temporarily reserves seats. **Ownership** identifies the account owner or owning organizer. An **expert profile** is structured wine/language-specific content read, generated or edited subject to permissions.

Web denotes the React browser frontend and public backend-rendered share pages. A public link provides a minimal preview; the catalogue, full product details and personal operations remain session-protected.

## 2. Actors and authorization

| Actor | Functional scope |
| --- | --- |
| Guest | Public information, support, registration/login and share preview. Protected product features require a session. |
| USER / owner | Discovery, AI, owned reviews, engagement, cellar with CELLAR_MANAGE_OWN, registrations, owned profile and account. |
| PARTNER | Personal features plus management of owned events and attendees; /partner grants no access to another organizer's events. |
| MODERATOR | Catalogue panel, authorized editing/publication, expert profiles and community/reviews/submissions. No user administration or wine/winery/event/route deletion. |
| ADMIN | Catalogue, community and user administration, roles/suspensions, authorized deletion and event management; recent proof for sensitive actions. |
| Organizer / recipient | Organizer is event ownership rather than a fifth role. A share recipient accesses an anonymous preview or the resource after authentication. |

Actual assignments contain one or more roles; the administrative selector retains USER and the selected role. Backend checks roles, authorities and ownership. MODERATOR alone is not assumed to inherit every USER personal permission. Rows describe each role's surface rather than an implicit hierarchy of every permission.

**Access evidence:** [backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java), [backend/src/main/java/com/vinnot/user/domain/valueobject/Role.java](../../../../backend/src/main/java/com/vinnot/user/domain/valueobject/Role.java), [backend/src/main/java/com/vinnot/admin/infrastructure/web/controller/UserAdminController.java](../../../../backend/src/main/java/com/vinnot/admin/infrastructure/web/controller/UserAdminController.java).

## 3. Screen and entry-point inventory

| Area | Routes/entry points | Access |
| --- | --- | --- |
| Presentation and information | `/`, `/about`, `/help`, `/contact` | Public |
| Legal centre and documents | `/legal`, `/legal/:slug`, `/legal/ranking`, `/terms`, `/privacy`, `/content-policy`, `/cookies` | Public |
| Authentication and account links | `/login`, `/register`, `/register/success`, `/forgot-password`, `/reset-password`, `/verify-email`, `/confirm-email-change` | Public; action links require a token |
| Email unsubscribe | `/unsubscribe` | Public; requires the token from the email link |
| Onboarding | `/complete-profile` | Session and terms |
| Wines and AI | `/wines`, `/wines/:id`, `/wines/:id/ai-profile`, `/wines/compare/:wineAId?`, `/wines/scan` | Session; scan is a download invitation |
| Events and wineries | `/events`, `/events/:id`, `/wineries/:id` | Session; no web winery-index route |
| Own tickets | `/my-tickets`, `/my-tickets/:id` | Session |
| Checkout return | `/payments/return` | Public, outside the shell; status from an opaque receipt |
| Routes and personal features | `/wine-routes`, `/wine-routes/:id`, `/cellar`, `/profile`, `/community` | Session; cellar requires personal permission |
| Partner management | `/partner/events` | PARTNER/ADMIN and ownership |
| Payment account | `/partner/payments`, `/partner/payments/callback` | Outside the shell; only when the payments flag is enabled |
| Catalogue administration | `/admin`, `/admin/wines`, `/admin/wines/:id/ai-profile`, `/admin/wineries`, `/admin/events`, `/admin/routes` | ADMIN/MODERATOR; catalogue deletion requires ADMIN |
| Community administration | `/admin/reviews`, `/admin/publications`, `/admin/community`, `/admin/wine-submissions` | ADMIN/MODERATOR and action permission |
| User administration | `/admin/users` | ADMIN |
| Notification administration | `/admin/notifications` | ADMIN |
| Minimum app version | `/admin/app-versions` | ADMIN; each change asks for reauthentication |
| Service states | `/403`, `/404`, `/500`, `/503`, `/429`, `/offline`, `/timeout`, unknown route | Public |
| Share landing | `/share`, `/share/{wines,events,wine-routes}/:id` and EN variants | Public backend HTML, outside the SPA router |

[frontend-react/src/app/App.tsx](../../../../frontend-react/src/app/App.tsx), [frontend-react/src/presentation/components/auth/ProtectedRoute.tsx](../../../../frontend-react/src/presentation/components/auth/ProtectedRoute.tsx).

## 4. Requirements catalogue

The requirements of [users and account](../../modules/users/requirements.md), [legal](../../modules/legal/requirements.md), [wines](../../modules/wines/requirements.md), [wineries and regions](../../modules/wineries/requirements.md), [reviews](../../modules/reviews/requirements.md), [cellar](../../modules/cellar/requirements.md), [community](../../modules/community/requirements.md), [events and tickets](../../modules/events/requirements.md), [payments](../../modules/payments/requirements.md), [wine routes](../../modules/wine-routes/requirements.md), [sharing](../../modules/sharing/requirements.md), [notifications](../../modules/notifications/requirements.md), [AI profiles and comparisons](../../modules/ai/requirements.md), [support and public information](../../modules/support/requirements.md), [partners](../../modules/partner/requirements.md) and [administration and moderation](../../modules/admin/requirements.md) are in their modules.

Criteria combine the trigger, response and use-case boundary. Every requirement below describes an implemented capability; conditional branches name their condition. An enabled UI does not replace server authorization or validation.

| Group | Requirements | Count |
| --- | --- | --- |
| Image upload and presentation | `RF-WEB-MEDIA-001` → `RF-WEB-MEDIA-004` | 4 |
| Reference catalogues and relationships | `RF-WEB-REF-001` → `RF-WEB-REF-004` | 4 |
| Language, interaction and recovery | `RF-WEB-UX-002` → `RF-WEB-UX-005` | 4 |
| Web-specific features | `RF-WEB-WEBX-001` → `RF-WEB-WEBX-001` | 1 |

### 4.22. Image upload and presentation

**Actor and precondition:** Owner for avatar; catalogue/admin/organizer permissions for corresponding images.

| ID | Requirement | Acceptance criterion / rule |
| --- | --- | --- |
| `RF-WEB-MEDIA-001` | Validate and optimize managed uploads. | File, MIME/size/decoding are validated; avatar, persisted label and cover become WebP without relying on the declared extension. |
| `RF-WEB-MEDIA-002` | Retain resource- and owner-specific image references. | Save receives a confirmed URL; failed upload prevents assuming save succeeded and knowing a URL does not publish a private cover. |
| `RF-WEB-MEDIA-003` | Display a stable fallback for missing or failed photos. | Null/failure shows a default asset; valid images resolve against API/CDN origin rather than the current screen's relative path. |
| `RF-WEB-MEDIA-004` | Update avatar and clean its previous reference. | Success changes the profile image; persistence failure does not replace the avatar with a URL whose account was not updated. |

**Traceability:** [frontend-react/src/application/services/users.service.ts](../../../../frontend-react/src/application/services/users.service.ts), [frontend-react/src/application/services/coverImages.service.ts](../../../../frontend-react/src/application/services/coverImages.service.ts), [backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/UploadController.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/UploadController.java), [backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/CoverImageController.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/CoverImageController.java), [backend/src/main/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizer.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizer.java), [backend/src/main/java/com/vinnot/shared/application/media/CoverImageService.java](../../../../backend/src/main/java/com/vinnot/shared/application/media/CoverImageService.java).

### 4.23. Reference catalogues and relationships

**Actor and precondition:** Session for reading; forms use existing references.

| ID | Requirement | Acceptance criterion / rule |
| --- | --- | --- |
| `RF-WEB-REF-001` | Read active wine and event types. | Options come from reference; ES/EN labels and codes are not replaced with arbitrary values when saving. |
| `RF-WEB-REF-002` | Relate country, region and winery. | Changing country limits regions; selecting a winery retains its ID and origin data rather than only visible text. |
| `RF-WEB-REF-003` | Select existing grape varieties. | The grape catalogue supports ID search/selection; winery/grape lookup does not grant permission to create them. |
| `RF-WEB-REF-004` | Normalize paged results in application services. | Services convert DTO/page into each client's model and retain total/page/size; a partial list is not described as the complete catalogue. |

**Traceability:** [frontend-react/src/application/services/regions.service.ts](../../../../frontend-react/src/application/services/regions.service.ts), [frontend-react/src/application/services/grapeTypes.service.ts](../../../../frontend-react/src/application/services/grapeTypes.service.ts), [backend/src/main/java/com/vinnot/shared/infrastructure/web/ReferenceDataController.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/ReferenceDataController.java), [backend/src/main/java/com/vinnot/region/infrastructure/web/controller/RegionController.java](../../../../backend/src/main/java/com/vinnot/region/infrastructure/web/controller/RegionController.java), [backend/src/main/java/com/vinnot/wine/infrastructure/web/controller/GrapeTypeController.java](../../../../backend/src/main/java/com/vinnot/wine/infrastructure/web/controller/GrapeTypeController.java).

### 4.25. Language, interaction and recovery

**Actor and precondition:** All actors; controls and states depend on the screen.

| ID | Requirement | Acceptance criterion / rule |
| --- | --- | --- |
| `RF-WEB-UX-002` | Separate initial loading, refresh, empty and error. | Queries and forms use corresponding indicators/states; network failure does not remove data as if a confirmed empty result had arrived. |
| `RF-WEB-UX-003` | Block repeated in-flight writes. | Busy forms block another confirmation; failure supports recovery and success is not announced before a response. |
| `RF-WEB-UX-004` | Confirm destructive actions and preserve recoverable drafts. | Deleting, cancelling or discarding changes uses the flow's confirmation; failed saving is not considered persistence. |
| `RF-WEB-UX-005` | Enforce permissions on direct access. | Hidden buttons do not grant or replace permission; known URLs/IDs still pass guards and backend authorization. |

**Traceability:** [frontend-react/src/app/App.tsx](../../../../frontend-react/src/app/App.tsx), [frontend-react/src/presentation/components/auth/ProtectedRoute.tsx](../../../../frontend-react/src/presentation/components/auth/ProtectedRoute.tsx), [frontend-react/src/shared/i18n](../../../../frontend-react/src/shared/i18n), [backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java).

### 4.26. Web-specific features

**Actor and precondition:** Guest for public preferences; session for product features.

| ID | Requirement | Acceptance criterion / rule |
| --- | --- | --- |
| `RF-WEB-WEBX-001` | Control optional embedded maps. | /cookies enables/disables maps; disabling removes embeds, does not undo sent data and does not block external links. |

**Traceability:** [frontend-react/src/presentation/pages/public/CookieSettingsPage.tsx](../../../../frontend-react/src/presentation/pages/public/CookieSettingsPage.tsx), [frontend-react/src/presentation/hooks/useExternalMapsPreference.ts](../../../../frontend-react/src/presentation/hooks/useExternalMapsPreference.ts), [frontend-react/src/presentation/pages/wine-routes/useWineRoutesViewModel.ts](../../../../frontend-react/src/presentation/pages/wine-routes/useWineRoutesViewModel.ts), [backend/src/main/java/com/vinnot/event/infrastructure/web/controller/EventController.java](../../../../backend/src/main/java/com/vinnot/event/infrastructure/web/controller/EventController.java).

## 5. Persistent states and rules

States are contract codes displayed with localized labels; they are not permissions or universally available actions.

| Entity | States/fields | Functional rule |
| --- | --- | --- |
| Account | `isActive`, `isLocked`, `isEmailVerified`, roles | Independent flags; administrative locking differs from personal user blocking. |
| Wine | `isActive`, `isFeatured` | Inactive wines leave catalogue/share; featured does not guarantee a highlights ranking. |
| Review/comment publication | `PENDING`, `APPROVED`, `REJECTED` | New review, approved review edit and new comment: APPROVED. Editing a pending/rejected review: PENDING. Decisions require the current revision. |
| Report | `OPEN`, `IN_REVIEW`, `RESOLVED`, `DISMISSED` | Closure needs notes; no reopening or review by the author/reporter. |
| Event | `DRAFT`, `PUBLISHED`, `POSTPONED`, `SOLD_OUT`, `CANCELLED`, `COMPLETED` | Current ordinary listing uses PUBLISHED/SOLD_OUT; cancellation retains records/history. |
| Registration | `REQUESTED`, `AWAITING_PAYMENT`, `AWAITING_ATTENDEE_CONFIRMATION`, `CONFIRMED`, `WAITLISTED`, `REJECTED`, `CANCELLED`, `EXPIRED` | Confirmed seats and holds differ; waitlisting does not promote itself. |
| Payment method | `FREE`, `TRANSFER`, `QR`, `CASH`, `MERCADO_PAGO` | Web sends `FREE` or `MERCADO_PAGO` by amount; TRANSFER/QR/CASH are legacy contract values. |
| Payment status | `NOT_REQUIRED`, `PENDING`, `REPORTED`, `APPROVED`, `REJECTED`, `PAY_AT_VENUE`, `REFUNDED` | Payment status differs from registration; only the server verification with Mercado Pago confirms it. |
| Route | `DRAFT`, `PUBLISHED`, `ARCHIVED` | Catalogue/share uses PUBLISHED; an empty draft cannot be published. |
| Wine submission | `PENDING`, `APPROVED`, `DUPLICATE`, `REJECTED`, `NEEDS_REVIEW`, `CHANGES_REQUESTED` | Decisions use creation, merge, rejection or corrections; the destination is not always a new wine. |

**State evidence:** [backend/src/main/java/com/vinnot/review/domain/model/PublicationStatus.java](../../../../backend/src/main/java/com/vinnot/review/domain/model/PublicationStatus.java), [backend/src/main/java/com/vinnot/event/domain/valueobject/EventRegistrationStatus.java](../../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventRegistrationStatus.java), [backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentMethod.java](../../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentMethod.java), [backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentStatus.java](../../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentStatus.java), [backend/src/main/java/com/vinnot/community/domain/model/CommunityReport.java](../../../../backend/src/main/java/com/vinnot/community/domain/model/CommunityReport.java), [backend/src/main/java/com/vinnot/wineroute/domain/model/WineRoute.java](../../../../backend/src/main/java/com/vinnot/wineroute/domain/model/WineRoute.java).

## 6. Main flows and alternatives

| Flow | Precondition | Main sequence | Postcondition / alternative |
| --- | --- | --- | --- |
| Account and access | Guest and valid data. | Register → verify email → login → complete profile/terms → destination. | USER session only on success; duplicate/expired token/rejection retains public access. |
| Public support | Valid name/email/category/message. | Submit → receive reference → internal outbox delivery. | Retry reuses requestId; a receipt does not guarantee immediate delivery. |
| Wine discovery | Session and current agreement. | Resolve optional country → text/filters → page → detail. | Consistent list/total; failure does not imply zero wines or alter filters. |
| AI profile and comparison | Existing wine or two different IDs. | Read persisted content → explicitly generate if needed → display or compare. | Language retained; failed generation does not create a fictitious profile/winner. |
| Review and cellar | Session with permission, valid wine and rating. | Create review → APPROVED → update aggregates → synchronize cellar. | Published review and one personal entry; duplicates fail and cellar removal does not delete the review. |
| Comment and report | Visible content; report is not owned. | Comment published at once or submit a reasoned report → view status → authorized moderation. | Decision includes actor/notes/revision; conflict/stale revision blocks resolution. |
| Event registration | Published event, open deadline, valid request. | Request → review/hold/waitlist → confirm attendance or Mercado Pago checkout → return/receipt. | Server state/capacity; expiry/cancellation releases holds; payment is confirmed only by the server verification with Mercado Pago. |
| Wine route | Published route for ordinary reading. | Catalogue → detail → expand stops → Maps/share. | Order retained; opening directions does not record visiting or completion. |
| Catalogue management | ADMIN/MODERATOR and action permissions. | Search → fetch detail → edit fields/references → confirm → invalidate projections. | Confirmed change or recoverable draft; catalogue deletion requires ADMIN. |
| User management | ADMIN, authorized target and recent proof when required. | Select user → role/suspend/delete → reauthenticate if stale → confirm once. | Server applies self/last-admin protection; cancellation does not modify the account. |
| Partner management | PARTNER/ADMIN and event ownership. | Create/edit owned event → publish → manage attendees → cancel if needed. | No access to others' events; cancellation retains history. |
| Account deletion | Signed-in owner and exact phrase. | Confirm text → authorize Apple if linked → delete → sign out. | Failed revocation blocks deletion; deactivation is a separate flow. |
| Shared link | Share-eligible resource and compatible app/association for native opening. | Share URL → preview/app → authenticate if needed → resource by ID. | Without app offers store/web; removed resource returns 404; reopen the link after installation. |
| Managed image | Authorized actor and supported file. | Select → validate/convert WebP → upload → save reference → render/fallback. | Reference matches resource/owner; failure does not imply confirmed persistence. |

## 7. Functional boundaries of this specification

- Vinnot discovers/describes wines; it does not sell or deliver alcohol, record bottle orders or offer cellar checkout.
- Events record requests, seats and online Mercado Pago payments confirmed when the server verifies them with Mercado Pago. There is no manual crediting or IAP; cancelling an event refunds online payments automatically and organizers can also request a registration refund.
- New reviews, approved review edits and new comments publish directly; moderation is reactive (reports, blocks, removal). No automatic abusive-text detector or pre-approval is documented.
- Routes open external Maps and show stops; they do not provide proprietary GPS tracking, persisted progress, visit certification or completed routes.
- Backend defines USER, PARTNER, MODERATOR and ADMIN. Historical permissions for other modules or seeded types do not create expert/tourism/article profiles in these interfaces.
- Cache facilitates later reads; it is not a complete offline mode and does not enable offline writes. Error/retry screens do not guarantee external-service availability.
- Bilingual catalogue fields are used when present; free text, reviews and emails do not receive automatic translation when the client preference changes.
- Sharing covers wines, events and routes; events and routes only offer it when they have a public page. Providers control App Store previews and messaging caches; installing from a store requires reopening the original link to retain its destination.
- Web does not perform scanning or personal camera-based wine submission. Administration does review submissions.
- Web does not expose a winery index; winery details open through existing relationships.
- Routes filters the current received page rather than promising a globally filtered total. Wine search/pagination runs on the server; these are different contracts.

## 8. Test traceability and maintenance

The following existing tests cover aspects of the listed groups. Their inclusion does not claim an automated test for every row or that a full functional suite was executed now.

| RF groups | Existing tests |
| --- | --- |
| AUTH, LEGAL, ACCOUNT | [frontend-react/src/presentation/components/auth/TermsGate.test.tsx](../../../../frontend-react/src/presentation/components/auth/TermsGate.test.tsx), [backend/src/test/java/com/vinnot/legal/application/service/LegalAgreementServiceTest.java](../../../../backend/src/test/java/com/vinnot/legal/application/service/LegalAgreementServiceTest.java) |
| WINE, PAGE | [frontend-react/src/presentation/pages/wines/useWineSearchViewModel.test.tsx](../../../../frontend-react/src/presentation/pages/wines/useWineSearchViewModel.test.tsx) |
| AI | [frontend-react/src/presentation/pages/wines/useAiProfileViewModel.test.tsx](../../../../frontend-react/src/presentation/pages/wines/useAiProfileViewModel.test.tsx), [backend/src/test/java/com/vinnot/ai/application/service/AiProfileServiceTest.java](../../../../backend/src/test/java/com/vinnot/ai/application/service/AiProfileServiceTest.java) |
| CELLAR, REVIEW | [frontend-react/src/application/services/cellar.service.test.ts](../../../../frontend-react/src/application/services/cellar.service.test.ts), [backend/src/test/java/com/vinnot/review/domain/model/ReviewTest.java](../../../../backend/src/test/java/com/vinnot/review/domain/model/ReviewTest.java) |
| SAFETY | [frontend-react/src/presentation/hooks/queries/community/useCommunity.test.tsx](../../../../frontend-react/src/presentation/hooks/queries/community/useCommunity.test.tsx), [backend/src/test/java/com/vinnot/review/domain/model/ReviewPublicationTest.java](../../../../backend/src/test/java/com/vinnot/review/domain/model/ReviewPublicationTest.java) |
| EVENT, REG | [frontend-react/src/presentation/pages/events/useEventsNearbyViewModel.test.tsx](../../../../frontend-react/src/presentation/pages/events/useEventsNearbyViewModel.test.tsx), [backend/src/test/java/com/vinnot/event/application/command/handler/EventRegistrationLifecycleHandlersTest.java](../../../../backend/src/test/java/com/vinnot/event/application/command/handler/EventRegistrationLifecycleHandlersTest.java) |
| ROUTE | [frontend-react/src/application/services/wineRoutes.service.test.ts](../../../../frontend-react/src/application/services/wineRoutes.service.test.ts), [backend/src/test/java/com/vinnot/wineroute/domain/model/WineRouteTest.java](../../../../backend/src/test/java/com/vinnot/wineroute/domain/model/WineRouteTest.java) |
| ADMIN, USERS, PARTNER, SUBADMIN | [frontend-react/src/application/services/admin.service.test.ts](../../../../frontend-react/src/application/services/admin.service.test.ts), [backend/src/test/java/com/vinnot/user/infrastructure/web/controller/ReauthenticationControllerTest.java](../../../../backend/src/test/java/com/vinnot/user/infrastructure/web/controller/ReauthenticationControllerTest.java) |
| PUB, MAIL | [frontend-react/src/presentation/hooks/useSupportForm.test.ts](../../../../frontend-react/src/presentation/hooks/useSupportForm.test.ts) |
| MEDIA | [frontend-react/src/application/services/coverImages.service.test.ts](../../../../frontend-react/src/application/services/coverImages.service.test.ts), [backend/src/test/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizerTest.java](../../../../backend/src/test/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizerTest.java) |
| SHARE | [frontend-react/src/application/services/sharing.service.test.ts](../../../../frontend-react/src/application/services/sharing.service.test.ts), [backend/src/test/java/com/vinnot/sharing/infrastructure/web/SharedLinkHtmlRendererTest.java](../../../../backend/src/test/java/com/vinnot/sharing/infrastructure/web/SharedLinkHtmlRendererTest.java) |

After a functional change, update the affected requirement and ES mirror, check UI/service/handler, retain its ID and add/update criteria. New capabilities are included after implementation. Mismatches or proposals belong in local planning rather than already-supported features.

Reproducible documentation validation: `python3 scripts/validate_documentation.py`. This edition changes no functional code, starts no CI/deployment and does not replace software release gates.

[Documentation standard](../../governance/documentation-standards.md) · [Functional map](product-flows.md) · [Architecture](../architecture/overview.md)

## Local increment: phone and free reservations — 2026-10-14

In addition to the original audited inventory, profiles support an optional editable/clearable private phone. Registration prefills this contact, permits a reservation-specific change and explicit selection to remember it for future bookings. It must preserve historical snapshots, show approval/deadline copy matching configuration and exclude phones from public profiles. UI validates international syntax and the backend validates numbering plans; neither verifies ownership. [Contract and tests](../../modules/events/architecture.md#registration-contact-and-profile-phone). Local implementation does not imply deployment or device acceptance.

## Local increment: events near you — 2026-10-20

In the profile's notification preferences, under "Events near you", a signed-in user picks a region from the catalogue in a one-tap select, or stops the alerts. An approximate location set from the mobile app is shown as such and can be replaced by a region; the web never reads the browser location. Having an area is the opt-in to "New event near you" pushes, which arrive at most once a day, only for events published for the first time and still open for registration; the push toggle of that row still applies, and these alerts are never emailed. The privacy notice explains the stored area. Traceability: [EventAreaPicker.tsx](../../../../frontend-react/src/presentation/pages/user/EventAreaPicker.tsx), [useEventAreaViewModel.ts](../../../../frontend-react/src/presentation/pages/user/useEventAreaViewModel.ts), [notifications.service.ts](../../../../frontend-react/src/application/services/notifications.service.ts), [backend contract](../../modules/notifications/architecture.md#new-events-near-you).

## Local increment: moderation rejection reasons — 2026-10-20

When a moderator rejects a review or comment in the publication queue, they pick the reason the author will see from one-tap chips: offensive language (preselected), spam or promotion, not about the wine, personal data, or other reason. Rejecting no longer needs typing; "Details for the author (optional)" appears only under "Other reason". Approving sends no reason. Traceability: [ReviewPublicationsPage.tsx](../../../../frontend-react/src/presentation/pages/community/ReviewPublicationsPage.tsx), [publicationDecision.ts](../../../../frontend-react/src/domain/community/publicationDecision.ts), [community.service.ts](../../../../frontend-react/src/application/services/community.service.ts), [backend contract](../../modules/notifications/architecture.md#moderation).

## Local increment: catalog quality reports — 2026-11-11

The `/admin/community` moderation page shows the catalog quality reports Vinnot files when a member corrects an exact label scan match. Their heading reads "Wine · Catalog quality", "Reported by" shows "Vinnot (automatic)", the matched wine appears as the target and "Wine the member chose" names the other wine; the page replaces the stored English description with a localized explanation (possible duplicate, wrong winery or wrong image) and offers "Open the matched wine" and "Open the chosen wine". The decision form only offers resolving or dismissing: a catalog wine is never removed from a report, and the catalog is fixed by hand in wine administration. Member reports keep their usual layout and never show the automatic reporter. Requirement: [`RF-WEB-ADM-34`](../../modules/admin/requirements.md). Traceability: [CommunityModerationPage.tsx](../../../../frontend-react/src/presentation/pages/community/CommunityModerationPage.tsx), [ReportDecisionForm.tsx](../../../../frontend-react/src/presentation/components/features/community/ReportDecisionForm.tsx), [reportDecision.ts](../../../../frontend-react/src/domain/community/reportDecision.ts), [community.service.ts](../../../../frontend-react/src/application/services/community.service.ts), [community.dto.ts](../../../../frontend-react/src/infrastructure/api/dto/community.dto.ts).

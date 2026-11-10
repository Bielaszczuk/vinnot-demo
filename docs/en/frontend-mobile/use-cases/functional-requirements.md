# Vinnot functional requirements — Android APK

Specification of implemented behaviour for users, moderators, administrators and partners. Each requirement identifies a capability, its access condition and an observable acceptance criterion.

**Audit baseline:** repository code as of 25 October 2026, commit `4384fc8ec8a2f35e8cda55c1c7fe88a2ea6af08c`. Routing/screens, presentation hooks, services, API clients, controllers, handlers, domain and existing tests were inspected. Criteria describe the supported contract; reading code does not establish that all scenarios ran on physical devices.

**Coverage:** 204 requirements across 19 functional groups: 192 in the 16 modules and 12 cross-cutting ones in 3 groups. `RF` denotes a functional requirement; identifiers are stable within this specification. Cited tests provide traceability rather than evidence of a new run or a claim of complete coverage.

## 1. Scope and terminology

Includes visible features, validation, permissions, persistent effects, states and alternatives. Provider configuration, device permissions and resource status condition the stated branches. An API operation is not attributed to an interface that does not expose it.

**Personal cellar** is the user's collection; **winery** is a catalogue entity. A **review** rates a wine; a **comment** belongs to a review. A **hold** temporarily reserves seats. **Ownership** identifies the account owner or owning organizer. An **expert profile** is structured wine/language-specific content read, generated or edited subject to permissions.

APK denotes the installed React Native/Expo Android app; AAB is its Play distribution format rather than a different functional product. Code shared with iOS provides evidence, with Apple/Android differences identified. Expo Go or a web preview does not equal testing native Google Sign-In, camera or signed APK App Links.

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
| Launch and authentication | `/`, `/welcome`, `/login`, `/register`, `/register-success`, `/verify-email`, `/forgot-password`, `/reset-password` | Public; launch resolves session |
| Information and legal | `/about`, `/help`, `/contact`, `/legal`, `/legal/:slug`, `/terms`, `/privacy`, `/cookies`, `/content-policy` | Public |
| Onboarding | `/complete-profile` | Session and terms |
| Primary tabs | `/home`, `/wines`, `/events`, `/routes`, `/profile` | Session, terms and complete profile |
| Wines, AI and capture | `/wines/:id`, `/wines/:id/ai-profile`, `/wines/compare`, `/wines/scan`, `/wines/submissions` | Session; capture requires camera permission |
| Events, routes and aliases | `/events/:id`, `/routes/:id`, `/wine-routes`, `/wine-routes/:id` | Session; aliases redirect to tabs |
| Personal features and wineries | `/cellar`, `/community`, `/wineries`, `/wineries/:id` | Session; cellar requires personal permission |
| Tickets | `/my-tickets`, `/my-tickets/:id` | Session; opened from Profile and not a tab |
| Sent wines | `/my-submissions` | Session; opened from Profile and not a tab |
| Payment return | `/payments/return` | Public; shows the checkout return and does not confirm payment |
| Catalogue administration | `/admin`, `/admin/wines`, `/admin/wines/:id/ai-profile`, `/admin/wineries`, `/admin/events`, `/admin/routes` | ADMIN/MODERATOR; catalogue deletion requires ADMIN |
| Community administration | `/admin/reviews`, `/admin/publications`, `/admin/community`, `/admin/submissions` | ADMIN/MODERATOR and action permission |
| User administration | `/admin/users` | ADMIN |
| Notifications administration | `/admin/notifications` | ADMIN |
| Social posts administration | `/admin/social-posts` | ADMIN |
| Partner management | `/partner`, `/partner/events` | PARTNER/ADMIN and ownership |
| Service states | `/403`, `/500`, `/503`, `/429`, `/offline`, `/timeout`, fallback `+not-found` | Public |
| External intents | `vinnot://` and associated HTTPS links, normalized to the internal resource; `vinnot://payments/return` and `vinnot://payments/connected` resolve in `app/+native-intent.tsx` | Requires compatible build/association; guards remain active |

Expo groups `(auth)`, `(onboarding)`, `(app)` and `(tabs)` organize files without becoming URL segments. Profile, registration, community and editor sheets/modals do not require a separate route for each action.

[frontend-mobile/app](../../../../frontend-mobile/app), [frontend-mobile/src/presentation/navigation/guards.tsx](../../../../frontend-mobile/src/presentation/navigation/guards.tsx).

## 4. Requirements catalogue

The requirements of [users and account](../../modules/users/requirements.md), [legal](../../modules/legal/requirements.md), [wines](../../modules/wines/requirements.md), [wineries and regions](../../modules/wineries/requirements.md), [reviews](../../modules/reviews/requirements.md), [cellar](../../modules/cellar/requirements.md), [community](../../modules/community/requirements.md), [events and tickets](../../modules/events/requirements.md), [payments](../../modules/payments/requirements.md), [wine routes](../../modules/wine-routes/requirements.md), [sharing](../../modules/sharing/requirements.md), [notifications](../../modules/notifications/requirements.md), [AI profiles and comparisons](../../modules/ai/requirements.md), [support and public information](../../modules/support/requirements.md), [partners](../../modules/partner/requirements.md) and [administration and moderation](../../modules/admin/requirements.md) are in their modules.

Criteria combine the trigger, response and use-case boundary. Every requirement below describes an implemented capability; conditional branches name their condition. An enabled UI does not replace server authorization or validation.

| Group | Requirements | Count |
| --- | --- | --- |
| Image upload and presentation | `RF-APK-MEDIA-001` → `RF-APK-MEDIA-004` | 4 |
| Reference catalogues and relationships | `RF-APK-REF-001` → `RF-APK-REF-004` | 4 |
| Language, interaction and recovery | `RF-APK-UX-002` → `RF-APK-UX-005` | 4 |

### 4.23. Image upload and presentation

**Actor and precondition:** Owner for avatar; catalogue/admin/organizer permissions for corresponding images.

| ID | Requirement | Acceptance criterion / rule |
| --- | --- | --- |
| `RF-APK-MEDIA-001` | Validate and optimize managed uploads. | File, MIME/size/decoding are validated; avatar, persisted label and cover become WebP without relying on the declared extension. |
| `RF-APK-MEDIA-002` | Retain resource- and owner-specific image references. | Save receives a confirmed URL; failed upload prevents assuming save succeeded and knowing a URL does not publish a private cover. |
| `RF-APK-MEDIA-003` | Display a stable fallback for missing or failed photos. | Null/failure shows a default asset; valid images resolve against API/CDN origin rather than the current screen's relative path. |
| `RF-APK-MEDIA-004` | Update avatar and clean its previous reference. | Success changes the profile image; persistence failure does not replace the avatar with a URL whose account was not updated. |

**Traceability:** [frontend-mobile/src/application/services/avatarSelection.service.ts](../../../../frontend-mobile/src/application/services/avatarSelection.service.ts), [frontend-mobile/src/application/services/coverImages.service.ts](../../../../frontend-mobile/src/application/services/coverImages.service.ts), [frontend-mobile/src/infrastructure/device/imagePicker.gateway.ts](../../../../frontend-mobile/src/infrastructure/device/imagePicker.gateway.ts), [backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/UploadController.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/UploadController.java), [backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/CoverImageController.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/CoverImageController.java), [backend/src/main/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizer.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizer.java), [backend/src/main/java/com/vinnot/shared/application/media/CoverImageService.java](../../../../backend/src/main/java/com/vinnot/shared/application/media/CoverImageService.java).

### 4.24. Reference catalogues and relationships

**Actor and precondition:** Session for reading; forms use existing references.

| ID | Requirement | Acceptance criterion / rule |
| --- | --- | --- |
| `RF-APK-REF-001` | Read active wine and event types. | Options come from reference; ES/EN labels and codes are not replaced with arbitrary values when saving. |
| `RF-APK-REF-002` | Relate country, region and winery. | Changing country limits regions; selecting a winery retains its ID and origin data rather than only visible text. |
| `RF-APK-REF-003` | Select existing grape varieties. | The grape catalogue supports ID search/selection; winery/grape lookup does not grant permission to create them. |
| `RF-APK-REF-004` | Normalize paged results in application services. | Services convert DTO/page into each client's model and retain total/page/size; a partial list is not described as the complete catalogue. |

**Traceability:** [frontend-mobile/src/application/services/regions.service.ts](../../../../frontend-mobile/src/application/services/regions.service.ts), [frontend-mobile/src/application/services/grapeTypes.service.ts](../../../../frontend-mobile/src/application/services/grapeTypes.service.ts), [backend/src/main/java/com/vinnot/shared/infrastructure/web/ReferenceDataController.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/ReferenceDataController.java), [backend/src/main/java/com/vinnot/region/infrastructure/web/controller/RegionController.java](../../../../backend/src/main/java/com/vinnot/region/infrastructure/web/controller/RegionController.java), [backend/src/main/java/com/vinnot/wine/infrastructure/web/controller/GrapeTypeController.java](../../../../backend/src/main/java/com/vinnot/wine/infrastructure/web/controller/GrapeTypeController.java).

### 4.26. Language, interaction and recovery

**Actor and precondition:** All actors; controls and states depend on the screen.

| ID | Requirement | Acceptance criterion / rule |
| --- | --- | --- |
| `RF-APK-UX-002` | Separate initial loading, refresh, empty and error. | Queries and forms use corresponding indicators/states; network failure does not remove data as if a confirmed empty result had arrived. |
| `RF-APK-UX-003` | Block repeated in-flight writes. | Busy forms block another confirmation; failure supports recovery and success is not announced before a response. |
| `RF-APK-UX-004` | Confirm destructive actions and preserve recoverable drafts. | Deleting, cancelling or discarding changes uses the flow's confirmation; failed saving is not considered persistence. |
| `RF-APK-UX-005` | Enforce permissions on direct access. | Hidden buttons do not grant or replace permission; known URLs/IDs still pass guards and backend authorization. |

**Traceability:** [frontend-mobile/src/presentation/navigation/guards.tsx](../../../../frontend-mobile/src/presentation/navigation/guards.tsx), [frontend-mobile/src/presentation/providers/LanguagePreferenceProvider.tsx](../../../../frontend-mobile/src/presentation/providers/LanguagePreferenceProvider.tsx), [frontend-mobile/src/shared/i18n](../../../../frontend-mobile/src/shared/i18n), [backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java).

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
| Payment method | `FREE`, `TRANSFER`, `QR`, `CASH`, `MERCADO_PAGO` | The mobile form only sends FREE (no amount) or MERCADO_PAGO (with amount); MERCADO_PAGO is charged through online checkout. Other values belong to the backend contract and the app does not offer them. |
| Payment status | `NOT_REQUIRED`, `PENDING`, `REPORTED`, `APPROVED`, `REJECTED`, `PAY_AT_VENUE`, `REFUNDED` | Payment status differs from registration; a REFUNDED enum does not imply a gateway or automatic UI refund. |
| Route | `DRAFT`, `PUBLISHED`, `ARCHIVED` | Catalogue/share uses PUBLISHED; an empty draft cannot be published. |
| Wine submission | `PENDING`, `APPROVED`, `DUPLICATE`, `REJECTED`, `NEEDS_REVIEW`, `CHANGES_REQUESTED` | Decisions use creation, merge, rejection or corrections; the destination is not always a new wine. |
| Scan | `EXACT_MATCH`, `POSSIBLE_MATCHES`, `NO_MATCH` | Recognition outcomes are not publication states. |

**State evidence:** [backend/src/main/java/com/vinnot/review/domain/model/PublicationStatus.java](../../../../backend/src/main/java/com/vinnot/review/domain/model/PublicationStatus.java), [backend/src/main/java/com/vinnot/event/domain/valueobject/EventRegistrationStatus.java](../../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventRegistrationStatus.java), [backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentMethod.java](../../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentMethod.java), [backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentStatus.java](../../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentStatus.java), [backend/src/main/java/com/vinnot/community/domain/model/CommunityReport.java](../../../../backend/src/main/java/com/vinnot/community/domain/model/CommunityReport.java), [backend/src/main/java/com/vinnot/wineroute/domain/model/WineRoute.java](../../../../backend/src/main/java/com/vinnot/wineroute/domain/model/WineRoute.java).

## 6. Main flows and alternatives

| Flow | Precondition | Main sequence | Postcondition / alternative |
| --- | --- | --- | --- |
| Account and access | Guest and valid data. | Register → verify email → login → complete profile/terms → destination. | USER session only on success; duplicate/expired token/rejection retains public access. |
| Public support | Valid name/email/category/message. | Submit → receive reference → internal outbox delivery. | Retry reuses requestId; a receipt does not guarantee immediate delivery. |
| Wine discovery | Session and current agreement. | Resolve optional country → text/filters → page → detail. | Consistent list/total; failure does not imply zero wines or alter filters. |
| AI profile and comparison | Existing wine or two different IDs. | Read persisted content → explicitly generate if needed → display or compare. | Language retained; failed generation does not create a fictitious profile/winner. |
| Scan and manual submission | Session/camera and a readable label. | Capture → recognize → exact/suggestions/no result → search or submit → view status. | Ordinary scan is transient; submission can merge or require review rather than always publish a new wine. |
| Review and cellar | Session with permission, valid wine and rating. | Create review → APPROVED → update aggregates → synchronize cellar. | Published review and one personal entry; duplicates fail and cellar removal does not delete the review. |
| Comment and report | Visible content; report is not owned. | Comment published at once or submit a reasoned report → view status → authorized moderation. | Decision includes actor/notes/revision; conflict/stale revision blocks resolution. |
| Event registration | Published event, open deadline, valid request. | Request → review/hold/waitlist → confirm attendance or pay with Mercado Pago → checkout return → manager decision. | Server state/capacity; expiry/cancellation releases holds; payment is confirmed only by the server verification with Mercado Pago. |
| Wine route | Published route for ordinary reading. | Catalogue → detail → expand stops → Maps/share. | Order retained; opening directions does not record visiting or completion. |
| Catalogue management | ADMIN/MODERATOR and action permissions. | Search → fetch detail → edit fields/references → confirm → invalidate projections. | Confirmed change or recoverable draft; catalogue deletion requires ADMIN. |
| User management | ADMIN, authorized target and recent proof when required. | Select user → role/suspend/delete → reauthenticate if stale → confirm once. | Server applies self/last-admin protection; cancellation does not modify the account. |
| Partner management | PARTNER/ADMIN and event ownership. | Create/edit owned event → publish → manage attendees → cancel if needed. | No access to others' events; cancellation retains history. |
| Account deletion | Signed-in owner and exact phrase. | Confirm text → authorize Apple if linked → delete → sign out. | Failed revocation blocks deletion; deactivation is a separate flow. |
| Shared link | Share-eligible resource and compatible app/association for native opening. | Share URL → preview/app → authenticate if needed → resource by ID. | Without app offers store/web; removed resource returns 404; reopen the link after installation. |
| Managed image | Authorized actor and supported file. | Select → validate/convert WebP → upload → save reference → render/fallback. | Reference matches resource/owner; failure does not imply confirmed persistence. |

## 7. Functional boundaries of this specification

- Vinnot discovers/describes wines; it does not sell or deliver alcohol, record bottle orders or offer cellar checkout.
- Events record requests and seats; paid registrations are charged through Mercado Pago online checkout, enabled by `EXPO_PUBLIC_EVENT_PAYMENTS_ENABLED`. Payment confirmation arrives only when the server verifies it with Mercado Pago; there is no IAP. Cancelling an event refunds online payments automatically.
- New reviews, approved review edits and new comments publish directly; moderation is reactive (reports, blocks, removal). No automatic abusive-text detector or pre-approval is documented.
- Routes open external Maps and show stops; they do not provide proprietary GPS tracking, persisted progress, visit certification or completed routes.
- Backend defines USER, PARTNER, MODERATOR and ADMIN. Historical permissions for other modules or seeded types do not create expert/tourism/article profiles in these interfaces.
- Cache facilitates later reads; it is not a complete offline mode and does not enable offline writes. Error/retry screens do not guarantee external-service availability.
- Bilingual catalogue fields are used when present; free text, reviews and emails do not receive automatic translation when the client preference changes.
- Sharing covers wines, events and routes; events and routes only offer it when they have a public page. Providers control App Store previews and messaging caches; installing from a store requires reopening the original link to retain its destination.
- Apple Sign-In and its native deletion confirmation require iOS; Android shows providers compatible with its build.
- Mobile Events uses the first page of up to fifty, discovery or an area. Routes refines already loaded pages; globally filtered pagination is not attributed to these results.
- Camera/location permissions are optional for other features. Denied camera prevents capture; denied location allows manual/global discovery.

## 8. Test traceability and maintenance

The following existing tests cover aspects of the listed groups. Their inclusion does not claim an automated test for every row or that a full functional suite was executed now.

| RF groups | Existing tests |
| --- | --- |
| AUTH, LEGAL, ACCOUNT | [frontend-mobile/src/presentation/features/public/TermsGate.test.tsx](../../../../frontend-mobile/src/presentation/features/public/TermsGate.test.tsx), [backend/src/test/java/com/vinnot/legal/application/service/LegalAgreementServiceTest.java](../../../../backend/src/test/java/com/vinnot/legal/application/service/LegalAgreementServiceTest.java) |
| WINE, PAGE | [frontend-mobile/src/presentation/features/wine/__tests__/winesBrowsePagination.test.tsx](../../../../frontend-mobile/src/presentation/features/wine/__tests__/winesBrowsePagination.test.tsx) |
| AI | [frontend-mobile/src/presentation/features/wine/AiProfileSections.test.tsx](../../../../frontend-mobile/src/presentation/features/wine/AiProfileSections.test.tsx), [backend/src/test/java/com/vinnot/ai/application/service/AiProfileServiceTest.java](../../../../backend/src/test/java/com/vinnot/ai/application/service/AiProfileServiceTest.java) |
| CELLAR, REVIEW | [frontend-mobile/src/application/services/cellar.service.test.ts](../../../../frontend-mobile/src/application/services/cellar.service.test.ts), [backend/src/test/java/com/vinnot/review/domain/model/ReviewTest.java](../../../../backend/src/test/java/com/vinnot/review/domain/model/ReviewTest.java) |
| SAFETY | [frontend-mobile/src/presentation/features/community/ReviewPublicationsScreen.test.tsx](../../../../frontend-mobile/src/presentation/features/community/ReviewPublicationsScreen.test.tsx), [backend/src/test/java/com/vinnot/review/domain/model/ReviewPublicationTest.java](../../../../backend/src/test/java/com/vinnot/review/domain/model/ReviewPublicationTest.java) |
| EVENT, REG | [frontend-mobile/src/application/services/events.service.test.ts](../../../../frontend-mobile/src/application/services/events.service.test.ts), [backend/src/test/java/com/vinnot/event/application/command/handler/EventRegistrationLifecycleHandlersTest.java](../../../../backend/src/test/java/com/vinnot/event/application/command/handler/EventRegistrationLifecycleHandlersTest.java) |
| ROUTE | [frontend-mobile/src/presentation/features/wineRoute/useWineRoutesListViewModel.test.ts](../../../../frontend-mobile/src/presentation/features/wineRoute/useWineRoutesListViewModel.test.ts), [backend/src/test/java/com/vinnot/wineroute/domain/model/WineRouteTest.java](../../../../backend/src/test/java/com/vinnot/wineroute/domain/model/WineRouteTest.java) |
| ADMIN, USERS, PARTNER, SUBADMIN | [frontend-mobile/src/presentation/features/admin/AdminUserActionSheet.test.tsx](../../../../frontend-mobile/src/presentation/features/admin/AdminUserActionSheet.test.tsx), [backend/src/test/java/com/vinnot/user/infrastructure/web/controller/ReauthenticationControllerTest.java](../../../../backend/src/test/java/com/vinnot/user/infrastructure/web/controller/ReauthenticationControllerTest.java) |
| PUB, MAIL | [frontend-mobile/src/presentation/hooks/useSupportForm.test.ts](../../../../frontend-mobile/src/presentation/hooks/useSupportForm.test.ts) |
| MEDIA | [frontend-mobile/src/application/services/coverImages.service.test.ts](../../../../frontend-mobile/src/application/services/coverImages.service.test.ts), [backend/src/test/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizerTest.java](../../../../backend/src/test/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizerTest.java) |
| SHARE | [frontend-mobile/src/domain/navigation/nativeIntent.test.ts](../../../../frontend-mobile/src/domain/navigation/nativeIntent.test.ts), [backend/src/test/java/com/vinnot/sharing/infrastructure/web/SharedLinkHtmlRendererTest.java](../../../../backend/src/test/java/com/vinnot/sharing/infrastructure/web/SharedLinkHtmlRendererTest.java) |
| SCAN | [frontend-mobile/src/presentation/features/wine/scan/useWineLabelScanViewModel.test.ts](../../../../frontend-mobile/src/presentation/features/wine/scan/useWineLabelScanViewModel.test.ts) |

After a functional change, update the affected requirement and ES mirror, check UI/service/handler, retain its ID and add/update criteria. New capabilities are included after implementation. Mismatches or proposals belong in local planning rather than already-supported features.

Reproducible documentation validation: `python3 scripts/validate_documentation.py`. This edition changes no functional code, starts no CI/deployment and does not replace software release gates.

[Documentation standard](../../governance/documentation-standards.md) · [Functional map](product-flows.md) · [Architecture](../architecture/overview.md)

## Local increment: phone and free reservations — 2026-10-14

In addition to the original audited inventory, profiles support an optional editable/clearable private phone. Registration prefills this contact, permits a reservation-specific change and explicit selection to remember it for future bookings. It must preserve historical snapshots, show approval/deadline copy matching configuration and exclude phones from public profiles. UI validates international syntax and the backend validates numbering plans; neither verifies ownership. [Contract and tests](../../modules/events/architecture.md#registration-contact-and-profile-phone-1). Local implementation does not imply deployment or device acceptance.

## Local increment: events near you — 2026-10-20

In the notification preferences sheet, under "Events near you", a signed-in user sets their area in one tap: "Use my approximate location" asks for foreground location once and sends a position rounded to 0.1° (about 11 km) on the device, rounded again by the server, or "Search for a region or city" opens a search box: from two letters it shows up to eight catalogue regions whose name or country matches, ignoring case and accents, and never the whole catalogue. When no region matches, or after "Pick on the map", the same map picker as the event editor appears: "Search on the map" geocodes the text with Google and moves the pin without saving, a tap or a marker drag adjusts it, and only "Use this point" sends the pin rounded to 0.1° like the approximate location. A denied permission shows a calm notice and opens the search. The sheet shows the region name, the place just found, or "Approximate area", and "Stop" clears it. The resulting "New event near you" push opens `/events/<id>`. JavaScript only: it ships by OTA. Traceability: [EventAreaSection.tsx](../../../../frontend-mobile/src/presentation/features/user/EventAreaSection.tsx), [useEventArea.ts](../../../../frontend-mobile/src/presentation/features/user/useEventArea.ts), [notifications.service.ts](../../../../frontend-mobile/src/application/services/notifications.service.ts), [eventArea.ts](../../../../frontend-mobile/src/domain/notification/eventArea.ts).

## Local increment: moderation rejection reasons — 2026-10-20

On the review publications screen, rejecting a review or comment means picking the reason the author will see from one-tap chips (radio semantics): offensive language (preselected), spam or promotion, not about the wine, personal data, or other reason. "Details for the author (optional)" appears only under "Other reason"; approving sends no reason. JavaScript only: ships by OTA. Traceability: [ReviewPublicationsScreen.tsx](../../../../frontend-mobile/src/presentation/features/community/ReviewPublicationsScreen.tsx), [useAdminCommunityViewModels.ts](../../../../frontend-mobile/src/presentation/features/community/useAdminCommunityViewModels.ts), [community.service.ts](../../../../frontend-mobile/src/application/services/community.service.ts).

## Local increment: review and note vintage — 2026-10-22

The review form and the sheet that adds or edits a cellar wine include "Vintage": a numeric field (number pad, up to four digits) filters the years from the current one down to 1900 and shows them as chips; the catalog wine vintage comes first, marked "catalog". Tapping a chip or completing a valid year selects it and shows it as a pill with a control to remove it. The picker lives inside the form, without a nested sheet, and uses the sheet-aware inputs so the keyboard does not cover it. Reviews and cellar rows show the pill "Vintage 2018" when one is set. Publishing a note as a review pre-fills its vintage. Creating sends `vintage` only when a year is set; editing sends `vintage` when it changed, `clearVintage: true` when it was removed and neither when untouched, so the API keeps the stored value. JavaScript only: it ships by OTA. Traceability: [VintageField.tsx](../../../../frontend-mobile/src/presentation/components/ui/VintageField.tsx), [VintagePill.tsx](../../../../frontend-mobile/src/presentation/components/ui/VintagePill.tsx), [vintage.ts](../../../../frontend-mobile/src/domain/wine/vintage.ts), [ReviewFormFields.tsx](../../../../frontend-mobile/src/presentation/features/wine/ReviewFormFields.tsx), [CellarAddSheet.tsx](../../../../frontend-mobile/src/presentation/features/cellar/CellarAddSheet.tsx), [useCellarReviewPublication.ts](../../../../frontend-mobile/src/presentation/hooks/useCellarReviewPublication.ts), [wines.service.ts](../../../../frontend-mobile/src/application/services/wines.service.ts), [cellar.service.ts](../../../../frontend-mobile/src/application/services/cellar.service.ts).

## Local increment: UI/UX audit fixes — 2026-10-23

Failed reads no longer look like empty content: wine, winery and event detail show the reason with "Retry" (only a real 404 keeps "not found"); reviews, comments, the home "Nearby events" and "Wine routes" sections, the AI profile and the organizer's event list do the same. The AI profile offers "Generate profile" only when the wine has none and explains a failed generation by type (timeout, rate limit, network, generic). The cellar "Price paid" is read in the app language ("12,50" and "1.500" in es-AR, "1,500.50" in en-US); an invalid or ambiguous price shows a field error and is never sent. An unsent review (rating, title, comment, vintage) and an unsent comment are kept per wine and per review in memory for the app session, and cleared on publish, cancel or sign-out. Deleting a review or comment confirms with a message; like and comment toggles have 44-point targets, accessible labels and no double tap while saving. Admin wine, winery and route sheets cannot be closed while saving and ask before discarding changes. The organizer's events list searches on the server (`search` on `GET /partner/events`), refreshes on pull and shows a pending cue on Edit. In the registrations sheet each approve, waitlist or reject asks for confirmation with its own optional note for that attendee, and only that attendee shows a pending state. Screens inside the scanner's full-screen modal show their messages inside it. Back on screens opened without history goes to the matching list. JavaScript only: it ships by OTA. Traceability: [purchasePrice.ts](../../../../frontend-mobile/src/domain/cellar/purchasePrice.ts), [illustratedState.ts](../../../../frontend-mobile/src/presentation/feedback/illustratedState.ts), [draftsSlice.ts](../../../../frontend-mobile/src/presentation/store/draftsSlice.ts), [useSheetDismissGuard.ts](../../../../frontend-mobile/src/presentation/components/ui/useSheetDismissGuard.ts), [usePartnerEventsViewModel.ts](../../../../frontend-mobile/src/presentation/features/partner/usePartnerEventsViewModel.ts), [EventRegistrationsManagerSheet.tsx](../../../../frontend-mobile/src/presentation/features/event/EventRegistrationsManagerSheet.tsx), [ToastProvider.tsx](../../../../frontend-mobile/src/presentation/providers/ToastProvider.tsx), [discoveryNavigation.ts](../../../../frontend-mobile/src/presentation/navigation/discoveryNavigation.ts).

## Local increment: social posts administration — 2026-11-03

"Social posts" in the admin dashboard (administrators only) opens `/admin/social-posts`, the mobile version of the web approval queue of the [marketing module](../../modules/marketing/README.md). The queue filters by status with one tap (pending approval first) and pages through `GET /admin/social-posts`; each row shows the date, the status, the pillar, the wine day and the hook in the selected language, or "Copy pending in this language". A Spanish/English switch drives the queue and the post. The post opens in a sheet with a second switch for Instagram or TikTok: it shows the slides of that language and format (`media.slides.<es|en>.<instagram|tiktok>`) in a horizontal list, each one with "View" (opens the image) and "Share" (system share sheet), whether they are rendering (the post is polled meanwhile) or failed and why, and whether the hero is the AI illustration or the pillar vignette; without slides it shows a text preview. A language without copy is shown as pending. Below come the caption with its legal-line check, hashtags, call to action, alt text, generation and fact-check details and the review record. Actions follow the status: approve (pending), reject (pending or approved) with a one-tap reason whose free text appears only under "Other", edit the copy of the selected language in a form sheet (`PUT` with `language`; the other language is untouched and the legal line of that language is appended when missing), regenerate (pending, approved or rejected; regenerating an approved post drops its approval and it goes back to pending approval once both copies are valid, so an approved post missing a language can be filled from the pending-language notice) and new illustration. A 409 shows that the post changed status. "Plan now" shows how many posts it created and that the AI writes the copy in the background, and refreshes the queue every 10 seconds for 5 minutes. The wine days of this month and the next are listed read-only. JavaScript only: it ships by OTA. Traceability: [AdminSocialPostsScreen.tsx](../../../../frontend-mobile/src/presentation/features/admin/AdminSocialPostsScreen.tsx), [useAdminSocialPostsViewModel.ts](../../../../frontend-mobile/src/presentation/features/admin/social-posts/useAdminSocialPostsViewModel.ts), [useAdminSocialPosts.ts](../../../../frontend-mobile/src/presentation/hooks/queries/admin/useAdminSocialPosts.ts), [adminSocialPosts.service.ts](../../../../frontend-mobile/src/application/services/adminSocialPosts.service.ts), [adminSocialPosts.client.ts](../../../../frontend-mobile/src/infrastructure/api/clients/adminSocialPosts.client.ts), [socialPost.ts](../../../../frontend-mobile/src/domain/admin/socialPost.ts).

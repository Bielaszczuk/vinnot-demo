# Privacy and data protection

This page describes which personal data Vinnot keeps, which third parties
receive it, how an account is deactivated or deleted, how long data survives in
backups, and what record remains of terms acceptance. The contractual rules are
in the [Legal](../modules/legal/README.md) module.

## Personal data kept

| Category | Data | Where | Source |
|---|---|---|---|
| Account identity | Email, username, first and last name, BCrypt password hash, state (active, locked, email verified), last sign-in | `users` table | [V1__baseline_schema.sql](../../../backend/src/main/resources/db/migration/V1__baseline_schema.sql) |
| Optional contact | Private phone number with a validated format | `users.phone_number` | [V28__add_private_user_phone.sql](../../../backend/src/main/resources/db/migration/V28__add_private_user_phone.sql) |
| Profile picture | Avatar optimised to WebP | object storage | [change avatar](../modules/users/use-cases/uc-usr-15-change-avatar.md) |
| Social identities | Google or Apple provider and subject | `social_identities` | [identity](../backend/architecture/authentication-and-identity.md#persistence-and-secrets) |
| Sessions and links | Only SHA-256 hashes of refresh tokens and action tokens | `refresh_tokens`, `user_action_tokens` | same |
| Devices | One Expo push token per device | `push_devices` | [V46__push_devices.sql](../../../backend/src/main/resources/db/migration/V46__push_devices.sql) |
| Activity | Reviews, comments, cellar, points, wine submissions, event registrations | each module's tables | [data model](../backend/data/database-model.md) |
| Security events | Event type, account, IP, browser (truncated user agent) and time; purged after 180 days | `security_events` | [V73__security_events.sql](../../../backend/src/main/resources/db/migration/V73__security_events.sql) |
| Temporary lockout | Count of consecutive wrong passwords and the end of the lock | `users.failed_login_attempts`, `users.login_locked_until` | [V72__login_lockout.sql](../../../backend/src/main/resources/db/migration/V72__login_lockout.sql) |
| Legal acceptance | Document type, version, language, revision, content hash and date | `user_legal_acceptances` | [V21__versioned_terms_acceptance.sql](../../../backend/src/main/resources/db/migration/V21__versioned_terms_acceptance.sql) |

Vinnot stores no card data: payment happens at Mercado Pago. Nor does it encrypt
this data at the application level; protection at rest comes from the encrypted
EBS volume ([Defense in depth](defense-in-depth.md#data)).

## Third parties that receive data

| Third party | What it receives | What for | Source |
|---|---|---|---|
| AWS SES | Recipient address and message content | Verification, recovery and notices | [environments and secrets](../infra/architecture/environments-and-secrets.md) |
| Expo Push | Push token and notification text | In-app notifications | [notifications](../modules/notifications/architecture.md) |
| Google / Apple | Nothing extra: Vinnot only verifies the ID token the person obtained | Social sign-in | [passwords and authentication](passwords-and-authentication.md#signing-in-with-google-and-apple) |
| Mercado Pago | To start the payment: event name, quantity, price, currency, Vinnot's commission and an internal reference; it does not receive the person's name or email. Payment details such as the card are entered directly on Mercado Pago | Ticket payments | [Payments](../modules/payments/architecture.md) |
| OpenAI | Wine data, text and, when scanning, the label capture; also content to moderate | AI profiles, recognition and moderation | [OpenAiClient.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/ai/OpenAiClient.java), [resource protection](../backend/architecture/resource-protection.md#ai-admission-spending-and-transport) |
| Google Maps | Place queries and coordinates | Route and event maps | [environments and secrets](../infra/architecture/environments-and-secrets.md#google-maps-credentials-and-usage) |

## Deactivating and deleting the account

| Action | Endpoint | Effect | Source |
|---|---|---|---|
| Deactivate | `DELETE /users/me` | Reversible: sets `active=false`, deletes the refresh tokens and increments `session_version`; the next sign-in asks to confirm reactivation | [deactivate account](../modules/users/use-cases/uc-usr-18-deactivate-account.md) |
| Delete permanently | `DELETE /users/me/permanent` | Requires re-authentication; deletes the aggregate and related resources through foreign keys and cleanup; revokes the Apple authorisation if any; deletes the avatar after the commit; sends a notice by email | [delete account](../modules/users/use-cases/uc-usr-19-delete-account.md), [DeleteOwnAccountCommandHandler.java](../../../backend/src/main/java/com/vinnot/user/application/command/handler/DeleteOwnAccountCommandHandler.java) |

When the account is deleted, two kinds of records stay without the link to the person:

- the security events keep an empty `user_id` (`ON DELETE SET NULL`) until the
  180-day purge removes them, as evidence of attacks on the service;
- the payment records are kept, unlinked from the deleted account (V77); see
  [Payments](../modules/payments/architecture.md).

There is no self-service data export; it is in
[Known limitations](known-limitations.md).

## Security events log

Implemented on 2026-10-30 (commit `67df1d2b`). The `security_events` table
([V73__security_events.sql](../../../backend/src/main/resources/db/migration/V73__security_events.sql)) keeps what happens to each account, to detect
and analyse attacks.

| Field | Content |
|---|---|
| `user_id` | The account concerned; empty when the attempt named an account that does not exist, or once the account is deleted |
| `event_type` | One of 12 types ([SecurityEventType.java](../../../backend/src/main/java/com/vinnot/user/domain/valueobject/SecurityEventType.java)): `LOGIN_SUCCEEDED`, `LOGIN_FAILED`, `LOGIN_LOCKED`, `REFRESH_REUSE_DETECTED`, `PASSWORD_CHANGED`, `PASSWORD_RESET`, `EMAIL_CHANGED`, `ROLE_CHANGED`, `ACCOUNT_BANNED`, `ACCOUNT_UNBANNED`, `ACCOUNT_DELETED` and `ACCOUNT_AUTO_SUSPENDED` |
| `ip_address` | The client IP, by the same rule as the rate limiter: the `X-Forwarded-For` that Caddy sets ([HttpRequestOriginAdapter.java](../../../backend/src/main/java/com/vinnot/user/infrastructure/web/HttpRequestOriginAdapter.java)) |
| `user_agent` | The browser or app, truncated to 256 characters |
| `created_at` | Date and time |

Rules:

- **Retention:** a daily job deletes rows older than 180 days
  (`app.security.events.retention`, value `P180D`;
  [PurgeExpiredSecurityEventsCommandHandler.java](../../../backend/src/main/java/com/vinnot/user/application/command/handler/PurgeExpiredSecurityEventsCommandHandler.java)).
- **Account deletion:** `user_id` is `ON DELETE SET NULL`. The link to the person
  goes at once; the unlinked rows stay until the purge, the `ACCOUNT_DELETED` one
  included.
- **Writing:** the event is stored after the commit of the action that produced it
  ([JdbcSecurityEventAdapter.java](../../../backend/src/main/java/com/vinnot/user/infrastructure/persistence/adapter/JdbcSecurityEventAdapter.java)). If storing it fails, the error is
  logged and the action does not fail ([SecurityEventRecorder.java](../../../backend/src/main/java/com/vinnot/user/application/service/SecurityEventRecorder.java)).
- **Reading:** there is no admin view yet and no actor column for admin actions;
  see [limit 21](known-limitations.md#high-priority).

The [privacy policy](../../../content/public-pages.json) version 2026-10-29
describes this log in its "Security log" section.

## Backups and retention

| Copy | Retention | Source |
|---|---|---|
| Local `pg_dump` on the host | 2 days | [backup and recovery](../infra/operations/backup-and-disaster-recovery.md) |
| Remote copy in S3, production | 30 days (encrypted, versioned bucket) | [production-stack.json](../../../infra/aws-low-cost/production-stack.json) |
| Remote copy in S3, development | 8 days | [backup and recovery](../infra/operations/backup-and-disaster-recovery.md) |

A deleted account leaves the database immediately, but it can remain inside the
backups until they expire: at most 30 days in production. The backup scripts run
with `umask 077`
([backup-local-db.sh](../../../infra/aws-low-cost/backup-local-db.sh)).

## Log hygiene

- The HTTP filter records method, path, status, duration and `requestId`; it
  records neither bodies nor the `Authorization` header
  ([HttpRequestLoggingFilter.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/HttpRequestLoggingFilter.java)).
- The development email provider only records that a message was requested,
  without recipient, link or token
  ([sensitive data and logging](../backend/architecture/security-and-authorization.md#sensitive-data-and-logging)).
- `Password.toString()` returns `[PROTECTED]`.
- Container logs rotate across three 10 MB files and are not centralised; Caddy
  writes JSON access logs
  ([retention](../infra/operations/observability-and-incidents.md#retention-privacy-and-cost)).

## Terms acceptance

Each terms version is published with the SHA-256 hash of its content, and each
acceptance stores the revision, version, language, hash and date, with a foreign
key to the exact document accepted
([V21__versioned_terms_acceptance.sql](../../../backend/src/main/resources/db/migration/V21__versioned_terms_acceptance.sql)).
This makes it possible to prove which text each person accepted. The full flow is
in [versions, evidence and integrity](../modules/legal/architecture.md#versions-evidence-and-integrity).

Versions in force since commit `493aed21`:

- **Terms** `2026-10-29.1`, acceptance revision `terms-2`
  ([V75__terms_2026_10_29.sql](../../../backend/src/main/resources/db/migration/V75__terms_2026_10_29.sql)):
  they describe ticket sales paid through Mercado Pago and the Vinnot commission.
  It is a material change, so whoever accepted the previous version gets the
  notice and the period to accept again.
- **Privacy policy** `2026-10-29`
  ([public-pages.json](../../../content/public-pages.json)): it names Mercado Pago
  and the data it receives for ticket payments, and the security-event log.

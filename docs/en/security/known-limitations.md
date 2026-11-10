# Known limitations

This is the honest list of what is missing or could improve in Vinnot's
security. None of these points is a known exploitable vulnerability: they are
absent or weak controls worth addressing as the platform grows. Each one states
its risk, the mitigation in place today and the recommended next step.

The list was reviewed on 2026-10-30, against the code of that day. Every point
has one of these states:

- **pending:** the control does not exist yet;
- **mitigated:** the control is in the code and the templates, but the
  infrastructure owner still has to apply it by hand in the account;
- **accepted decision:** kept on purpose, with the trigger that forces a review;
- **implemented:** solved in the code; listed under [Resolved](#resolved) with
  the commit that solved it.

The numbers are stable identifiers: a point keeps its number when its priority
or state changes.

Priority: **high** is worth solving before growing the user base; **medium**
reduces a real but bounded risk; **low** is additional hardening.

## High priority

All of these points are **pending**.

| # | Limitation | Risk | Current mitigation | Next step |
|---|---|---|---|---|
| 21 | The security-event log has no admin view and no alerts, and admin actions (role, suspension, deletion) do not record who did them: there is no actor column ([V73__security_events.sql](../../../backend/src/main/resources/db/migration/V73__security_events.sql)) | Analysing an incident needs a manual database query, and nobody can tell which administrator made a change | `security_events` keeps the type, account, IP, browser and time for 180 days ([security events](../modules/users/architecture.md#security-events)) | A read-only ADMIN view, an `actor_id` column on admin events and an alarm on `REFRESH_REUSE_DETECTED` or a burst of `LOGIN_LOCKED` |
| 13 | No Sentry or error reporting for the web and mobile clients | Client-side failures or abuse go unnoticed | Host and edge monitoring | Add an error-reporting service with personal-data scrubbing |
| 12 | App OTA updates are not code-signed (no `codeSigningCertificate` in [app.config.ts](../../../frontend-mobile/app.config.ts)) | If the Expo account were compromised, unauthorised JavaScript could reach every device | HTTPS delivery from Expo; publishing only through the production script | Configure `expo-updates` code signing |

## Medium priority

All of these points are **pending**.

| # | Limitation | Risk | Current mitigation | Next step |
|---|---|---|---|---|
| 7 | BCrypt only uses the first 72 bytes, while requests accept up to 100 characters ([ChangePasswordRequest.java](../../../backend/src/main/java/com/vinnot/user/infrastructure/web/request/ChangePasswordRequest.java)) | Two long passwords sharing a 72-byte prefix are equivalent | Few people use passwords that long | Cap at 72 bytes or migrate to Argon2id |
| 8 | No check against breached or common passwords ([Password.java](../../../backend/src/main/java/com/vinnot/user/domain/valueobject/Password.java)) | Weak passwords that satisfy the composition rule | 8 characters with an uppercase letter, a lowercase letter and a digit; a temporary lock after 5 failures in a row | Check against a common-password list or the Have I Been Pwned k-anonymity service |
| 9 | `JWT_SECRET` also derives the refresh-rotation key and the re-authentication key, separated only by labels ([JwtTokenService.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/security/JwtTokenService.java), [SignedReauthenticationProofAdapter.java](../../../backend/src/main/java/com/vinnot/user/infrastructure/security/SignedReauthenticationProofAdapter.java)) | Leaking one secret compromises all three uses; rotating it ends every session | The secret lives in Secrets Manager and has no default | Independent secrets per purpose, with documented rotation |
| 10 | The re-authentication proof can be reused during its 5 minutes | An intercepted proof enables several sensitive actions within that window | Bound to the user and to the exact `Authorization` header; TLS | A single-use proof (an identifier consumed in the database) |
| 11 | Development deploys use long-lived AWS keys ([deploy-backend-dev.yml](../../../.github/workflows/deploy-backend-dev.yml)) | A leak grants access to the development environment | Permission boundary; production already uses OIDC | Move the development deploys to OIDC |
| 14 | No self-service data export | Answering a data-access request takes manual work | Support on request | An export endpoint behind step-up |

## Low priority

All of these points are **pending**.

| # | Limitation | Risk | Current mitigation | Next step |
|---|---|---|---|---|
| 15 | The web CSP allows `'unsafe-inline'` for styles ([security-headers.json](../../../frontend-react/security-headers.json)) | Style injection if an XSS ever appeared | Scripts without `'unsafe-inline'`; React escapes content | Nonces or hashes for styles |
| 16 | No application-level encryption of personal data | A database dump exposes the data in clear text | Encrypted EBS volume, database with no published port, encrypted backups | Field-level encryption for the most sensitive data (for example the phone number) |
| 17 | Containers without `cap_drop` or a read-only file system ([docker-compose.yml](../../../infra/aws-low-cost/docker-compose.yml)) | More surface if a container is compromised | Non-root user, digest-pinned images, memory and CPU limits | `cap_drop: [ALL]`, `read_only: true` and `no-new-privileges` |
| 18 | No certificate pinning or root / jailbreak detection in the app | Interception on compromised devices | TLS and default ATS; session in SecureStore bound to the device | Evaluate pinning with planned rotation |
| 19 | No CodeQL, OWASP dependency-check or cosign image signing | Code defects or tampered artifacts are found later | Trivy, gitleaks, npm audit, digests and checksums in the release | Enable CodeQL and sign the backend image |

## Mitigated, pending the apply

The code and the templates already have the control. The infrastructure owner
still has to apply the changes in the account, in the order of the
[Cloudflare runbook](../infra/architecture/aws-deployment.md#put-cloudflare-in-front-of-the-api).
State on 2026-10-30: **mitigated**.

| # | Original limitation | What changed | What is left | Commit |
|---|---|---|---|---|
| 2 | The API had no WAF in front of it; `api.vinnot.com` reached Caddy directly | `api.vinnot.com` and `api-dev.vinnot.com` go through the Cloudflare proxy: the Free managed ruleset, DDoS protection and one rate-limit rule on `/api/auth/*`. Caddy trusts only the Cloudflare ranges and reads the client IP from `CF-Connecting-IP` ([Caddyfile](../../../infra/aws-low-cost/Caddyfile)). The security group opens 80 and 443 only to those ranges ([production-stack.json](../../../infra/aws-low-cost/production-stack.json)) | Deploy the Caddyfile, turn on the proxy and the rule in the Cloudflare dashboard, and then restrict the security group | `c9038703` |
| 20 | The network template and production did not match: the template opened 443 only to one operator IP, while production had 443 public | The templates describe the public launch: no operator parameter, no pre-launch WAF rule and the external probe in public mode ([alignment with the public launch](../infra/architecture/hosting-and-runtime.md#alignment-with-the-public-launch)) | Apply the stacks by hand; until then the leftover operator 443 rule stays in the account | `a1dbb5c7`, `c9038703` |

## Accepted decisions

These risks are accepted on purpose. Each one states when it must be evaluated
again. State on 2026-10-30: **accepted decision**.

| # | Decision | Why it is accepted | When to revisit |
|---|---|---|---|
| 3 | Rate-limit counters live in each instance's memory and reset when the backend restarts ([RateLimitingFilter.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/security/RateLimitingFilter.java)) | There is one backend per environment, so the instance counter is the global counter; a restart that resets them is acceptable ([platform decisions](../infra/architecture/hosting-and-runtime.md#platform-decisions)) | When a second backend runs in the same environment: the counters move to a shared store or the limit moves to the edge |
| 22 | Anyone who knows an account's email or username can pause its password sign-in for 15 minutes with 5 wrong passwords, and after the fifth failure the 423 confirms that the account exists ([LoginAttemptGuard.java](../../../backend/src/main/java/com/vinnot/user/application/service/LoginAttemptGuard.java)) | The lock stops per-account brute force, which is the larger risk. The per-IP credential rate limit and the Cloudflare rule on `/api/auth/*` still slow down whoever triggers it; Google or Apple sign-in and the password reset stay available | When `security_events` shows repeated locks of one account from varied addresses |
| 23 | A web client that retries a refresh more than 30 seconds after the rotation ends every session of the account: the web app sends no `rotationId`, so that retry falls outside the idempotent recovery ([RefreshTokenReuseResponder.java](../../../backend/src/main/java/com/vinnot/user/application/service/RefreshTokenReuseResponder.java)) | After 30 seconds, a rotated refresh token that shows up again is treated as stolen; ending every session is the safe answer, and the person only has to sign in again | When `REFRESH_REUSE_DETECTED` shows up on web accounts with no sign of theft: the web app then starts sending `rotationId`, like the app |

## Resolved

State on 2026-10-30: **implemented**. These points are no longer limitations;
the control is described in [Defense in depth](defense-in-depth.md) and in
[Passwords and authentication](passwords-and-authentication.md).

| # | Original limitation | How it was solved | Commit |
|---|---|---|---|
| 1 | Sign-in had no automatic lock and no failed-attempt counter | After 5 wrong passwords in a row, password sign-in pauses for 15 minutes: 423 `ACCOUNT_TEMPORARILY_LOCKED` with `Retry-After` and a security notice by email ([temporary lockout](passwords-and-authentication.md#temporary-sign-in-lockout)) | `67df1d2b` |
| 4 | Reusing a rotated refresh token was rejected, but it did not revoke the token chain | A rotated refresh token presented outside the `rotationId` recovery and after 30 seconds ends every session of the account, revokes the chain and forgets the push devices ([theft detection](passwords-and-authentication.md#refresh-token-theft-detection)) | `67df1d2b` |
| 5 | There was no security-event log | The `security_events` table (V73) records 12 event types with the IP and browser, and is purged after 180 days ([privacy](privacy-and-data-protection.md#security-events-log)). The view and the actor remain as point 21 | `67df1d2b` |
| 6 | An unknown user was answered before BCrypt ran | An unknown account is compared against a dummy BCrypt hash, so it takes as long as a wrong password ([LoginAttemptGuard.java](../../../backend/src/main/java/com/vinnot/user/application/service/LoginAttemptGuard.java)) | `67df1d2b` |

## How this list is updated

When a point is solved, it moves to [Resolved](#resolved) with its commit and is
shown as **implemented** in [Defense in depth](defense-in-depth.md) and in the
[layer explorer](security-explorer.mdx). A new finding enters with the next free
number, its risk, its mitigation and its next step.

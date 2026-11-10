# External security services

This page lists every library, provider or external service Vinnot uses to
authenticate people or defend the platform. For each one it gives the version,
the purpose, where it is configured (the key name only, never its value) and
whether it is a single point of failure. The general technology catalog is in
[Technologies](../architecture/technologies/README.md).

"Single point" column: **yes** means that if the service fails, the function it
protects stops working and there is no automatic alternative.

## Authentication and identity

| Component | Version | Purpose | Configuration | Single point | Source |
|---|---|---|---|---|---|
| Spring Security | 7.1.2 (through Spring Boot 4.1.2) | Filter chain, URL and method authorization, `BCryptPasswordEncoder` | `SecurityConfig` | no (library) | [pom.xml](../../../backend/pom.xml), [SecurityConfig.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java) |
| jjwt | 0.13.0 | HMAC signing and verification of the access JWT and the re-authentication proof | `JWT_SECRET`, `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION` | no (library) | [pom.xml](../../../backend/pom.xml), [JwtTokenService.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/security/JwtTokenService.java) |
| Nimbus JOSE + JWT (`spring-security-oauth2-jose`) | 10.9.1 (managed by Spring Security 7.1.2) | Verify Google and Apple ID tokens against their JWKS | `GOOGLE_OAUTH_AUDIENCES`, `APPLE_OAUTH_AUDIENCES` | no (library) | [SocialIdentityVerifierAdapter.java](../../../backend/src/main/java/com/vinnot/user/infrastructure/identity/SocialIdentityVerifierAdapter.java) |
| Google Identity | service | Google sign-in and step-up; JWKS `googleapis.com/oauth2/v3/certs` | `GOOGLE_OAUTH_AUDIENCES`; clients `@react-oauth/google` ^0.13.5 (web) and `@react-native-google-signin/google-signin` ^16.1.5 (app) | yes, for Google sign-in; password sign-in keeps working | [passwords and authentication](passwords-and-authentication.md#signing-in-with-google-and-apple) |
| Sign in with Apple | service | Social sign-in, step-up and revocation on account deletion; JWKS `appleid.apple.com/auth/keys` | `APPLE_OAUTH_AUDIENCES`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`; client `expo-apple-authentication` ~58.0.2 | yes, for Apple sign-in | [application.yml](../../../backend/src/main/resources/application.yml), [AppleAuthorizationRevocationAdapter.java](../../../backend/src/main/java/com/vinnot/user/infrastructure/identity/AppleAuthorizationRevocationAdapter.java) |
| Facebook Login | Graph API v23.0 | Social sign-in in development only; disabled in production | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`; client `react-native-fbsdk-next` ^13.4.3 | not in production | [environments and secrets](../infra/architecture/environments-and-secrets.md#facebook-availability-by-environment) |
| expo-secure-store | ~58.0.2 | Keep the app session in the Keychain (iOS) and Keystore (Android) | `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` | no | [authSession.storage.ts](../../../frontend-mobile/src/infrastructure/storage/authSession.storage.ts) |

## Abuse and traffic protection

| Component | Version | Purpose | Configuration | Single point | Source |
|---|---|---|---|---|---|
| Bucket4j | 8.21.0 | Rate limits per policy and identity | `RATE_LIMIT_*` | no; counters live in the instance's memory (accepted decision on 2026-10-30: one backend per environment) | [pom.xml](../../../backend/pom.xml), [RateLimitingFilter.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/security/RateLimitingFilter.java) |
| Caffeine | 3.2.4 (managed by Spring Boot) | Hold the buckets with idle expiry | `RATE_LIMIT_MAXIMUM_BUCKETS`, `RATE_LIMIT_BUCKET_IDLE_EXPIRATION` | no | same |
| AWS WAF | service | Managed groups `AWSManagedRulesAmazonIpReputationList`, `AWSManagedRulesCommonRuleSet` and `AWSManagedRulesKnownBadInputsRuleSet` in front of the web app | WebACL `vinnot-prod-web` | no; if it fails, CloudFront keeps serving | [production-web-stack.json](../../../infra/aws-low-cost/production-web-stack.json) |
| Amazon CloudFront | service (Free plan) | TLS 1.2+ with an HTTPS redirect, security headers through a function, S3 access through Origin Access Control | web stack | yes, for the web app | same |
| AWS Certificate Manager | service | TLS certificate for `vinnot.com` on CloudFront | `CertificateArn` parameter | yes, for the web app | same |
| Cloudflare proxy and WAF (Free plan) | service | In front of `api.vinnot.com` and `api-dev.vinnot.com`: terminates the client TLS, applies the Free managed ruleset, DDoS protection and one rate-limit rule on `/api/auth/*`, and encrypts again towards Caddy in Full (strict). Bot Fight Mode stays off so it does not block the Mercado Pago webhooks. State: mitigated on 2026-10-30, pending the owner turning it on | Cloudflare dashboard, in the order of the [runbook](../infra/architecture/aws-deployment.md#put-cloudflare-in-front-of-the-api); origin ranges in the `trusted_proxies` of the [Caddyfile](../../../infra/aws-low-cost/Caddyfile) and in the security group | yes, for the API once active; to roll back, reopen the origin first and then set the record to DNS-only ([steps](../infra/architecture/aws-deployment.md#4-roll-back)) | [production-stack.json](../../../infra/aws-low-cost/production-stack.json), [Caddyfile](../../../infra/aws-low-cost/Caddyfile) |
| Caddy | 2.11.6-alpine, digest-pinned | API reverse proxy, automatic TLS, HSTS and headers; trusts only the Cloudflare ranges to read `CF-Connecting-IP` | [Caddyfile](../../../infra/aws-low-cost/Caddyfile), `VINNOT_API_HOST` | yes, for the API | [docker-compose.yml](../../../infra/aws-low-cost/docker-compose.yml) |
| Caddy's ACME authority | service | Issue and renew the API certificate | The Caddyfile pins no issuer, so Caddy's default issuers apply (Let's Encrypt, with ZeroSSL as the alternative); the issuer actually in use in production is not verified | no; Caddy switches issuer if one fails | [Caddyfile](../../../infra/aws-low-cost/Caddyfile) |
| Cloudflare image Worker | service | Serves only keys matching strict patterns; CSP with `sandbox` for SVGs | [wrangler.jsonc](../../../infra/cloudflare/catalog-images/wrangler.jsonc) | yes, for catalog images | [worker.mjs](../../../infra/cloudflare/catalog-images/worker.mjs) |
| Cloudflare Access (Zero Trust Free) | service | Restricts who can read the documentation site | Cloudflare dashboard (not codified) | yes, for the documentation | [documentation site](../governance/documentation-site.md) |

## Infrastructure and secrets

| Component | Version | Purpose | Configuration | Single point | Source |
|---|---|---|---|---|---|
| AWS Secrets Manager | service | Backend secrets under `vinnot/prod/backend-*` | host role | not at runtime: the backend reads the already written `runtime.env`; yes for refreshing it or deploying | [refresh-runtime-env.sh](../../../infra/aws-low-cost/refresh-runtime-env.sh), [environments and secrets](../infra/architecture/environments-and-secrets.md) |
| AWS Systems Manager (SSM) | service | Administrative access without SSH, and the release run (document `Vinnot-ProductionRelease`) | host role, release stack | yes, to administer and deploy | [production-release-stack.json](../../../infra/aws-low-cost/iam/production-release-stack.json) |
| AWS IAM + GitHub OIDC | service | Temporary credentials for the production release with the role `vinnot-production-release`; a least-privilege host role | IAM stacks | yes, to publish a release | [production-release.yml](../../../.github/workflows/production-release.yml) |
| S3 / EBS (AWS encryption) | service | SSE-AES256, Block Public Access, non-TLS traffic denied; encrypted EBS volume | [production-stack.json](../../../infra/aws-low-cost/production-stack.json) | no | same |
| Java `javax.crypto` (AES-GCM) | JDK 25 | Encrypt Mercado Pago seller credentials | `EVENT_PAYMENTS_ENCRYPTION_KEY` | yes, for charging: without the key nothing decrypts | [PaymentCredentialCipher.java](../../../backend/src/main/java/com/vinnot/payment/infrastructure/security/PaymentCredentialCipher.java) |

## Payments

| Component | Version | Purpose | Configuration | Single point | Source |
|---|---|---|---|---|---|
| Mercado Pago webhook signatures | HMAC-SHA256 | Authenticate payment notifications | `EVENT_PAYMENTS_WEBHOOK_SECRET` | no; reconciliation queries the gateway | [MercadoPagoWebhookSignature.java](../../../backend/src/main/java/com/vinnot/payment/infrastructure/security/MercadoPagoWebhookSignature.java) |
| Mercado Pago OAuth | service | Link an organiser's payout account | `EVENT_PAYMENTS_CLIENT_ID`, `EVENT_PAYMENTS_CLIENT_SECRET` | yes, to sell tickets | [Payments](../modules/payments/architecture.md) |

## Supply chain

| Component | Version | Purpose | Configuration | Single point | Source |
|---|---|---|---|---|---|
| Dependabot | GitHub service | Updates for Actions, npm, Maven, Docker and Compose | [dependabot.yml](../../../.github/dependabot.yml) | no | same |
| Trivy | 0.74.0, SHA-256-verified install | HIGH/CRITICAL vulnerabilities in Maven, the image and the Android lockfile | [security-checks.yml](../../../.github/workflows/security-checks.yml) | no | [install-security-tools.mjs](../../../scripts/install-security-tools.mjs) |
| gitleaks | 8.28.0, SHA-256-verified install | Secrets across the whole Git history | [ci.yml](../../../.github/workflows/ci.yml) | no | same |
| actionlint | 1.7.12, SHA-256-verified install | Workflow errors | [ci.yml](../../../.github/workflows/ci.yml) | no | same |
| CycloneDX (through Trivy) | SBOM format | Component inventory of the backend image | [production-release.yml](../../../.github/workflows/production-release.yml) | no | same |
| npm audit | npm from Node 22 | `high` or worse vulnerabilities in web, mobile and docs | [audit-npm-dependencies.mjs](../../../scripts/audit-npm-dependencies.mjs) | no | same |
| Amazon ECR scan on push | service | Image scan on upload; immutable tags | [production-stack.json](../../../infra/aws-low-cost/production-stack.json) | no | same |

## What Vinnot does not use

To avoid assumptions: there is no external identity provider (Auth0, Cognito or
similar), no CAPTCHA, no Sentry or other error reporting, and no CodeQL. The API
WAF is already in the code (the Cloudflare proxy) and pending the owner's apply. The gaps this leaves are prioritised in
[Known limitations](known-limitations.md).

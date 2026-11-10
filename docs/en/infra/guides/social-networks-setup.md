# Social networks setup

Guide for the product owner: how to prepare Instagram, Facebook, Threads and TikTok so the
social media agent publishes by itself, where each secret goes and in what order things are
switched on. The behaviour is in [Social media marketing](../../modules/marketing/README.md) and
the full variable list in [Environments and secrets](../architecture/environments-and-secrets.md#social-media-agent).

Everything starts off: without these variables the backend starts, publishes nothing and the
panel shows every network as not configured.

## Before you start

- A brand account on each network, with admin access.
- Access to the AWS console to edit each environment's backend secret.
- Each environment's URLs:

| Environment | API | Admin web |
|---|---|---|
| Development | `https://api-dev.vinnot.com/api` | `https://dev.vinnot.com/admin/social-posts` |
| Production | `https://api.vinnot.com/api` | `https://vinnot.com/admin/social-posts` |

Each environment uses its own values. Tokens and encryption keys are never copied between
environments.

## Where each secret goes

The values go in the backend's JSON secret in AWS Secrets Manager (`vinnot/dev/backend` or
`vinnot/prod/backend`), one key per variable. Never in Git, `VITE_*`, `EXPO_PUBLIC_*`,
screenshots or tickets. After editing the secret:

- Development: the next deployment regenerates `runtime.env` with `refresh-runtime-env.sh`.
- Production: the operator materializes `runtime.env` with `refresh-runtime-env.sh prod` and
  publishes through the [deployment](deployment.md) procedure. Changing the secret in AWS does not
  change the running container by itself.

Variable changes, switches included, apply when the backend restarts.

## 1. Encryption key

Threads and TikTok tokens are stored encrypted with AES-256-GCM. Generate one key per environment:

```bash
openssl rand -base64 32
```

Store it as `MARKETING_ACCOUNTS_ENCRYPTION_KEY`. Without it the panel does not allow connecting
("SOCIAL_ACCOUNT_ENCRYPTION_KEY_MISSING"); a malformed key stops the backend from starting.

Rotating the key makes the stored tokens unreadable: Threads and TikTok switch to "The access
could not be renewed" (`TOKEN_UNREADABLE`), a notice arrives and they must be connected again from
the panel.

## 2. Meta: Instagram and the Facebook Page

Instagram and Facebook use a Meta system-user token that does not expire. They are not connected
from the panel: they are configured with secrets.

1. **Business portfolio.** In [Meta Business Suite](https://business.facebook.com/) create or use
   the brand's business portfolio.
2. **Page and Instagram account.** The brand's Facebook Page must be in the portfolio and the
   Instagram account must be professional (business or creator) and linked to that Page.
3. **Developer app.** In [Meta for Developers](https://developers.facebook.com/) create a business
   app tied to the portfolio, with the Instagram API (with Facebook login) and Pages products.
4. **System user.** In the portfolio settings, "Users › System users", create an admin system
   user, assign it the app, the Page and the Instagram account with full control, and generate a
   **non-expiring** token for the app with these permissions:

   | Permission | What for |
   |---|---|
   | `instagram_basic` | Read the Instagram account |
   | `instagram_content_publish` | Publish carousels on Instagram |
   | `instagram_manage_insights` | Read the Instagram metrics |
   | `pages_show_list` | See the Page |
   | `pages_read_engagement` | Read the Page, its posts, comments and shares |
   | `pages_manage_posts` | Publish on the Page |
   | `read_insights` | Read the Page posts' metrics |
   | `business_management` | Use the portfolio's assets with the system user |

   The names follow Meta's documentation; confirm in Meta's app dashboard that the list matches
   the permissions offered by Graph API `v27.0` and whether any requires App Review for your own
   account.
5. **Ids.** Copy the Instagram account id (the Graph API Instagram user) and the Page id.
6. **Secrets.** Store in the backend secret:

   | Variable | Value |
   |---|---|
   | `MARKETING_META_ACCESS_TOKEN` | The system-user token |
   | `MARKETING_META_INSTAGRAM_USER_ID` | The Instagram account id |
   | `MARKETING_META_PAGE_ID` | The Page id |
   | `MARKETING_META_PAGE_ACCESS_TOKEN` | Optional; empty, the backend reads the Page token with the system-user token |

7. After deploying, the "Network connections" panel shows Instagram and Facebook as
   "Configured on the server".

## 3. Threads

Threads is connected from the panel with OAuth.

1. In [Meta for Developers](https://developers.facebook.com/) create an app with the Threads API
   access use case (it can be the same Meta app or a separate one; confirm in Meta's dashboard
   which combination your app allows).
2. Add the `threads_basic`, `threads_content_publish` and `threads_manage_insights` permissions.
3. In the app's Threads settings, register the redirect URL:
   - Production: `https://api.vinnot.com/api/public/social-accounts/threads/callback`
   - Development: `https://api-dev.vinnot.com/api/public/social-accounts/threads/callback`

   When Meta's dashboard also asks for uninstall and data deletion URLs, fill in the ones it
   requires; the backend exposes no endpoints of its own for those callbacks.
4. While the app is not published, add the brand's Threads account as a tester ("Roles › Threads
   Testers") and accept the invite in Threads, in the account settings, website permissions.
5. Store in the backend secret:

   | Variable | Value |
   |---|---|
   | `MARKETING_THREADS_CLIENT_ID` | Threads app id |
   | `MARKETING_THREADS_CLIENT_SECRET` | Threads app secret |
   | `MARKETING_THREADS_REDIRECT_URI` | The exact redirect URL from step 3 |

6. After deploying, open `/admin/social-posts` on the web, click "Connect" on Threads, sign in
   with the brand account and accept. Back on the page, Threads shows "Connected" with the account
   and its expiry. The token lasts 60 days and the backend refreshes it by itself in its last 10 days.

## 4. TikTok

TikTok is also connected from the panel with OAuth. Until TikTok audits the app, posts arrive as
drafts in the account's inbox and are finished by hand in the TikTok app. Within 15 minutes of
posting a draft, the admin page shows that TikTok publication as published (with "View on TikTok"
once TikTok makes the public post available); drafts older than 14 days are no longer checked.

1. In [TikTok for Developers](https://developers.tiktok.com/) create an app for the brand's
   organization.
2. Add the Login Kit (web) and Content Posting API products, with the `user.info.basic`,
   `video.upload`, `video.publish` and `video.list` scopes.
3. In Login Kit register the redirect URI:
   - Production: `https://api.vinnot.com/api/public/social-accounts/tiktok/callback`
   - Development: `https://api-dev.vinnot.com/api/public/social-accounts/tiktok/callback`
4. TikTok pulls the photos from their URLs. Verify ownership of the images domain
   (`images.vinnot.com`) in the app; confirm in TikTok's portal whether it asks for the domain or a
   URL prefix.
5. Store in the backend secret:

   | Variable | Value |
   |---|---|
   | `MARKETING_TIKTOK_CLIENT_KEY` | The app's client key |
   | `MARKETING_TIKTOK_CLIENT_SECRET` | The app's client secret |
   | `MARKETING_TIKTOK_REDIRECT_URI` | The exact redirect URI from step 3 |

6. After deploying, click "Connect" on TikTok on the web and sign in with the brand account. The
   backend refreshes the token by itself before it expires.
7. Keep `MARKETING_PUBLISHING_TIKTOK_MODE=MEDIA_UPLOAD` (the default). Every draft sends an email and a "Draft
   on TikTok" push.
8. Once TikTok approves the app's audit for direct posting, change
   `MARKETING_PUBLISHING_TIKTOK_MODE=DIRECT_POST` and deploy again. Posts go out with the most open
   privacy the account offers.

## 5. Switch-on order

Switch one thing on at a time and check before going on.

1. **Accounts.** With steps 1 to 4 deployed, the "Network connections" panel shows Instagram and
   Facebook "Configured on the server" and Threads and TikTok "Connected".
2. **One network.** Switch a single network on first, for example
   `MARKETING_PUBLISHING_INSTAGRAM_ENABLED=true`. The others: `MARKETING_PUBLISHING_FACEBOOK_ENABLED`,
   `MARKETING_PUBLISHING_THREADS_ENABLED` and `MARKETING_PUBLISHING_TIKTOK_ENABLED`.
3. **Publishing.** `MARKETING_PUBLISHING_ENABLED=true` and deploy. From then on, every approved post
   with ready slides goes out by itself at its slot. Check the first one in the panel: status
   "Published" and "View on <network>". Add the other networks one by one.
4. **Metrics.** `MARKETING_METRICS_ENABLED=true`. The reading runs every day at 06:00 and the metrics
   show on each post the next day.
5. **Auto-approval.** `MARKETING_AUTO_APPROVE_ENABLED=true` and, in the "Content pillars" panel, turn
   "Auto-approve" on only for the pillars you want. The rest keep waiting for your approval.

To switch everything off, set `MARKETING_PUBLISHING_ENABLED=false` again: queued publications fail
with `PUBLISHING_OFF`, approved posts that have not started stay approved, and nothing else is published.

## Common problems

| What you see | What to do |
|---|---|
| "This network's app is not configured on the server." | `MARKETING_<NETWORK>_CLIENT_*` or the redirect URI is missing in the environment |
| "<network> could not be connected. Try again." | Click "Connect" again within 10 minutes and without restarting the backend in between; check that the redirect URI registered on the network is identical to the one in the secret |
| "The access could not be renewed: connect it again." | Click "Reconnect"; it happens when the network revoked access, the token expired or the encryption key was rotated |
| A "Failed" network with `NOT_CONNECTED` or `TOKEN_INVALID` | Configure or reconnect the account and click "Retry" on that network |
| A "Failed" network with `MEDIA_NOT_PUBLIC` | The slides have no absolute https URL: check the storage configuration (with R2 they are served at `https://images.vinnot.com/…`) and request a new illustration if needed |
| Posts that do not go out | Check that `MARKETING_PUBLISHING_ENABLED` and the network are on and that the post is approved with ready slides; a post approved more than 12 hours after its slot is no longer published |

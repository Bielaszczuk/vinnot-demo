# Points and seals

Rewards each person's real activity with points and shows a wax-seal emblem that
changes with them. The modules where the activity happens (reviews, cellar, wines,
events and users) report each action; this module decides how many points it is
worth, applies the caps, stores every entry, computes the tier and notifies when a
new one is reached. The user-facing guide is
[Points and seals](../../manuals/points-and-seals.mdx).

- Module code: `GAM`.
- Backend: package [`gamification`](../../../../backend/src/main/java/com/vinnot/gamification/), with the input ports the other modules call.
- [Use cases](use-cases/README.md) · [Requirements](requirements.md) ·
  [Architecture](architecture.md) · [Testing](testing.md)
- Out of scope: ranking between people, showing points on public profiles and a verified badge. “Sommelier” stays reserved for that future badge. Public profiles ([Community](../community/README.md)) show the current seal (`tier`), never the points.

## Tiers

Eleven tiers by **current** points: the tier drops when points are revoked. The
celebration and the push fire only the first time each tier is reached.

| Key | Name (es) | Name (en) | From | Art (`<slug>.webp`) |
|---|---|---|---|---|
| `BROTE` | Brote | Bud | 0 | `brote` |
| `PARRA` | Parra | Vine Leaf | 30 | `parra` |
| `RACIMO` | Racimo | Cluster | 80 | `racimo` |
| `VENDIMIA` | Vendimia | Harvest | 160 | `vendimia` |
| `LAGAR` | Lagar | Wine Press | 280 | `lagar` |
| `BARRICA` | Barrica | Barrel | 450 | `barrica` |
| `CRIANZA` | Crianza | Aging | 700 | `crianza` |
| `RESERVA` | Reserva | Reserve | 1000 | `reserva` |
| `GRAN_RESERVA` | Gran Reserva | Grand Reserve | 1600 | `gran-reserva` |
| `GRAN_ENOFILO` | Gran Enófilo | Connoisseur | 2600 | `gran-enofilo` |
| `VINNOT` | Vinnot | Vinnot | 5000 | `vinnot` |

The slug is the key in lower case with `_` turned into `-`. The art lives in
`frontend-mobile/assets/images/emblems/` and `frontend-react/public/images/emblems/`.

## Points per action

| Source (`source`) | Action | Points | Rule |
|---|---|---|---|
| `REVIEW` | Approved review | +3 | Once per wine |
| `REVIEW_NOTE` | Review with a comment of 80 characters or more | +2 | Once per wine |
| `LIKE_RECEIVED` | Like received | +1 | Up to 5 per day; self-likes are allowed and count |
| `COMMENT` | Comment on someone else's review | +1 | Up to 3 per day |
| `WINE_APPROVED` | Approved NEW wine submission | +8 | Outside the daily cap |
| `SCAN_MATCH` | Label scan with an exact wine match | +1 | Once per wine, up to 3 per day; uses a new per-user scan record, with no history |
| `CELLAR_ADD` | Manual cellar add | +1 | Once per wine ever, up to 3 per day; a cellar entry created by a review gives 0 |
| `EVENT_REGISTRATION` | Confirmed event registration | +4 | Revoked on cancel, reject or expire |
| `PROFILE_COMPLETE` | Profile complete: photo, first and last name and phone number | +5 | Once |
| `FOLLOWER_GAINED` | New follower with a verified email and at least one approved review | +1 | Once per follower (key: the follower's id), up to 10 per day, inside the global cap |

- **Global cap:** 40 points per day in the person's time zone (`users.timezone`); approved wine submissions are excluded.
- Giving likes earns nothing.
- **Idempotency:** each award is unique per (person, source, source key); revocations are idempotent too.

## Revocation and edge cases

| Case | Rule |
|---|---|
| Deleting a review and creating it again | Nets zero: the deletion revokes and the new review awards again under the same key |
| Moderation | Removing content removes only that content's points; rejecting a review also revokes the likes it received |
| Deleted review with comments | Commenters keep their points |
| Account of a liker deleted | Does not revoke the like point |
| Rejected or pending review | Earns nothing until approved, likes included; editing it back to `PENDING` revokes its points and its likes' points, and approval awards the review, the note and one point per current like again under the same keys, idempotently and within the daily caps of that moment |
| Registration cancelled, rejected or expired | Revokes the 4 points |
| Follower unfollows, or a block ends the follow | Revokes that follower's point; following again the same day counts again toward the 10-a-day limit |
| Follower qualifies after following | Earns nothing retroactively; only a follow made while qualified awards |
| Locked or inactive account | Hides the seal (`badgeTier` is `null`) |
| Permanent account deletion | Removes that person's points |

## API

Additive: the 0.2.0 app keeps working. Both endpoints share the base and
authentication of the other `/users/me` endpoints.

| Method | Path | Result |
|---|---|---|
| `GET` | `/users/me/points` | Points, tier, progress, daily cap, pending celebrations and recent entries |
| `POST` | `/users/me/points/celebrations` | `{ tier }` marks that tier (and any lower) as celebrated; `{ welcome: true }` dismisses the welcome card. Responds `204` |

`GET /users/me/points` response:

| Field | Content |
|---|---|
| `points` | Current points |
| `tier` | Current tier key |
| `nextTier`, `nextTierAt` | Next tier and its threshold; `null` at `VINNOT` |
| `tierFloor` | Current tier threshold |
| `todayEarned`, `dailyCap` | Points earned today and the daily cap (40) |
| `pendingCelebration` | Highest tier reached and not yet celebrated, or `null` |
| `showWelcome` | `true` until the welcome card shown after the backfill is dismissed |
| `recent` | Last 20 entries `{ id, source, points, createdAt, label }`; revocations are negative entries and `label` is the related wine or event name, or `null` |

Dates are ISO-8601 instants. Also:

- `badgeTier` (tier key, nullable) is added to every author object: review lists (`ReviewResponse.ReviewerInfo`, loaded in batch, never one query per review), review comments and admin reviews. It is `null` when the account is locked or inactive.
- The admin user list adds `points` and `badgeTier`.
- The unused `UserBadgeDto` is removed from `users.dto.ts` in the website and the app.

The full catalog is in the [API reference](../../backend/architecture/api.md).

## Push

New `TIER_REACHED` type (“Reached <tier>”), with Spanish and English templates that
name the tier in the person's language (“Reached Vine Leaf”, «Alcanzaste Parra»). It
is governed by the optional **Community** preference, goes through the durable effect
queue once per tier and person, and is never sent during the backfill. See
[Notifications](../notifications/README.md).

## Data and backfill (V70)

Flyway migration `V70` creates the points storage: a per-person entry log (source,
source key, points and date; revocations are negative entries) and each person's
state (celebrated tier and welcome card):

| Table | Content |
|---|---|
| `user_points` | One row per person who ever had points: `points` (never negative), current tier, highest tier reached, highest tier celebrated and `welcome_seen` |
| `user_point_awards` | Every award, unique per (`user_id`, `source`, `source_key`); a revoked award stays with `active = false` so it can be granted again without counting twice |
| `user_point_movements` | The history the person sees; revocations are negative rows. Index `(user_id, created_at DESC)` |
| `wine_label_scans` | One row per scan by a signed-in person (`wine_id` with `ON DELETE SET NULL`, `outcome`); no earlier history |

All of them have `user_id` with cascade delete, so permanent account deletion removes the points.

In the same migration it:

1. Backfills historical points from existing data with the same sources, source keys and daily caps, so a later action on old content never awards twice.
2. Sends no push.
3. Leaves every person with points at their backfilled tier, marked as already celebrated, with the welcome card pending instead of a celebration.
4. Does not backfill scans: the per-person scan record starts empty.
5. Counts each day in the person's `users.timezone` when PostgreSQL knows it (`pg_timezone_names`), else in `America/Argentina/Buenos_Aires`, the zone the runtime falls back to.

V71 adds the one-decimal cellar rating (0.1–5.0) in a new `rating_decimal` column
and keeps the integer `rating` 1–5 for the previous backend revision; see
[Cellar](../cellar/README.md).

## Architecture

It follows the backend hexagonal flow:

1. The review, cellar, wine submission, scan, registration and profile command handlers call the gamification input port to award or revoke, with the source and source key.
2. The use case takes a per-person lock, so two simultaneous awards cannot exceed the caps, and applies the domain rules: value per source, daily limit per source, global cap in the person's time zone and idempotency per key.
3. Output ports store the entry and the person's state; the persistence adapters live in infrastructure.
4. When the current tier is above the highest reached, it enqueues `TIER_REACHED` on the durable effect queue.
5. `GET /users/me/points` is a query that projects the state and the recent entries; review lists get `badgeTier` with a single query per page.

## Interface

| Part | Behaviour |
|---|---|
| `UserBadge` | Tier art with its animation, escalating by tier. The app uses Skia with Reanimated clocks; the website uses CSS (masks, blend modes and animated custom properties). Light layers are clipped to the seal shape |
| Animation per tier | Bud sways; Vine Leaf sways and breathes; Cluster ripens its grapes from green to purple with dew; Harvest has a knife glint; Wine Press, an occasional sweep; Barrel, a metallic sweep; Aging, sheen and a wine halo; Reserve, gold sheen and a gold halo; Grand Reserve, constant gold, slow rays and sparkles; Connoisseur, rotating chrome and sparks; Vinnot, holographic foil following the finger or pointer, glitter and rising particles |
| In lists | Plays once when it appears and again every 8 to 16 seconds; no sparkles below 40 px |
| On the profile | Loops forever |
| Reduced motion | Still seal with a fixed highlight |
| Own profile header | Seal, points, tier name and a progress bar to the next tier; tapping the seal opens “Your points”: how to earn, recent entries and the full ladder |
| Next to the name | Review lists, own reviews, review comments and admin users. Not on organisers, blocks, reports or push |
| Celebration | Full-screen seal reveal, once per tier; then `POST /users/me/points/celebrations` |
| Welcome | One-time card after the backfill; dismissed with `{ welcome: true }` |

Glass ratings and the bottle control belong to [Reviews](../reviews/README.md) and
[Cellar](../cellar/README.md).

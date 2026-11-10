# Videos

Vinnot demo videos. Each one walks through several related actions so the series stays short: ten videos of one to four minutes.

| # | Video | Platform | Account | Length | Status |
|---|---|---|---|---|---|
| 1 | [Product tour](01-product-tour.md) | App | Visitor, then a new account | 1:27 | Published |
| 2 | [Wines](02-wines-on-the-web.md) | App | Signed-in user | 2:01 | Published |
| 3 | [The app: scan and your cellar](03-app-scan-and-cellar.md) | App | Signed-in user | 0:53 | Partly published |
| 4 | [Events and tickets](04-events-and-tickets.md) | App | Signed-in user | 1:12 | Published |
| 5 | [Wine routes and shared links](05-routes-and-sharing.md) | App | Signed-in user | 1:27 | Published |
| 6 | [Your account, community and help](06-account-and-community.md) | App | Signed-in user | 2:54 | Published |
| 7 | [Organizing events](07-organize-events.md) | App | Partner | 2:14 | Published |
| 8 | [Moderation](08-moderation.md) | App | Moderator | 2:00 | Published |
| 9 | [Administration](09-administration.md) | App | Administrator | 4:24 | Published |
| 10 | [The web](10-web.md) | Web | Visitor, then an administrator | 1:47 | Published |

## How to record

- Record in the development environment with test accounts and data, never with real people's data.
- Keep one language for the whole recording and repeat the video in English only when needed.
- When a video is published, replace "Not published" with its link and change the status to "Published".

## How to publish

- Videos are published on R2 and served from `images.vinnot.com`, like the diagrams.
- Export in H.264 at 720 wide for app videos and 1280 wide for web videos, without audio, with `-movflags +faststart` so playback starts before the whole file downloads.
- Name the file `docs/videos/v1/es/<script-name>-<first 12 characters of its SHA-256>.mp4`. The hash changes with the content, so a new video never replaces the old one in caches.
- Upload it with `wrangler r2 object put vinnot-catalog-images/<key> --file <file> --content-type video/mp4 --remote` and put the URL in Link.

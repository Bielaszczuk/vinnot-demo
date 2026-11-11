# Web functional map

## Purpose and scope

This map links to detailed workflows. Each document distinguishes actor, input,
presentation state, application operation and backend authority. A service
method does not imply that every screen exposes it.

## Workflows

- [Public information, policies and support](../../modules/support/architecture.md)

| Area | Document | Content |
|---|---|---|
| Identity | [Authentication and account](../../modules/users/architecture.md) | Login, social, bootstrap, refresh, action links, profile |
| Discovery | [Catalog and detail](../../modules/wines/architecture.md) | Text, filters, pagination, navigation, related queries |
| AI | [Profiles and comparisons](../../modules/ai/architecture.md) | Read/generate, language, selection, cache |
| User | [Cellar](../../modules/cellar/architecture.md#web) and [reviews](../../modules/reviews/architecture.md#web) | Personal entries, reviews, likes, comments |
| Geography | [Events](../../modules/events/architecture.md#web), [wineries](../../modules/wineries/architecture.md#web) and [routes](../../modules/wine-routes/architecture.md#web) | Discovery, registration, Mercado Pago checkout → return/receipt, my tickets, maps, stops |
| Management | [Administration and moderation](../../modules/admin/architecture.md#web) | Roles, catalog and moderation |

## Scanning: platform boundary

Label recognition is exclusive to mobile.
`WineScanPage` invites app download. It neither requests camera access, analyzes
photos nor invokes `/wines/scan`. The web panel can moderate submissions created
from mobile.

## Cross-cutting reading

- [Remote state and transport](../architecture/remote-state-and-transport.md)
- [Platform, language and persistence](../architecture/platform-and-localization.md)
- [Product sequences and states](../diagrams/product-processes.md)
- [Testing strategy](../testing/strategy.md)

Loading, empty, failure, success and cancellation are documented per operation.
Testing matrices define verification criteria without asserting nonexistent
coverage. Defects and change proposals remain outside the canonical corpus.

## Community and moderation

Reviews and comments provide contextual reports, author reports and confirmed blocking. Events/routes provide reporting. Profile links to personal cases and unblocking; administration supports review and removal of reviews/comments with a required reason. See the [community contract](../../modules/community/architecture.md).

## Social profiles and follows

- **Public profile** (`/users/:id`): photo, name, @username, bio, current seal, counters (followers, following, reviews, wines in cellar), Follow/Following button, taste match with the viewer, illustrated taste profile and the Reviews and Cellar sections. The cellar shows a locked state when its owner does not share it with the viewer; it never shows private notes or prices. On the own profile the button is «Edit profile».
- **Taste profile** (public profile card, in Vinnot's watercolor style): the animated taste wheel: a flower of watercolor petals on a cream paper stage, with the grape cluster in a centre disc (respects reduced motion). Each entry is one painted petal, its tip toward the centre, at equal angles from twelve o'clock; it is longer the higher the score (72% of the full length at 0, the full length at 5), as wide as up to 1.15 times the art but never past the spacing to its neighbours, so the petals nearly touch, cycles three petal shapes with a slight tilt, and starts just outside the centre disc so it never touches the centre text. Each petal is its color seen through a grayscale petal wash (a masked tint with the wash multiplied over it); the legend repeats it on a tiny petal. A selector above it («Grapes», the default; «Styles»; «Regions») shows one kind at a time and hides a view with no data (without grapes it opens on the first view with data). Colors carry meaning: each grape takes the tone of its wines (`tone`: reds in garnet, ruby, violet and plum; whites in gold, straw and green-yellow; rosés in pinks; anything else neutral), grouped by tone with alternating shades so neighbors never look alike; styles use each wine type's color, with its translated name, and regions eight distinct hues. Tapping a petal (anywhere in its sector) or its legend row highlights it (it grows about 8% and moves out about 6 px while the rest fade) and the center shows the name, the average score with one decimal and the rated wines («N wines»), always inside the disc: at most two lines, a smaller type step for long names and an ellipsis only as a last resort; tapping it again, Escape or switching the view clears it. Petals and rows are keyboard-accessible buttons; below it, or to its right on large screens, «Structure» with four scales (Acidity, Body, Tannin and Sweetness), each with its illustration, a level word (low, medium or high; sweetness as dry, off-dry or sweet) and a marker at the 0-100 score; and «Preferred aromas» («Your preferred aromas» on the own profile) with the Fruity, Floral, Herbal, Spicy, Oak and Mineral families as illustrated chips with their percentage, largest first. Each section is hidden when it has no data; without traits (`tasteTraits` null) only the wheel shows. Under 5 rated wines the card shows a locked state with a short explanation; when the member completed the taste quiz, it shows their traits beside a compact note that the wheel completes with 5 rated wines. When any value comes from the quiz (`tasteTraits.fromQuiz`), a note reads «Based on your taste quiz» on the own profile and «Based on the taste quiz» on someone else's. On the own profile the card offers «Take the taste quiz» or, once completed, «Retake the quiz». The illustrations are decorative: the text carries the meaning.
- **Adjusting the palate** (own profile only; visitors never see the controls): «Adjust», in the «Structure» header, turns the four bars into sliders from 0 to 100. The member drags the marker or taps the bar to fill or empty it; with the keyboard, the arrows move by 5, Page Up/Page Down by 10 and Home/End go to either end. Each slider is accessible (`role="slider"`, with the trait name and the level word as its announced value) and the level word updates live. A trait without data starts at 50 and is only saved when the member moves it. «Save» sends only the traits that changed (`PUT /users/me/taste-traits` with `{"structure":{"ACIDITY":80}}`) and, once the refreshed profile arrives, returns to the bars; «Cancel» restores the values without saving. A manual value wins over the calculated one and its trait shows the «Adjusted» tag; «Reset to calculated», shown only when some trait is adjusted, clears every adjustment (`DELETE /users/me/taste-traits`). If saving fails, the sliders stay open with a message. On an own profile without structure, the section shows with an invitation to set it.
- **Taste quiz** (`/taste-quiz`, session required): five illustrated questions, one per screen, that build a starting taste profile: a rainy day, the favorite fruit, a dessert, a special dinner and the preferred scent. Each answer is a card with its watercolor on a cream stage and its label; the member only sees the options, never how they map to traits. An indicator shows progress (1 of 5); tapping an option highlights it and, after a short beat, moves to the next question; «Back» returns with the answer kept. «Skip», on every step, records the skip (`POST /users/me/taste-quiz/skip`) and returns to where the member was (Home when there is no origin); when retaking a completed quiz it only leaves, without erasing it. After the fifth answer the five are sent (`PUT /users/me/taste-quiz`) while «Defining your taste profile» tells, with the same watercolor scene engine as the AI profile but with scenes of its own, how the profile grows from the chosen options: «Gathering your picks» (a fountain pen draws each of the five chosen options into an open tasting journal, inked into the page with a handwritten note beside it), «Filling your glass» (an empty glass fills with red wine and its aromas rise in wisps), «Blending your flavors» (a brush dips into two wells of the palette and swirls the colors) and «Shaping your taste profile» (the brush shapes the wheel petal by petal around a glass of red wine seen from above, and repeats while saving). Each scene moves at a calm pace with eased motion and rests a moment on its final pose before the next one; the animation lasts at least 13.4 seconds so the four scenes are seen; with reduced motion each scene shows its final pose. Then the member's own public profile opens. If saving fails, it offers a retry that keeps the answers. Options are keyboard-accessible buttons that announce which one is chosen, and the page respects reduced motion.
- **Quiz invitation**: after sign-in, when `GET /users/me/taste-quiz` answers `shouldPrompt: true` (quiz pending and fewer than 5 rated wines), the app takes the member to the quiz once and remembers the page they came from. It does not interrupt again in the same browser session; across sessions the server status (skipped or completed) prevents it. It never redirects from public, legal or error pages, nor from email verification, and only acts after the terms are accepted and onboarding is complete.
- **Lists** (`/users/:id/followers`, `/users/:id/following`): opened from the counters; each row opens the profile and has its own Follow button, except the viewer's own row.
- **Home** (signed in): «From people you follow» shows the latest reviews and «See all» opens the full feed (`/feed`, paginated); «People to follow» suggests people with similar taste, with their match and a Follow button. There is no new navigation entry.
- **Review authors**: in a wine's reviews and their comments, in the feed and in the Home tiles, the author's photo and name open their profile, and the @username appears below the name in smaller gray text (nothing shows when there is no username). A missing or broken photo shows the person icon.
- **Photos in administration**: the user list and the account dialog (`/admin/users`) show each user's photo, with the username initial when there is none or it fails to load; the review list (`/admin/reviews`) shows the author's photo with the person icon as fallback. Every photo path the API returns (reviews, comments, admin users and reviews, social lists, session and profiles) resolves against the API origin, and absolute URLs pass through unchanged.
- **Own profile** (`/profile`, Profile tab): a «Public profile» card edits the bio (up to 160 characters, with a counter) and who can see the cellar (Public, Followers only, Private); it saves with `PATCH /users/me`.

Contract: [community](../../modules/community/architecture.md) and [users](../../modules/users/architecture.md).

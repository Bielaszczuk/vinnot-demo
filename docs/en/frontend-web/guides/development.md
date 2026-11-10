# Web development

## Start

```bash
cd frontend-react
npm ci
cp .env.example .env.local
npm run dev
```

The module example documents its URL and public variables. Do not put secrets in
`VITE_*` variables: Vite embeds them in the bundle.

## Modes

```bash
npm run dev        # Real API
npm run dev:mock   # MSW/fixtures
```

Mock mode supports UI and controlled contracts; it does not replace backend or
PostgreSQL tests.

## Quality

```bash
npm run lint
npm run test
npm run test:coverage
npm run build
npm run test:e2e
```

Adding a flow requires a page/screen, hook, service, client/DTO, and tests in the
corresponding layers. If a backend contract changes, update its mapper and mocks
in the same change.

## Contracts and verification

The hero uses `src/shared/assets/home-hero.webp` (1446 × 1087, approximately
300 KB), derived from the original mobile artwork with `cwebp -q 80 -m 6`. Vite
generates the same hashed URL for the `index.html` preload and React component:
the download starts before the app mounts and is not duplicated. Authentication
screens share the resource. `BrandHeroImage` reveals the complete image after
loading; the background and content remain visible during download or on error.
Tests enforce a 350 KB budget, a matching
preload and a single download. This reduces cold-load cost, not network latency.

### Image and font formats

- UI images: WebP. Convert with `cwebp -q 80 -m 6 source.png -o target.webp`
  (add `-exact` for transparency and `-resize <width> 0` when it is shown
  smaller than the original).
- PNG only where the client does not guarantee WebP: emails (`images/email`,
  and `images/brand`, which emails also use), `share-assets` OG previews,
  favicons, and native icons and splash.
- Fonts: WOFF2 with `font-display: swap`. To convert a TTF:
  `python3 -m pip install fonttools brotli`, then
  `python3 -c "from fontTools.ttLib import TTFont; f=TTFont('X.ttf'); f.flavor='woff2'; f.save('X.woff2')"`.
- Every file in `public/` is published even when nothing uses it. Search the
  repository for its name before adding or deleting a file.

Measured with `npm run build` (#483):

| Resource | Before | After |
|---|---|---|
| Poppins, the 4 weights every page loads | 4 TTF, 624 KB | 4 WOFF2, 203 KB |
| Unused files in `public/images/illustrations` (4 SVG and 1 PNG) | 6.4 MB published | deleted |
| `dist/` total | 15.5 MB | 9.0 MB |

The shared-link page (`share-assets/landing.css`) uses the WOFF2 files too, so no TTF is left in `public/fonts`.
`mark.png` (25 KB) and `wordmark.png` (9 KB) stay PNG: emails use them, and
WebP saves less than 4 KB.

- [Testing and actual coverage scope](../testing/strategy.md)
- [Configuration, language and compatibility](../architecture/platform-and-localization.md)

### Authentication errors and local origins

Login, registration and account-action view models use `presentation/feedback/authErrorMessage.ts` to map application codes and HTTP statuses to curated ES/EN messages. Raw transport messages are not displayed; original errors retain diagnostic information. Account restrictions and email verification have specific guidance. Validation details are assigned only to known form fields with localized copy.

The Vite proxy preserves the browser origin. The backend requires an explicitly allowed origin and `X-Vinnot-Web-Session: 1` for `/auth/web/*`. A preview on another port can receive `403 Invalid CORS request` even with a healthy backend. Use `http://localhost:3000` (`npm run dev` or `npm run preview -- --port 3000 --strictPort`, not both at once) for real authentication, or explicitly configure the additional origin in the local backend. Do not add wildcards or disable the session policy.

An unavailable backend can cause a connection failure without an HTTP status; a proxy may instead return a server error (for example, 500 from Vite). A 403 means a request was rejected, not that the server is offline. Scenarios are covered by `tests/e2e/auth-errors.spec.ts`.

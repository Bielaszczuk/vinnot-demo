# Documentation site

The documentation site publishes `docs/es` and `docs/en` as a navigable book,
with a sidebar, search, Mermaid diagrams and the Vinnot visual style. It is
built with [Docusaurus](https://docusaurus.io/) from
[`docs-site/`](../../../docs-site/). The Markdown files in `docs/` remain the
only source: the site keeps no copy of its own.

## How it reads the documentation

| Language | Source | Site route |
|---|---|---|
| Spanish (default language) | `docs/es` | `/docs/...` |
| English | `docs/en` | `/en/docs/...` |

Docusaurus reads translations from
`docs-site/i18n/en/docusaurus-plugin-content-docs/current`.
[`scripts/sync-locales.mjs`](../../../docs-site/scripts/sync-locales.mjs) copies
`docs/en` into that folder before `start` and `build`. The copy is ignored by
Git and fully regenerated on every run.

`.md` files are parsed as CommonMark, as on GitHub. Only an `.mdx` file enables
MDX syntax (React components inside the text).

## Sidebar

The sidebar mirrors the folder tree of `docs/<language>`: moving a file moves it
in the book. [`src/sidebar/chapter-labels.mjs`](../../../docs-site/src/sidebar/chapter-labels.mjs)
applies three rules:

1. A folder with a `README.md` is named after that file's first heading.
2. A folder without a `README.md` uses the translation of its name
   (`architecture` → "Architecture"), defined in `folderLabels`.
3. The pages of a level come before its folders, and folders follow the reading
   order in `folderOrder`, from the general to the technical (manuals, modules,
   architecture, backend, web, mobile, infrastructure…). Unlisted folders go last,
   in alphabetical order.

## Links

[`src/remark/repo-links.mjs`](../../../docs-site/src/remark/repo-links.mjs)
rewrites links before Docusaurus resolves them:

| Link target in `docs/` | Result in the site |
|---|---|
| Another page in the same language | Internal site link |
| Repository file or folder outside `docs/` | File on GitHub, `development` branch |
| Page in the other language (`../es/...`) | The other language's route in the site |
| Missing file | Unchanged: the build fails |

The build fails on any broken link (`onBrokenLinks` and `onBrokenMarkdownLinks`
set to `throw`). The `DOCS_SOURCE_BRANCH` variable changes the branch of source
code links.

## Visual style

- Colors: the web `wine` palette
  (`frontend-react/src/shared/assets/styles/tailwind.css`), with light and dark
  modes, in [`src/css/custom.css`](../../../docs-site/src/css/custom.css).
- Typeface: Poppins, the same as the web.
- Logo and icon: `wordmark.png`, `mark.png` and `favicon.png` from
  `frontend-react/public`.
- Home page: [`src/pages/index.tsx`](../../../docs-site/src/pages/index.tsx), with
  one card per area.

Interface texts are written in Spanish. Their English translations live in
`docs-site/i18n/en/` (`code.json` and `docusaurus-theme-classic/`).
`docs-site/i18n/es/code.json` translates the search texts into Spanish, since
the plugin ships them in English only.

## Full-size diagrams

The site keeps every Mermaid block as it is, and below each one a link opens
the full-size version: an image with the Excalidraw hand-drawn look and the
`wine` palette, served from `images.vinnot.com`.

```text
[View the full “<diagram name>” diagram](https://images.vinnot.com/docs/diagrams/v1/en/<page>-<hash>.svg)
```

- The name comes from the heading above the diagram. Generic headings such as
  "Diagram" use the page title, and "Architecture", "Data" or "Use case diagram"
  are prefixed with it.
- `<page>` is the page path and `<hash>` the first 12 characters of the SHA-256
  of the Mermaid source. Changing a diagram changes its address, so a published
  image never changes and can be cached forever.
- When the tool changes how existing diagrams look, add an entry to
  `RENDER_CHANGES` in
  [`scripts/lib/docs-diagrams.mjs`](../../../scripts/lib/docs-diagrams.mjs) naming
  the diagrams it affects. Only those get a new address, so nobody sees an old
  cached image and the other images stay where they are.
- [`scripts/check-docs-diagrams.mjs`](../../../scripts/check-docs-diagrams.mjs)
  checks that every block has its link and that the link matches the current
  source. The CI `Repository checks` job and `node scripts/ci-preflight.mjs` run it.
- [`tools/docs-diagrams/`](../../../tools/docs-diagrams/) renders and uploads
  the images. It is an operator tool outside CI, with its own pinned
  dependencies, and needs Chrome for Testing (the one Playwright installs, or
  the `CHROMIUM_PATH` variable).

### After changing a diagram

Run from the repository root, with Node 22:

1. `node scripts/check-docs-diagrams.mjs --write` updates the links.
2. `node scripts/docs-diagram-catalog.mjs --write` rebuilds the [diagram catalog](../diagrams/README.md)
   from the Mermaid blocks; without `--write` it fails when the catalog is out of date.
3. `npm --prefix tools/docs-diagrams ci` installs the tool once.
4. `node tools/docs-diagrams/generate.mjs` renders the missing images into
   `tools/docs-diagrams/out/` (ignored by Git). `--only <text>` limits the run to
   keys containing that text, `--force` renders again, and `--sheets` writes
   contact sheets (`out/sheets/`) to review them six at a time.
5. `npx --prefix tools/docs-diagrams wrangler login`, once, with an account that
   can write the `vinnot-catalog-images` bucket.
6. `node tools/docs-diagrams/upload.mjs` uploads only the images that
   `images.vinnot.com` does not serve yet. `--dry-run` lists them without
   uploading.

Timelines (`gantt`) are drawn as a project-plan grid: activity, start and end columns, a month
and week header, one coloured band per section and diamonds for milestones.

Each image is rendered next to its editable scene (`.excalidraw`, kept only in
`out/`): it can be opened in <https://excalidraw.com> to adjust it by hand.

The [images Worker](../../../infra/cloudflare/catalog-images/worker.mjs) only
serves `docs/diagrams/v1/<es|en>/<page>-<hash>.svg` keys, as
`image/svg+xml` with a restrictive `Content-Security-Policy` (`sandbox`, no
scripts or external resources) and an immutable cache.

## Commands

All run with Node 22 from the repository root:

| Command | Result |
|---|---|
| `npm --prefix docs-site ci` | Installs the exact lockfile dependencies |
| `npm --prefix docs-site start` | Local Spanish server with hot reload |
| `npm --prefix docs-site run start:en` | Local English server |
| `npm --prefix docs-site run build` | Static site for both languages in `docs-site/build` |
| `npm --prefix docs-site run serve` | Serves the build for review, with language switching |
| `npm --prefix docs-site test` | Tests for the site's own modules, with a 100% coverage minimum |
| `npm --prefix docs-site run typecheck` | TypeScript check |

`start` serves a single language; to try the language switcher, run `build`
followed by `serve`.

## Publishing and access

The site is published at <https://vinnot-docs.pages.dev> and is private: only
the emails authorized in Cloudflare Access can open it.

### Cloudflare Pages

The `vinnot-docs` Cloudflare Pages project is connected through Git to
`Bielaszczuk/vinnot`. Cloudflare clones the repository and builds the site on
every push that changes `docs/` or `docs-site/`; GitHub Actions takes no part in
publishing.

| Setting | Value |
|---|---|
| Production branch | `main` |
| Root directory | `docs-site` |
| Build command | `npm run build` (Cloudflare installs from the lockfile first) |
| Output directory | `build` |
| Variables | `NODE_VERSION=22`, `DOCS_SITE_URL=https://vinnot-docs.pages.dev` |
| Build watch paths | `docs/*`, `docs-site/*`; a push that does not touch those paths does not build |

- The `vinnot-dev-web` Cloudflare Pages project, which published the
  development web before it moved to S3 and CloudFront, has automatic
  deployments disabled since 2026-11-06 and builds on no push.
- A push to `main` publishes the production version. Since `main` only changes
  with releases, the site shows the documentation of the latest release, not
  that of `development`.
- A push to any other branch creates a preview at
  `<branch>.vinnot-docs.pages.dev` and at `<deployment-id>.vinnot-docs.pages.dev`.
- Each build reports the `Cloudflare Pages: vinnot-docs` check on GitHub.
- A failed build does not replace the published version. If it fails while
  cloning the repository (a network error, not a code error), retry it with
  "Retry deployment" in the deployment details.

### Cloudflare Access

Cloudflare Zero Trust (Free plan) protects production and previews with the
`vinnot-docs - Cloudflare Pages` Access application, which covers
`vinnot-docs.pages.dev` and `*.vinnot-docs.pages.dev`. Its
`Allow Members - Cloudflare Pages` policy holds the list of authorized emails.

To sign in, open the site, enter an authorized email and type the code Access
sends to that email.

To grant or remove access: Zero Trust → Access controls → Applications →
`vinnot-docs - Cloudflare Pages` → Policies → `Allow Members - Cloudflare Pages`,
then add or remove the email in the Include rule. To end a session that is
already open, revoke it from Zero Trust → Team & Resources → Users.

## CI and dependency security

The CI `Documentation site` job installs with `npm ci` and runs tests and
typecheck. It runs when `docs/`, `docs-site/`, the backport script, or the CI,
security, and production release workflows change. It does not build the site:
Cloudflare Pages builds both languages on every push, failing on broken links,
and reports it as the `Cloudflare Pages: vinnot-docs` check, and CI never
publishes. The npm gate audits `docs-site/package-lock.json` like the web and
mobile locks; `node scripts/ci-preflight.mjs` repeats the same steps locally,
plus the build. See
[CI/CD](../infra/guides/ci-cd.md).

`docs-site/package.json` pins, in `overrides`, the fixed versions of
`serialize-javascript` and `tinypool`. braces 3.0.3 has no published fixed
release: the `postinstall` applies the reviewed backport mobile already uses, with
its own manifest in `docs-site/scripts/security-backports/`. Details in
[Dependency security](../infra/guides/dependency-security.md).

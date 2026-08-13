# Agent rules — Fortune Forged Wheels

## Merchant text boxes win

Torrin edits copy in the Shopify theme editor. Agents must **not** overwrite those text boxes.

### Required workflow

1. Before editing theme settings or page templates:
   ```bash
   npm run theme:sync-copy
   ```
2. Change layout/code (Liquid, CSS, JS) as needed.
3. Push code without stomping editor copy:
   ```bash
   npm run theme:push:code
   ```
4. Only push `settings_data.json` / `templates/*.json` after a fresh sync, and only when structure must change — **keep synced `settings` values**.

### Do not

- Rewrite headlines, mission lines, point titles, CTAs, or body copy “while you’re here”
- Ship JS that replaces theme-editor strings on the storefront
- Full `theme push` of the whole tree when only code changed
- Reintroduce hardcoded hero CDN MP4/image fallbacks (Theme Editor media only)
- Treat bare `/` as a reliable homepage URL on this shop

### Homepage / Theme Editor media (permanent)

- Shopify IndexController can pin **frozen HTML for bare `/`** even after theme publish/delete.
- **Live homepage URL is `/?page=1`** — it renders Theme Editor `templates/index.json` (images + videos) with Liquid `now` cache opt-out.
- Keep `meta name="ff-home-rendered-at"` + hero `now` fingerprint. Never remove them.
- Logo/home links use `{% render 'ff-home-url' %}` → `/?page=1`.
- Before any `templates/index*.json` push: `shopify theme pull` live `templates/index.json` first so editor uploads are not wiped.

### Target theme

- Store: `bb6223-6f.myshopify.com`
- Live theme: Fortune-Live-EditorAlways-20260801 `188656091411`
- Branch for live tracking: `main` (when Torrin asks for live pushes)

## Cursor Cloud specific instructions

This repo is a **Shopify theme** (Halo 3.x) for the Fortune Forged storefront — there is no separate backend/build step. The "application" is the storefront theme in `theme/`, rendered by Shopify's servers. Standard commands live in `package.json` scripts and `README.md`; prefer those over reinventing commands.

### Auth is required for anything that touches Shopify

- Every `shopify theme …` command (`theme:dev`, `theme:pull`, `theme:push`, `theme:list`, `theme:sync-copy`) needs `SHOPIFY_CLI_THEME_TOKEN` (a Theme Access password, `shptka_…`, or an admin token `shpat_…`). Without it the CLI errors with "Authorization is required … environment does not support interactive prompts" — interactive OAuth login does not work in the cloud VM.
- `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` may be present as secrets, but they are **app OAuth credentials and are NOT used by `theme` commands**. Do not expect them to unblock theme auth.
- Add `SHOPIFY_CLI_THEME_TOKEN` as a Cursor secret to run the dev server or pull/push. There is no local-only render path for Liquid themes.

### Runs without auth (safe offline)

- `npm run setup:check` — readiness check (reports the token as missing when it is).
- `npm run theme:check` — Liquid/theme linter. It works fully offline but is **very slow and extremely verbose on this theme** (millions of lines, mostly translation warnings from `locale/*.json`). To iterate quickly, run `node_modules/.bin/shopify theme check --path theme --category liquid` or target specific files instead of linting the whole tree.

### Running the storefront (needs the token)

- `npm run theme:dev` runs `shopify theme dev` and serves a hot-reloading preview at `http://127.0.0.1:9292` that proxies to the store. Requires `SHOPIFY_CLI_THEME_TOKEN`.

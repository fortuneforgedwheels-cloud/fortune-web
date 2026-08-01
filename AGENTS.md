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

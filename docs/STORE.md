# Fortune Forged Wheels — store snapshot

Captured from the live storefront for development context.

| Field | Value |
| --- | --- |
| Brand | Fortune Forged / Fortune Forged Wheels |
| Public site | https://www.fortuneforgedwheels.com |
| Shopify domain | `bb6223-6f.myshopify.com` |
| Shop ID | `89335070995` |
| Currency / market | USD / US |
| Live theme name | `Fortune-Live-SingleHome-202607300739` |
| Theme family | Halo `3.0.0` (Halothemes) |
| Live theme ID | `188606447891` |
| Previous live | `Fortune-Live-Videos-1785393369` (`188604973331`) |
| Draft theme | `Fortune-Draft-1785393977` (`188605104403`) |
| Draft editor | https://bb6223-6f.myshopify.com/admin/themes/188605104403/editor |
| Appearance notes | Dark-mode-first Halo skin; product lines: Monoblock, 2-Piece, Beadlock |

## Homepage template rules (important)

1. **Single source of truth:** `theme/templates/index.json` — all homepage text and section settings edited in the theme editor save here.
2. **No duplicate homepage views:** Do not recreate `index.homepage.json`, `index.vehicle.json`, `index.wheels.json`, etc. Those caused editor changes to not match the live site.
3. **No `?view=` redirects** in `ff-offer-boot.js` or `theme.liquid` for the homepage.
4. **Shopify full-page cache:** The default `/` URL can lag behind `index.json` for hours. `templates/index.live.json` is auto-synced from `index.json` on every `npm run theme:push`. `ff-offer-boot.js` upgrades stale homepages from `?view=live` when needed.
5. After editing homepage copy in the theme editor, run `npm run theme:push` so `index.live.json` stays in sync.

## Known routes

- `/` — home
- `/collections` — collections index
- `/products` — product catalog
- `/pages/about` — about
- `/pages/contact` — contact / quote request
- `/blogs/news` — blog

## Product focus (from live marketing)

Premium aftermarket forged beadlock, monoblock, and custom 2-piece wheels. Built-to-order; quote flow asks for year/make/model, sizes (front/rear), and finish.

## Important safety rules for agents

1. Never push directly to the live theme unless the owner explicitly requests a production deploy.
2. Agent pushes use `npm run theme:push` (live `188606447891`) or `npm run theme:push:draft` (draft `188605104403`).
3. Run `npm run theme:sync-copy` before editing anything that could overwrite merchant theme-editor text.
4. Never commit `.env` or Theme Access passwords.
5. Preserve existing Shopify apps/embeds unless asked to change them.

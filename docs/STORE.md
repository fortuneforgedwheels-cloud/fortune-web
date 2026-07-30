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

1. **Single source of truth:** `theme/templates/index.json` — homepage text and section settings from the theme editor (Default template).
2. **Live storefront mirror:** `theme/templates/index.live.json` — uncached copy visitors see when Shopify’s default `/` cache is stale. Auto-synced from `index.json` on pull/push.
3. **After editing homepage copy:** Either:
   - Select the **“live”** homepage template in the theme editor (top bar) and click **Save** — updates go live immediately, or
   - Edit the **Default** template, click **Save**, then run `npm run theme:mirror-homepage` to copy your changes to the live mirror.
4. **No duplicate homepage views** (`index.vehicle.json`, `index.homepage.json`, etc.) and no `?view=` redirects.
5. **Safe code deploys:** `npm run theme:push` pulls your latest editor changes first, then pushes code only — it never overwrites `settings_data.json` or template JSON.

## Fonts

- **Theme-wide (Halo):** Jost + Barlow Semi Condensed via Theme settings → Typography.
- **FF sections (headings):** Oswald + Source Sans 3 loaded globally in `snippets/ff-fonts.liquid`.

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

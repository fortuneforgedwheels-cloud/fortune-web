# Fortune Forged Wheels — store snapshot

Captured from the live storefront for development context.

| Field | Value |
| --- | --- |
| Brand | Fortune Forged / Fortune Forged Wheels |
| Public site | https://www.fortuneforgedwheels.com |
| Shopify domain | `bb6223-6f.myshopify.com` |
| Shop ID | `89335070995` |
| Currency / market | USD / US |
| Live theme name | `Fortune-Cursor-Rebuild` |
| Theme family | Halo `3.0.0` (Halothemes) |
| Live theme ID | `188578300179` |
| Previous live (now unpublished) | `halo-setonsocial` (`178099421459`) |
| Draft rebuild theme | _(published — now live)_ |
| Draft theme ID | `188578300179` (live) |
| Draft preview | https://bb6223-6f.myshopify.com?preview_theme_id=188578300179 |
| Draft editor | https://bb6223-6f.myshopify.com/admin/themes/188578300179/editor |
| Appearance notes | Dark-mode-first Halo skin; product lines: Monoblock, 2-Piece, Beadlock |

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

1. Never push directly to the live/main theme (`178099421459`) unless the owner explicitly requests a production deploy.
2. All agent pushes go to draft `Fortune-Cursor-Rebuild` (`188578300179`) via `npm run theme:push`.
3. Never commit `.env` or Theme Access passwords.
4. Preserve existing Shopify apps/embeds (product options, pixels, etc.) unless asked to change them.
5. Do not overwrite unrelated drafts (e.g. `Halo-SetOnSocial-FinalVersion-Backup`) unless the owner asks.

## Beadlock pricing bulk update

Non–15-inch beadlock variants should be **$1,999** (15-inch sizes keep their current prices).

- Dry run: `npm run shop:update-beadlock-prices`
- Apply via Admin API: `npm run shop:update-beadlock-prices -- --apply`
- CSV import fallback: `data/beadlock-price-update.csv` → Shopify Admin → Products → Import

Theme Access (`shptka_`) cannot change product prices — Admin API or CSV import is required.

### Admin API token (Option A)

1. Shopify Admin → **Settings** → **Apps and sales channels** → **Develop apps** → **Create an app**
2. Configure Admin API scopes: `read_products`, `write_products`
3. Install the app and copy the **Admin API access token** (`shpat_...`)
4. Add to **Cursor Cloud secrets** (dashboard → Cloud Agents → Secrets) as:
   - Name: `SHOPIFY_ADMIN_ACCESS_TOKEN`
   - Value: your `shpat_...` token
5. Re-run the agent or reply **done** — it will apply 115 variant updates and skip all 15-inch sizes

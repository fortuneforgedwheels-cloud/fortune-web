# Fortune Forged Wheels — Shopify theme

Development repo for **[fortuneforgedwheels.com](https://www.fortuneforgedwheels.com)** (`bb6223-6f.myshopify.com`).

Live theme today: **Halo 3.0.0** (`halo-setonsocial`, theme ID `178099421459`).

Theme source lives in [`theme/`](./theme). Edits push to an **unpublished draft** only.

### Your private preview (not live)

| | |
| --- | --- |
| Draft theme | `Fortune-Cursor-Rebuild` |
| Theme ID | `188539207955` |
| Preview | https://bb6223-6f.myshopify.com?preview_theme_id=188539207955 |
| Theme editor | https://bb6223-6f.myshopify.com/admin/themes/188539207955/editor |

Open that preview link (or Online Store → Themes → `Fortune-Cursor-Rebuild` → Preview). You should see a gold **DRAFT PREVIEW** bar at the top. The public live site is unchanged.

> Note: `Halo-SetOnSocial-FinalVersion-Backup` is a different draft. Our Cursor work goes to **Fortune-Cursor-Rebuild** only.

---

## Status

| Step | State |
| --- | --- |
| GitHub repo + Shopify CLI tooling | Ready |
| Store identity documented | Ready |
| Theme Access password connected | Ready (local `.env`) |
| Live Halo theme pulled into `theme/` | Ready (~716 files) |
| Unpublished draft for private previews | Ready (`Fortune-Cursor-Rebuild`) |

Give change requests in chat (homepage, collections, quote flow, branding, etc.). All pushes target the draft; nothing goes live unless you explicitly approve a publish.

---

## Auth refresh (if the token expires)

```bash
# Edit .env — keep SHOPIFY_CLI_THEME_TOKEN current
npm run setup:check
npm run theme:pull
```

Also store `SHOPIFY_CLI_THEME_TOKEN` as a Cursor secret for future cloud agent runs.

---

## Day-to-day commands

| Command | Purpose |
| --- | --- |
| `npm run setup:check` | Verify CLI + token + theme files |
| `npm run theme:list` | List themes on the store |
| `npm run theme:pull` | Download **draft** `Fortune-Cursor-Rebuild` |
| `npm run theme:pull:live` | Download live theme (reference only) |
| `npm run theme:push` | Upload local files to the **draft** theme |
| `npm run theme:open` | Open the draft preview in a browser |
| `npm run theme:check` | Theme lint / Liquid checks |

Production publishes are intentional only — never force-push to the live theme unless you explicitly ask for a go-live.

---

## How we’ll make changes

1. You give a command (e.g. “rebuild the homepage hero”, “simplify navigation”, “new collection layout”).
2. The agent edits Liquid/CSS/JS/JSON under `theme/`.
3. Changes are committed on a feature branch and opened as a PR.
4. We preview via an unpublished/development theme on Shopify before anything goes live.

See [`docs/STORE.md`](./docs/STORE.md) for store metadata and agent safety rules.

---

## Project layout

```text
fortune-web/
├── theme/                 # Shopify theme source (after pull)
├── scripts/               # setup helpers
├── docs/STORE.md          # store facts + safety rules
├── shopify.theme.toml     # CLI environments
├── .env.example           # required secrets template
└── package.json           # Shopify CLI + npm scripts
```

# Fortune Forged Wheels — Shopify theme

Development repo for **[fortuneforgedwheels.com](https://www.fortuneforgedwheels.com)** (`bb6223-6f.myshopify.com`).

Live theme today: **Halo 3.0.0** (`halo-setonsocial`, theme ID `178099421459`).

Theme source lives in [`theme/`](./theme) — live Halo snapshot pulled and ready for edits.

---

## Status

| Step | State |
| --- | --- |
| GitHub repo + Shopify CLI tooling | Ready |
| Store identity documented | Ready |
| Theme Access password connected | Ready (local `.env`) |
| Live Halo theme pulled into `theme/` | Ready (~716 files) |

Give change requests in chat (homepage, collections, quote flow, branding, etc.). Previews use draft/dev themes; nothing goes live unless you explicitly approve a publish.

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
| `npm run theme:pull` | Download live theme ID `178099421459` |
| `npm run theme:dev` | Local preview with hot reload (development theme) |
| `npm run theme:push:draft` | Upload as a new **unpublished** theme (safe preview) |
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

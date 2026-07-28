# Fortune Forged Wheels — Shopify theme

Development repo for **[fortuneforgedwheels.com](https://www.fortuneforgedwheels.com)** (`bb6223-6f.myshopify.com`).

Live theme today: **Halo 3.0.0** (`halo-setonsocial`, theme ID `178099421459`).

Theme source lives in [`theme/`](./theme). Until Shopify access is connected, that folder is empty on purpose.

---

## Status

| Step | State |
| --- | --- |
| GitHub repo + Shopify CLI tooling | Ready |
| Store identity documented | Ready |
| Theme Access password connected | **Waiting on you** |
| Live Halo theme pulled into `theme/` | Blocked until password is added |

Once the Theme Access password is in place, reply in this Cursor agent chat with:

> Token added — pull the live theme

(Do **not** paste the password into chat. Put it in `.env` or Cursor secrets only.)

---

## One-time setup (store owner)

### 1. Install Theme Access

1. Open Shopify Admin for Fortune Forged.
2. Install **[Theme Access](https://apps.shopify.com/theme-access)**.
3. In the app, click **Create theme password**.
4. Use your own email (`torrinwitt@icloud.com` or another you control).
5. Open the emailed link and copy the password (usually starts with `shptka_`).

### 2. Add the password locally (or as a Cursor secret)

```bash
cp .env.example .env
# Edit .env and set:
# SHOPIFY_CLI_THEME_TOKEN=shptka_your_password_here
```

For Cursor Cloud agents, also add a secret named `SHOPIFY_CLI_THEME_TOKEN` with the same value so future runs can pull/push without re-entering it.

### 3. Install deps and verify

```bash
npm install
npm run setup:check
```

### 4. Pull the live theme

```bash
npm run theme:pull
```

This downloads the published Halo theme into `theme/`. Commit that snapshot so rebuild work can begin.

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

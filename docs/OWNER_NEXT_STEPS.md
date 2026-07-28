# Owner next steps — connect Shopify so we can edit

You are the Shopify admin. This takes about 5 minutes.

## A. Create a Theme Access password

1. Go to your Shopify Admin.
2. Open Apps → search **Theme Access**, or install from:
   https://apps.shopify.com/theme-access
3. Click **Create theme password**.
4. Enter an email you can open right now.
5. Open the email, view the password once, and copy it.
   - It typically looks like: `shptka_xxxxxxxx`

## B. Put the password where the agent can use it

### Option 1 — local `.env` (good for desktop / this machine)

```bash
cp .env.example .env
```

Set:

```env
SHOPIFY_FLAG_STORE=bb6223-6f.myshopify.com
SHOPIFY_CLI_THEME_TOKEN=shptka_paste_here
SHOPIFY_FLAG_THEME=178099421459
```

### Option 2 — Cursor Cloud secret (recommended for this agent)

In Cursor Cloud environment / secrets for this project, add:

- Name: `SHOPIFY_CLI_THEME_TOKEN`
- Value: the Theme Access password

Optional matching secrets:

- `SHOPIFY_FLAG_STORE` = `bb6223-6f.myshopify.com`
- `SHOPIFY_FLAG_THEME` = `178099421459`

**Do not paste the password into the chat.**

## C. Tell the agent to continue

Reply with something like:

> Theme Access token is saved. Pull the live Halo theme and commit it.

The agent will then:

1. Run `npm run theme:pull`
2. Commit the theme source into `theme/`
3. Confirm we are ready for your first design/content change command

## Safety

- We will **not** overwrite the live site until you explicitly approve a publish.
- Previews will use development / unpublished themes first.

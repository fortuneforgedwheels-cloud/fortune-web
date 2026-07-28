# Owner next steps

Theme Access is connected and the live Halo theme is in `theme/`.

## You’re ready to request changes

Examples:

- Rebuild the homepage hero
- Simplify navigation
- Improve the quote / contact form
- Clean up collection pages for Monoblock / 2-Piece / Beadlock
- Stronger Fortune Forged branding across templates

## Safety reminders

- Do not paste Theme Access passwords into chat.
- Keep `.env` local / in Cursor secrets only (gitignored).
- Production publishes happen only when you explicitly approve them.
- Prefer draft/unpublished theme previews first.

## If auth breaks later

1. Create a new password in Shopify Admin → Theme Access.
2. Update `SHOPIFY_CLI_THEME_TOKEN` in [`.env`](../.env).
3. Run `npm run setup:check`.

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

### Target theme

- Store: `bb6223-6f.myshopify.com`
- Theme: Fortune-Cursor-Rebuild `188539207955`
- Branch for live tracking: `main` (when Torrin asks for live pushes)

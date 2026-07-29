# Merchant copy (theme editor text)

Your text boxes in the Shopify theme editor are the source of truth.

## What agents must do

1. **Pull your copy first:** `npm run theme:sync-copy`
2. Change layout/code without rewriting your headlines/body/CTAs
3. **Deploy code only:** `npm run theme:push:code`  
   (does not push `settings_data.json` or page templates)

## What you do

Edit text in: Shopify Admin → Themes → Fortune-Cursor-Rebuild → Customize.

Those edits stay. Agents are instructed not to overwrite them.

If an agent needs a structural template change, they sync your copy first and keep your settings values.

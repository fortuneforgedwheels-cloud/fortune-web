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
- Push without `--nodelete` (all npm push scripts force it — never bypass)
- Remove a file from `scripts/protected-theme-files.txt` unless Torrin explicitly asks to retire that feature

### Live push safety (mandatory)

- Every `theme:push` / `theme:push:code` / `theme:push:draft` path runs `scripts/assert-protected-theme-files.sh` then Shopify CLI with **`--nodelete`**.
- Remote-only live files stay on the theme until an agent intentionally deletes them (and removes them from the protected list first).
- Before deploying, run: `npm run theme:assert-protected`
- When shipping a new critical feature, **add its paths** to `scripts/protected-theme-files.txt`.

### Restore point

- Tag: `live-restore-2026-09-20`
- Fingerprint: `RESTORE_POINT.txt`
- Live theme snapshot frozen in git on this tag.
- If Torrin says **“revert to the last save”** or **“revert to live-restore-2026-09-20”**: check out that tag’s `theme/` tree and push with `npm run theme:push:code` (still `--nodelete` + assert). Do not invent a newer baseline unless asked to save again.

### Target theme

- Store: `bb6223-6f.myshopify.com`
- Live theme: Fortune-Live-EditorAlways-20260801 `188656091411`
- Branch for live tracking: `main` (when Torrin asks for live pushes)

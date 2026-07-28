# Conversion path notes

## Problem
Customers hit fluff (empty slideshows, multiple Instagram feeds, BTS video, free-text quote buried at the bottom) before they can start a custom wheel order. Vehicle fitment paths exist but are hard to find and often dead-end without a clear order CTA.

## Draft MVP (Fortune-Cursor-Rebuild)
Homepage now leads with **FF Simple Build**:
1. Vehicle (G80 M3 / G82 M4 / F80 M3 / other)
2. Style (Monoblock / 2-Piece / Beadlock) with collection links
3. Structured quote (Y/M/M, front/rear size, finish, design, contact)

Disabled on homepage (draft only): empty hero slideshows, BTS video, 3× Instafeed blocks, empty custom liquid, old free-text contact form.

## Proof page
Theme Access cannot create Shopify Admin pages. Proof uses an alternate index template:

https://bb6223-6f.myshopify.com/?view=g80-m3&preview_theme_id=188539207955

Optional later: create Admin page handle `g80-m3` and assign template `g80-m3` (`templates/page.g80-m3.json`).

## Next conversion passes (when owner asks)
- Wire shop-by-vehicle / G8X spec pages with “Build this fitment” → quote prefilled
- Unify 2-piece collection handles (`two-piece-wheels` vs `ff-two-piece-wheels`)
- PDP: make quote vs ATC roles clearer for custom builds
- Remove draft banner before publish

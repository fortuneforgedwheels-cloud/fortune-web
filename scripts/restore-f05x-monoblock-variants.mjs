/**
 * One-shot restore for F-05X monoblock checkout options.
 *
 * Problem: product f-05x (10485824749843) had only Default Title and no
 * BCPO metafield, so the PDP showed just "Please Input Your YEAR MAKE & MODEL"
 * instead of Diameter + COLOR/WIDTH/OFFSET/LUG like other monoblocks.
 *
 * Fix applied via Admin API (2026-08-24):
 * 1) Diameter variants matching F-05S pricing:
 *    17" $579, 18" $750, 19" $799, 20" $799, 21" $829, 22" $829
 * 2) Copied bcpo.bcpo_data metafield from F-05S (COLOR, WIDTH, OFFSET,
 *    LUG PATTERN, LEAD TIME PREFERENCE, year/make/model)
 *
 * Re-run only if those options are wiped again. Requires SHOPIFY_CLIENT_ID /
 * SHOPIFY_CLIENT_SECRET with write_products.
 */
console.log('See file header for F-05X restore notes. This script is documentation-only.');

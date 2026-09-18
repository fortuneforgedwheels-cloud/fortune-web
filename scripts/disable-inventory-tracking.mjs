#!/usr/bin/env node
/**
 * Site-wide: disable inventory tracking + always CONTINUE selling.
 *
 * Usage: node scripts/disable-inventory-tracking.mjs
 *
 * Requires SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET and SHOPIFY_FLAG_STORE.
 */
const STORE = process.env.SHOPIFY_FLAG_STORE || 'bb6223-6f.myshopify.com';
const API = `https://${STORE}/admin/api/2024-10`;

async function getToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.SHOPIFY_CLIENT_ID,
    client_secret: process.env.SHOPIFY_CLIENT_SECRET,
  });
  const res = await fetch(`https://${STORE}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(JSON.stringify(json));
  return json.access_token;
}

async function gql(token, query, variables) {
  const res = await fetch(`${API}/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function main() {
  const token = await getToken();
  const products = [];
  let cursor = null;
  for (;;) {
    const q = `query($cursor:String){ products(first:50, after:$cursor){ pageInfo{hasNextPage endCursor}
      edges{ node{ id handle variants(first:100){ edges{ node{ id } } } } } } }`;
    const d = await gql(token, q, { cursor });
    products.push(...(d.data?.products?.edges || []).map((e) => e.node));
    if (!d.data.products.pageInfo.hasNextPage) break;
    cursor = d.data.products.pageInfo.endCursor;
  }

  const mut = `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      userErrors { message }
    }
  }`;

  let ok = 0;
  for (const p of products) {
    const variants = p.variants.edges.map((e) => e.node);
    for (let i = 0; i < variants.length; i += 40) {
      const chunk = variants.slice(i, i + 40).map((v) => ({
        id: v.id,
        inventoryPolicy: 'CONTINUE',
        inventoryItem: { tracked: false },
      }));
      const res = await gql(token, mut, { productId: p.id, variants: chunk });
      const errs = res.errors || res.data?.productVariantsBulkUpdate?.userErrors || [];
      if (errs.length) console.error(p.handle, errs);
      else ok += chunk.length;
    }
    console.log(p.handle, variants.length);
  }
  console.log('updated variants', ok);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

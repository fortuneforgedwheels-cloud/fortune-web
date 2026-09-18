#!/usr/bin/env node
/**
 * Attach the standard monoblock BCPO option set (COLOR, WIDTH, OFFSET,
 * LUG PATTERN, LEAD TIME, year/make/model) to one or more products.
 *
 * Usage:
 *   node scripts/attach-monoblock-bcpo.mjs f11-r f12-r
 *
 * Requires SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (or SHOPIFY_ADMIN_TOKEN)
 * and SHOPIFY_FLAG_STORE. Metafield type must be `json` (not json_string) or
 * BCPO renders invalid `=>` JS and selection boxes never appear.
 */
import { createHash, randomBytes } from 'node:crypto';

const STORE = process.env.SHOPIFY_FLAG_STORE || 'bb6223-6f.myshopify.com';
const API = `https://${STORE}/admin/api/2024-10`;
const DONOR_HANDLE = process.env.BCPO_DONOR_HANDLE || 'f-05x';

const FULL_FINISHES = [
  'Brushed Silver', 'Brushed Bronze', 'Brushed Gold', 'Brushed Champagne',
  'Brushed Copper', 'Brushed Black', 'Brushed Gunmetal',
  'Polished', 'Polished Gold', 'Polished Black', 'Chrome', 'Triple Chrome',
  'Black Chrome', '24K Gold Chrome',
  'Gloss Black', 'Gloss White', 'Gloss Silver', 'Gloss Gunmetal', 'Gloss Anthracite',
  'Gloss Bronze', 'Gloss Gold', 'Gloss Champagne', 'Gloss Titanium', 'Gloss Graphite',
  'Gloss Charcoal', 'Gloss Red', 'Gloss Blue', 'Gloss Green', 'Gloss Purple', 'Gloss Orange',
  'Satin Black', 'Satin White', 'Satin Silver', 'Satin Gunmetal', 'Satin Titanium',
  'Satin Graphite', 'Satin Bronze', 'Satin Gold', 'Satin Champagne', 'Satin Copper',
  'Satin Olive', 'Satin Red', 'Satin Blue',
  'Hyper Silver', 'Matte black', 'Matte bronze', 'Motorsport gold', 'OEM CS Gold',
  'Light brushed gold', 'Brushed Rose gold', 'Gloss Gray',
];

const SURCHARGE = {
  polished: '50',
  chrome: '175',
  'triple chrome': '175',
  'black chrome': '175',
  '24k gold chrome': '175',
};

function uniq() {
  return '_' + randomBytes(5).toString('hex').slice(0, 9);
}

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
  if (!json.access_token) throw new Error('token failed: ' + JSON.stringify(json));
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

function finishValues() {
  return FULL_FINISHES.map((key) => ({
    key,
    price: SURCHARGE[key.toLowerCase()] || '0',
  }));
}

async function main() {
  const handles = process.argv.slice(2).filter(Boolean);
  if (!handles.length) {
    console.error('Usage: node scripts/attach-monoblock-bcpo.mjs <handle> [handle...]');
    process.exit(1);
  }
  const token = await getToken();

  const donorRes = await gql(
    token,
    `query($q:String!){ products(first:1, query:$q){ edges{ node{
      handle metafield(namespace:"bcpo", key:"bcpo_data"){ type value }
    }}}}`,
    { q: `handle:${DONOR_HANDLE}` }
  );
  const donorNode = donorRes.data?.products?.edges?.[0]?.node;
  if (!donorNode?.metafield?.value) {
    throw new Error(`Donor ${DONOR_HANDLE} missing bcpo.bcpo_data`);
  }
  const donor = JSON.parse(donorNode.metafield.value);

  for (const handle of handles) {
    const prodRes = await gql(
      token,
      `query($q:String!){ products(first:1, query:$q){ edges{ node{ id handle }}}}`,
      { q: `handle:${handle}` }
    );
    const node = prodRes.data?.products?.edges?.[0]?.node;
    if (!node) {
      console.error('missing product', handle);
      continue;
    }

    await gql(token, `mutation($metafields:[MetafieldIdentifierInput!]!){
      metafieldsDelete(metafields:$metafields){ userErrors{ message } }
    }`, {
      metafields: [{ ownerId: node.id, namespace: 'bcpo', key: 'bcpo_data' }],
    });

    const payload = structuredClone(donor);
    payload.product_id = node.id.split('/').pop();
    for (const so of payload.shopify_options || []) so.unique = uniq();
    for (const vo of payload.virtual_options || []) {
      vo.unique = uniq();
      if (String(vo.title || '').toUpperCase() === 'COLOR') {
        vo.values = finishValues();
        vo.required = 'on';
      }
    }

    const setRes = await gql(token, `mutation($metafields:[MetafieldsSetInput!]!){
      metafieldsSet(metafields:$metafields){
        metafields{ id type }
        userErrors{ message }
      }
    }`, {
      metafields: [{
        ownerId: node.id,
        namespace: 'bcpo',
        key: 'bcpo_data',
        type: 'json', // must be json — json_string breaks BCPO storefront JS
        value: JSON.stringify(payload),
      }],
    });
    const errs = setRes.data?.metafieldsSet?.userErrors || setRes.errors || [];
    if (errs.length) console.error(handle, errs);
    else {
      console.log(
        handle,
        'OK type=json vos=',
        payload.virtual_options.map((v) => `${v.title}:${(v.values || []).length}`).join(',')
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

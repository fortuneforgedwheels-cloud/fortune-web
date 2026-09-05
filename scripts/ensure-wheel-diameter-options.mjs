/**
 * Ensure non–Fortune-Certified wheel products expose a Diameter option.
 *
 * Context: Beadlocks/monoblocks that only have "Default Title" hide size
 * selection on the PDP. Working products use either:
 *   - Diameter: 17", 18", ... (monoblocks)
 *   - SIZE: 17X10, 18x11, ... (many beadlocks)
 *
 * This script converts Default Title → Diameter for known handles.
 * Run: node scripts/ensure-wheel-diameter-options.mjs
 */
import process from 'node:process';

const store = process.env.SHOPIFY_FLAG_STORE;
const clientId = process.env.SHOPIFY_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

const TARGETS = [
  {
    handle: 'ff-06-beadlock-pair',
    diameters: ['15"', '17"', '18"'],
    price: '1999.00',
  },
  {
    handle: 'ff-06',
    diameters: ['17"', '18"', '19"', '20"', '21"', '22"'],
    price: '789.00',
  },
];

async function getToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(`https://${store}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(JSON.stringify(json));
  return json.access_token;
}

async function rest(token, method, path, body) {
  const res = await fetch(`https://${store}/admin/api/2024-10${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

function hasDiameterOrSize(product) {
  return (product.options || []).some((opt) => /^(diameter|size)$/i.test(opt.name));
}

async function ensureDiameter(token, target) {
  const found = await rest(token, 'GET', `/products.json?handle=${encodeURIComponent(target.handle)}`);
  const product = found.products?.[0];
  if (!product) {
    console.warn(`skip missing handle: ${target.handle}`);
    return;
  }
  if (hasDiameterOrSize(product)) {
    console.log(`ok ${target.handle}: already has ${product.options.map((o) => o.name).join(', ')}`);
    return;
  }

  const firstVariantId = product.variants[0].id;
  await rest(token, 'PUT', `/variants/${firstVariantId}.json`, {
    variant: { id: firstVariantId, option1: target.diameters[0], price: String(target.price) },
  });
  await rest(token, 'PUT', `/products/${product.id}.json`, {
    product: { id: product.id, options: [{ name: 'Diameter', values: target.diameters }] },
  });
  for (const diameter of target.diameters.slice(1)) {
    await rest(token, 'POST', `/products/${product.id}/variants.json`, {
      variant: { option1: diameter, price: String(target.price), inventory_management: null },
    });
  }
  console.log(`fixed ${target.handle}: Diameter ${target.diameters.join(', ')}`);
}

const token = await getToken();
for (const target of TARGETS) {
  await ensureDiameter(token, target);
}

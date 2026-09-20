#!/usr/bin/env node
/**
 * Update Monoblock + Two-Piece variant prices to FULL SET shipped tiers.
 * Preserves absolute finish upcharges on products that bake finish into variants.
 * Does NOT touch beadlocks, ambiguous, or specialty products.
 *
 * Usage:
 *   node scripts/update-fullset-pricing.mjs --dry-run
 *   node scripts/update-fullset-pricing.mjs --apply
 */
import fs from "node:fs";

const STORE = process.env.SHOPIFY_FLAG_STORE || "bb6223-6f.myshopify.com";
const API = `https://${STORE}/admin/api/2024-10/graphql.json`;
const APPLY = process.argv.includes("--apply");
const TOKEN =
  process.env.SHOPIFY_ADMIN_TOKEN ||
  (fs.existsSync("/tmp/shopify_admin_token.txt")
    ? fs.readFileSync("/tmp/shopify_admin_token.txt", "utf8").trim()
    : "");

if (!TOKEN) {
  console.error("Missing SHOPIFY_ADMIN_TOKEN /tmp/shopify_admin_token.txt");
  process.exit(1);
}

const MONO = [
  "ff-rs",
  "ff-5",
  "ff-s10",
  "forged-g8x-oem-style",
  "ff-s10r",
  "f-s3r",
  "fx-02",
  "f-05s",
  "763m-style",
  "f-05sr",
  "876m-cs-style",
  "aero-2",
  "992-gt3-styled",
  "1000m-styled",
  "style-21-oem",
  "ff-06",
  "f-04s",
  "f-05x",
  "827m-oem-g8x-spec",
  "f-05sr-f8x-flush-fit",
  "f-12r-c8-z06-forged-monoblock-set",
  "f-11r-600lt-forged-monoblock-set",
  "f11-r",
  "f12-r",
  "f-05sr-g87-m2-flush-fit",
];

const TWO = [
  "two-piece-826m",
  "ff-rsii",
  "f-r11",
  "f12-evo-r",
  "fsr-11",
  "fsr-12",
  "fl-01",
  "f13-evo",
  "fsx-10",
];

const BASE = {
  mono: { low: 2890, high: 3100 },
  two: { low: 3950, high: 4190 },
};

async function gql(query, variables = {}) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(JSON.stringify(json.errors || json, null, 2));
  }
  return json.data;
}

function diameterFromVariant(v) {
  const blob = [
    ...(v.selectedOptions || []).map((o) => o.value),
    v.title || "",
  ].join(" ");
  let m = blob.match(/\b(1[5-9]|2[0-4])\s*["']|\b(1[5-9]|2[0-4])\s*inch/i);
  if (m) return +(m[1] || m[2]);
  m = blob.match(/\b(1[5-9]|2[0-4])\s*\/\s*(1[5-9]|2[0-4])\b/);
  if (m) return Math.max(+m[1], +m[2]);
  m = blob.match(/\b(1[5-9]|2[0-4])x/i);
  if (m) return +m[1];
  m = blob.match(/\b(1[5-9]|2[0-4])[\u2033\u201D]/);
  if (m) return +m[1];
  return null;
}

function finishDeltas(variants) {
  const hasFinish = variants.some((v) =>
    (v.selectedOptions || []).some((o) => /finish|color|colour/i.test(o.name))
  );
  if (!hasFinish) return { hasFinish: false, deltas: {} };
  const byFinish = {};
  for (const v of variants) {
    const f =
      (v.selectedOptions || []).find((o) =>
        /finish|color|colour/i.test(o.name)
      )?.value || "";
    const pr = +v.price;
    if (!byFinish[f] || pr < byFinish[f]) byFinish[f] = pr;
  }
  const base = Math.min(...Object.values(byFinish));
  const deltas = {};
  for (const [f, pr] of Object.entries(byFinish)) {
    const d = Math.round((pr - base) * 100) / 100;
    if (d > 0) deltas[f] = d;
  }
  return { hasFinish: true, deltas, base };
}

function planProduct(product, group) {
  const variants = product.variants?.edges?.map((e) => e.node) || [];
  const prices = variants.map((v) => +v.price);
  const min = Math.min(...prices);
  const looksFullSet = min >= 2000;
  const bases = BASE[group];
  const fin = finishDeltas(variants);
  const updates = [];

  for (const v of variants) {
    const d = diameterFromVariant(v);
    const targetBase = d != null && d >= 21 ? bases.high : bases.low;
    let finishAdd = 0;
    if (fin.hasFinish) {
      const f =
        (v.selectedOptions || []).find((o) =>
          /finish|color|colour/i.test(o.name)
        )?.value || "";
      finishAdd = fin.deltas[f] || 0;
    } else if (looksFullSet) {
      finishAdd = Math.round((+v.price - min) * 100) / 100;
    }
    const newPrice = targetBase + finishAdd;
    if (Math.abs(+v.price - newPrice) > 0.001) {
      updates.push({
        id: v.id,
        title: v.title,
        from: +v.price,
        to: Number(newPrice.toFixed(2)),
        diameter: d,
      });
    }
  }

  return {
    handle: product.handle,
    id: product.id,
    group,
    looksFullSet,
    finishDeltas: fin.deltas,
    updates,
  };
}

const PRODUCT_QUERY = `
query ($q: String!) {
  products(first: 5, query: $q) {
    edges {
      node {
        id
        handle
        title
        status
        options { name values }
        variants(first: 250) {
          edges {
            node {
              id
              title
              price
              selectedOptions { name value }
            }
          }
        }
      }
    }
  }
}`;

const BULK_UPDATE = `
mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id price }
    userErrors { field message }
  }
}`;

async function loadProduct(handle) {
  const data = await gql(PRODUCT_QUERY, { q: `handle:${handle}` });
  const node = data.products.edges.find((e) => e.node.handle === handle)?.node;
  return node || null;
}

async function applyUpdates(productId, updates) {
  // Shopify bulk update allows batches; keep under 100
  const chunkSize = 50;
  const results = [];
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize).map((u) => ({
      id: u.id,
      price: String(u.to.toFixed(2)),
    }));
    const data = await gql(BULK_UPDATE, {
      productId,
      variants: chunk,
    });
    const errs = data.productVariantsBulkUpdate.userErrors || [];
    if (errs.length) {
      throw new Error(
        `Bulk update errors for ${productId}: ${JSON.stringify(errs)}`
      );
    }
    results.push(...(data.productVariantsBulkUpdate.productVariants || []));
    await new Promise((r) => setTimeout(r, 250));
  }
  return results;
}

async function main() {
  const report = [];
  const handles = [
    ...MONO.map((h) => ({ handle: h, group: "mono" })),
    ...TWO.map((h) => ({ handle: h, group: "two" })),
  ];

  console.log(
    `${APPLY ? "APPLY" : "DRY-RUN"} full-set pricing for ${handles.length} products`
  );

  for (const { handle, group } of handles) {
    const product = await loadProduct(handle);
    if (!product) {
      console.warn(`MISSING ${handle}`);
      report.push({ handle, group, missing: true });
      continue;
    }
    const plan = planProduct(product, group);
    console.log(
      `${plan.handle}: ${plan.updates.length}/${product.variants.edges.length} variants` +
        (Object.keys(plan.finishDeltas).length
          ? ` finishΔ=${JSON.stringify(plan.finishDeltas)}`
          : "")
    );
    if (plan.updates.length && APPLY) {
      await applyUpdates(product.id, plan.updates);
      console.log(`  ✓ updated ${plan.updates.length}`);
    }
    report.push(plan);
    await new Promise((r) => setTimeout(r, 150));
  }

  const out = `/tmp/fullset-pricing-${APPLY ? "applied" : "dryrun"}.json`;
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  const total = report.reduce((s, p) => s + (p.updates?.length || 0), 0);
  console.log(`\nWrote ${out}`);
  console.log(`Total variant updates: ${total}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

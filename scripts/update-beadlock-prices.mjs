#!/usr/bin/env node
/**
 * Set all beadlock variant prices to $1,999 except 15-inch diameter options.
 *
 * Auth (pick one):
 *   SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...
 *   SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET  (Dev Dashboard apps, 2026+)
 *
 * Apply:
 *   npm run shop:update-beadlock-prices -- --apply
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STORE = process.env.SHOPIFY_FLAG_STORE || "bb6223-6f.myshopify.com";
const TARGET_PRICE = "1999.00";
const API_VERSION = "2024-10";

const COLLECTIONS = [
  "beadlock-wheels",
  "ff-beadlock-wheels",
  "oem-beadlock-wheels",
  "beadlock",
];

function loadDotEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const apply = process.argv.includes("--apply");
const writeCsv = process.argv.includes("--csv");

async function resolveAdminToken() {
  const direct =
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN || "";
  if (direct.startsWith("shpat_")) return direct;

  const clientId = process.env.SHOPIFY_CLIENT_ID || "";
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) return "";

  const res = await fetch(`https://${STORE}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body.error_description || body.error || res.statusText;
    throw new Error(`Could not fetch Admin API token: ${detail}`);
  }

  if (!body.access_token) {
    throw new Error("OAuth response did not include an access_token.");
  }

  return body.access_token;
}

/** True when the variant's wheel diameter (first number before "x") is 15 inches. */
export function is15InchVariant(variant) {
  const parts = [variant.title, variant.option1, variant.option2, variant.option3]
    .filter(Boolean)
    .map((s) => String(s).trim());

  for (const part of parts) {
    const match = part.match(/^(\d+(?:\.\d+)?)\s*[xX]/);
    if (match && Number(match[1]) === 15) return true;
  }
  return false;
}

async function fetchCollectionProducts(handle) {
  const products = [];
  let page = 1;
  while (true) {
    const url = `https://${STORE}/collections/${handle}/products.json?limit=250&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (!data.products?.length) break;
    products.push(...data.products);
    if (data.products.length < 250) break;
    page += 1;
  }
  return products;
}

async function loadBeadlockProducts() {
  const seen = new Set();
  const products = [];
  for (const handle of COLLECTIONS) {
    const batch = await fetchCollectionProducts(handle);
    for (const product of batch) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      products.push(product);
    }
  }
  return products.sort((a, b) => a.handle.localeCompare(b.handle));
}

function buildUpdatePlan(products) {
  const updates = [];
  let skipped15 = 0;
  let alreadyTarget = 0;

  for (const product of products) {
    for (const variant of product.variants) {
      if (is15InchVariant(variant)) {
        skipped15 += 1;
        continue;
      }
      if (variant.price === TARGET_PRICE) {
        alreadyTarget += 1;
        continue;
      }
      updates.push({
        productId: product.id,
        handle: product.handle,
        title: product.title,
        variantId: variant.id,
        variantTitle: variant.title,
        option1: variant.option1,
        option2: variant.option2,
        option3: variant.option3,
        fromPrice: variant.price,
        toPrice: TARGET_PRICE,
      });
    }
  }

  return { updates, skipped15, alreadyTarget, productCount: products.length };
}

function escapeCsv(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeImportCsv(products, updates, outPath) {
  const byHandle = Object.fromEntries(products.map((p) => [p.handle, p]));
  const lines = ["Handle,Option1 Value,Option2 Value,Option3 Value,Variant Price"];

  for (const row of updates) {
    const product = byHandle[row.handle];
    lines.push(
      [
        row.handle,
        row.option1 ?? "",
        row.option2 ?? "",
        row.option3 ?? "",
        row.toPrice,
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${lines.join("\n")}\n`);
  return outPath;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateVariantPrice(variantId, price, token) {
  const url = `https://${STORE}/admin/api/${API_VERSION}/variants/${variantId}.json`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ variant: { id: variantId, price } }),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const message = body.errors || body.error || text || res.statusText;
    throw new Error(`Variant ${variantId}: ${message}`);
  }

  return body.variant;
}

async function main() {
  console.log(`Store: ${STORE}`);
  console.log(`Mode: ${apply ? "APPLY" : "dry-run"}`);

  const products = await loadBeadlockProducts();
  const plan = buildUpdatePlan(products);

  console.log(`Beadlock products: ${plan.productCount}`);
  console.log(`15-inch variants (unchanged): ${plan.skipped15}`);
  console.log(`Already $${TARGET_PRICE}: ${plan.alreadyTarget}`);
  console.log(`Variants to update: ${plan.updates.length}`);

  if (plan.updates.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  const csvPath = join(ROOT, "data/beadlock-price-update.csv");
  writeImportCsv(products, plan.updates, csvPath);
  console.log(`CSV written: ${csvPath}`);

  if (writeCsv) {
    console.log("CSV-only mode; skipping API updates.");
    return;
  }

  let token = "";
  try {
    token = await resolveAdminToken();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (!token) {
    if (!apply) {
      console.log("\nSample updates:");
      for (const row of plan.updates.slice(0, 10)) {
        console.log(
          `  ${row.handle} | ${row.variantTitle} | $${row.fromPrice} → $${row.toPrice}`
        );
      }
      if (plan.updates.length > 10) {
        console.log(`  ... and ${plan.updates.length - 10} more`);
      }
      console.log(
        "\nAdd SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET, then rerun with --apply."
      );
      console.log(
        `Or import ${csvPath} in Shopify Admin → Products → Import.`
      );
      return;
    }

    console.error("\nMissing Admin API credentials.");
    console.error("Add one of these to Cursor secrets or .env:");
    console.error("  SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...");
    console.error("  SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (Dev Dashboard app)");
    console.error(
      `Or import ${csvPath} in Shopify Admin → Products → Import.`
    );
    process.exit(1);
  }

  if (!apply) {
    console.log("\nSample updates:");
    for (const row of plan.updates.slice(0, 10)) {
      console.log(
        `  ${row.handle} | ${row.variantTitle} | $${row.fromPrice} → $${row.toPrice}`
      );
    }
    if (plan.updates.length > 10) {
      console.log(`  ... and ${plan.updates.length - 10} more`);
    }
    console.log("\nRe-run with --apply to push prices via Admin API.");
    return;
  }

  let ok = 0;
  let failed = 0;

  for (const row of plan.updates) {
    try {
      await updateVariantPrice(row.variantId, row.toPrice, token);
      ok += 1;
      process.stdout.write(".");
      await sleep(550);
    } catch (err) {
      failed += 1;
      console.error(`\nFailed ${row.handle} / ${row.variantTitle}: ${err.message}`);
    }
  }

  console.log(`\nDone. Updated: ${ok}, failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

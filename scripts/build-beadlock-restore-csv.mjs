#!/usr/bin/env node
/**
 * Build a FULL beadlock variant CSV (current + missing 15-inch rows).
 * Import with overwrite so Shopify keeps all listed variants.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STORE = process.env.SHOPIFY_FLAG_STORE || "bb6223-6f.myshopify.com";
const OUT = join(ROOT, "data/beadlock-full-restore.csv");

const COLLECTIONS = [
  "beadlock-wheels",
  "ff-beadlock-wheels",
  "oem-beadlock-wheels",
  "beadlock",
];

/** Pre-import 15-inch rows recovered from store snapshots. */
const RESTORE_15 = {
  "ff-rt1-beadlock": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11", "15x12"] },
  "ff-10r-beadlock": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11", "15x12"] },
  "g80-g82-beadlock": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11"] },
  "ff-rm1-beadlock": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11"] },
  "rpf-1-inspired-dragpack": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11"] },
  "a90-supra-beadlock": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11"] },
  "437m-style-beadlocks": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11"] },
  "513m-beadlocks": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11"] },
  "666m-style-beadlocks-f80-f82-m3-m4": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11"] },
  "a90-a91-mk5-supra-beadlocks-2020-edition": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11"] },
  "f8x-style-beadlocks": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11"] },
  "g8x-827-cs-style-beadlocks": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11"] },
  "hellcat-srt-v2-style-beadlocks": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11"] },
  "s650-mustang-gt-oem-style": { price: "2300.00", sizes: ["15x10", "15x10.5", "15x11"] },
  "c7-z06-beadlock": {
    colors: [
      "Gloss Black",
      "Chrome",
      "Brushed Rose gold",
      "Brushed Gold",
      "Gloss Gray",
      "Brushed Bronze",
      "Brushed Silver",
    ],
    sizes: [
      { size: "15x10", price: "3100.00" },
      { size: "15x12", price: "3200.00" },
    ],
  },
};

function esc(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function variantKey(handle, option1, option2, option3) {
  return [handle, option1 ?? "", option2 ?? "", option3 ?? ""].join("|").toLowerCase();
}

function is15inch(size) {
  const m = String(size || "").match(/^(\d+(?:\.\d+)?)\s*[xX]/i);
  return m && Number(m[1]) === 15;
}

async function fetchCollectionProducts(handle) {
  const products = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://${STORE}/collections/${handle}/products.json?limit=250&page=${page}`
    );
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
    for (const product of await fetchCollectionProducts(handle)) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      products.push(product);
    }
  }
  return products.sort((a, b) => a.handle.localeCompare(b.handle));
}

function buildRows(product) {
  const rows = [];
  const optNames = product.options.map((o) => o.name);

  for (const variant of product.variants) {
    rows.push({
      handle: product.handle,
      title: product.title,
      option1Name: optNames[0] ?? "",
      option1: variant.option1 ?? "",
      option2Name: optNames[1] ?? "",
      option2: variant.option2 ?? "",
      option3Name: optNames[2] ?? "",
      option3: variant.option3 ?? "",
      price: variant.price,
    });
  }

  const restore = RESTORE_15[product.handle];
  if (!restore) return rows;

  const existing = new Set(
    rows.map((r) => variantKey(r.handle, r.option1, r.option2, r.option3))
  );

  if (restore.colors) {
    for (const { size, price } of restore.sizes) {
      for (const color of restore.colors) {
        const key = variantKey(product.handle, size, color, "");
        if (existing.has(key)) continue;
        rows.push({
          handle: product.handle,
          title: product.title,
          option1Name: optNames[0] ?? "Size",
          option1: size,
          option2Name: optNames[1] ?? "Color",
          option2: color,
          option3Name: optNames[2] ?? "",
          option3: "",
          price,
        });
        existing.add(key);
      }
    }
    return rows;
  }

  for (const size of restore.sizes) {
    const key = variantKey(product.handle, size, "", "");
    if (existing.has(key)) continue;
    rows.push({
      handle: product.handle,
      title: product.title,
      option1Name: optNames[0] ?? "SIZE",
      option1: size,
      option2Name: optNames[1] ?? "",
      option2: "",
      option3Name: optNames[2] ?? "",
      option3: "",
      price: restore.price,
    });
    existing.add(key);
  }

  return rows;
}

async function main() {
  const products = await loadBeadlockProducts();
  const header = [
    "Handle",
    "Title",
    "Option1 Name",
    "Option1 Value",
    "Option2 Name",
    "Option2 Value",
    "Option3 Name",
    "Option3 Value",
    "Variant Price",
  ];
  const lines = [header.join(",")];
  let current = 0;
  let restored = 0;

  for (const product of products) {
    const before = product.variants.length;
    const rows = buildRows(product);
    current += before;
    restored += rows.length - before;

    for (const row of rows) {
      lines.push(
        [
          row.handle,
          row.title,
          row.option1Name,
          row.option1,
          row.option2Name,
          row.option2,
          row.option3Name,
          row.option3,
          row.price,
        ]
          .map(esc)
          .join(",")
      );
    }
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${lines.join("\n")}\n`);
  console.log(`Wrote ${OUT}`);
  console.log(`Current variants: ${current}`);
  console.log(`Restored 15-inch rows added: ${restored}`);
  console.log(`Total CSV rows: ${lines.length - 1}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

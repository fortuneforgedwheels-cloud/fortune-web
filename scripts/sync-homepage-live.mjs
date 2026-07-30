#!/usr/bin/env node
/**
 * Mirror templates/index.json to templates/index.live.json so the storefront can
 * load uncached homepage HTML via ?view=live when Shopify's default index cache
 * is stale. Run after theme pull and before theme push.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TEMPLATE_DIR = path.join(ROOT, "theme", "templates");
const SOURCE = path.join(TEMPLATE_DIR, "index.json");
const TARGET = path.join(TEMPLATE_DIR, "index.live.json");

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Missing ${SOURCE}`);
    process.exit(1);
  }

  fs.copyFileSync(SOURCE, TARGET);
  console.log("Synced templates/index.json -> templates/index.live.json");
}

main();

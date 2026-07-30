#!/usr/bin/env node
/**
 * Copy the full homepage template (sections + order) from templates/index.json
 * onto every alternate index.*.json view. Use only while migrating away from
 * duplicate homepage templates — the live storefront should use index.json only.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TEMPLATE_DIR = path.join(ROOT, "theme", "templates");
const SOURCE = path.join(TEMPLATE_DIR, "index.json");

function stripShopifyHeader(raw) {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("/*")) return { header: "", body: raw };
  const end = raw.indexOf("*/");
  if (end === -1) throw new Error(`Invalid Shopify header in ${SOURCE}`);
  return {
    header: raw.slice(0, end + 2) + "\n",
    body: raw.slice(end + 2).trimStart(),
  };
}

function readTemplate(file) {
  const raw = fs.readFileSync(file, "utf8");
  const { header, body } = stripShopifyHeader(raw);
  return { header, data: JSON.parse(body) };
}

function writeTemplate(file, header, data) {
  fs.writeFileSync(file, `${header}${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Missing source template: ${SOURCE}`);
    process.exit(1);
  }

  const { data: sourceData } = readTemplate(SOURCE);
  const SKIP = new Set(["index.g80-m3.json"]);
  const targets = fs
    .readdirSync(TEMPLATE_DIR)
    .filter(
      (name) =>
        name.startsWith("index.") &&
        name.endsWith(".json") &&
        name !== "index.json" &&
        !SKIP.has(name)
    );

  let updated = 0;
  for (const name of targets.sort()) {
    const file = path.join(TEMPLATE_DIR, name);
    const { header, data } = readTemplate(file);
    const before = JSON.stringify({ sections: data.sections, order: data.order });
    data.sections = JSON.parse(JSON.stringify(sourceData.sections));
    data.order = [...sourceData.order];
    const after = JSON.stringify({ sections: data.sections, order: data.order });
    if (before !== after) {
      writeTemplate(file, header, data);
      console.log(`synced ${name}`);
      updated += 1;
    } else {
      console.log(`ok ${name}`);
    }
  }

  console.log(updated ? `Done. Updated ${updated} template(s).` : "Done. All templates already match index.json.");
}

main();

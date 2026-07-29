#!/usr/bin/env node
/**
 * Merge merchant settings from a Shopify-synced JSON template onto a
 * structural patch, so theme-editor text is preserved.
 *
 * Usage:
 *   node scripts/preserve-merchant-settings.mjs \
 *     --from /tmp/shopify-pull/templates/page.about.json \
 *     --onto theme/templates/page.about.json
 *
 * Or in-place merge of settings from --from into --onto (writes --onto).
 */
import fs from "node:fs";
import path from "node:path";

function stripShopifyHeader(raw) {
  const idx = raw.indexOf("{");
  if (idx === -1) throw new Error("No JSON object found");
  return raw.slice(idx);
}

function readJson(file) {
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(stripShopifyHeader(raw));
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Copy settings objects from `from` onto matching section/block ids in `onto`. */
function preserveSettings(onto, from) {
  if (!isPlainObject(onto) || !isPlainObject(from)) return onto;

  if (isPlainObject(onto.settings) && isPlainObject(from.settings)) {
    onto.settings = { ...onto.settings, ...from.settings };
  }

  if (isPlainObject(onto.blocks) && isPlainObject(from.blocks)) {
    for (const [id, block] of Object.entries(onto.blocks)) {
      const src = from.blocks[id];
      if (!src) continue;
      if (isPlainObject(block.settings) && isPlainObject(src.settings)) {
        block.settings = { ...block.settings, ...src.settings };
      }
    }
  }

  if (isPlainObject(onto.sections) && isPlainObject(from.sections)) {
    for (const [id, section] of Object.entries(onto.sections)) {
      const src = from.sections[id];
      if (!src) continue;
      preserveSettings(section, src);
    }
  }

  return onto;
}

function parseArgs(argv) {
  const out = { from: null, onto: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from") out.from = argv[++i];
    else if (a === "--onto") out.onto = argv[++i];
  }
  return out;
}

const { from, onto } = parseArgs(process.argv);
if (!from || !onto) {
  console.error(
    "Usage: node scripts/preserve-merchant-settings.mjs --from <synced.json> --onto <local.json>"
  );
  process.exit(1);
}

const fromPath = path.resolve(from);
const ontoPath = path.resolve(onto);
const fromData = readJson(fromPath);
const ontoData = readJson(ontoPath);
preserveSettings(ontoData, fromData);

const header = `/*
 * ------------------------------------------------------------
 * IMPORTANT: The contents of this file are auto-generated.
 *
 * This file may be updated by the Shopify admin theme editor
 * or related systems. Please exercise caution as any changes
 * made to this file may be overwritten.
 * ------------------------------------------------------------
 */
`;

fs.writeFileSync(ontoPath, `${header}${JSON.stringify(ontoData, null, 2)}\n`);
console.log(`Preserved merchant settings from ${fromPath} into ${ontoPath}`);

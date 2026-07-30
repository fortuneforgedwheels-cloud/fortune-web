#!/usr/bin/env node
/**
 * Copy hero slideshow settings from templates/index.json onto every other
 * homepage alternate view (index.*.json) so theme-editor uploads on the
 * default homepage also appear on ?view=wheels and other cached routes.
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
  return { header, data: JSON.parse(body), raw };
}

function writeTemplate(file, header, data) {
  fs.writeFileSync(file, `${header}${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function findHeroSection(sections) {
  for (const [id, section] of Object.entries(sections || {})) {
    if (section?.type === "ff-hero-lifestyle") return { id, section };
  }
  return null;
}

function syncHeroBlocks(targetSection, sourceSection) {
  const sourceBlocks = sourceSection.blocks || {};
  const targetBlocks = targetSection.blocks || {};
  let changed = 0;

  for (const [blockId, sourceBlock] of Object.entries(sourceBlocks)) {
    if (!targetBlocks[blockId]) continue;
    const nextSettings = { ...sourceBlock.settings };
    const prev = JSON.stringify(targetBlocks[blockId].settings || {});
    targetBlocks[blockId] = {
      ...targetBlocks[blockId],
      type: sourceBlock.type || targetBlocks[blockId].type,
      settings: nextSettings,
    };
    if (JSON.stringify(nextSettings) !== prev) changed += 1;
  }

  return changed;
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Missing source template: ${SOURCE}`);
    process.exit(1);
  }

  const { data: sourceData } = readTemplate(SOURCE);
  const sourceHero = findHeroSection(sourceData.sections);
  if (!sourceHero) {
    console.error("No ff-hero-lifestyle section found in index.json");
    process.exit(1);
  }

  const targets = fs
    .readdirSync(TEMPLATE_DIR)
    .filter(
      (name) =>
        name.startsWith("index.") &&
        name.endsWith(".json") &&
        name !== "index.json"
    );

  let total = 0;
  for (const name of targets.sort()) {
    const file = path.join(TEMPLATE_DIR, name);
    const { header, data } = readTemplate(file);
    const targetHero = findHeroSection(data.sections);
    if (!targetHero) {
      console.log(`skip ${name} (no hero section)`);
      continue;
    }

    const changed = syncHeroBlocks(targetHero.section, sourceHero.section);
    if (changed > 0) {
      writeTemplate(file, header, data);
      console.log(`synced ${name}: ${changed} hero block(s)`);
      total += changed;
    } else {
      console.log(`ok ${name}: already in sync`);
    }
  }

  console.log(total > 0 ? `Done. Updated ${total} block(s).` : "Done. Nothing to update.");
}

main();

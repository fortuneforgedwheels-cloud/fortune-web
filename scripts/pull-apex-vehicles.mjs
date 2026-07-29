#!/usr/bin/env node
/**
 * Pull Apex Wheels vehicle Year/Make/Model/Chassis data from their
 * public Sanity dataset and write theme/assets/ff-vehicle-catalog.json
 *
 * Source: https://c8ihu5xk.apicdn.sanity.io (apexwheels.com CMS)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "theme/assets/ff-vehicle-catalog.json");
const BASE =
  "https://c8ihu5xk.apicdn.sanity.io/v2021-06-07/data/query/production";
const CURRENT = new Date().getUTCFullYear();

async function q(query) {
  const url = `${BASE}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "fortune-web-catalog-sync" },
  });
  if (!res.ok) throw new Error(`Sanity ${res.status} for ${query.slice(0, 80)}`);
  const json = await res.json();
  return json.result;
}

function expandYears(text) {
  if (!text) return new Set();
  const years = new Set();
  const t = String(text).trim();
  for (const m of t.matchAll(/\b((?:19|20)\d{2})\s*\+/g)) {
    const start = Number(m[1]);
    for (let y = start; y <= CURRENT; y++) years.add(y);
  }
  for (const m of t.matchAll(/\b((?:19|20)\d{2})\s*[-–]\s*((?:19|20)\d{2})\b/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    for (let y = a; y <= b; y++) years.add(y);
  }
  for (const m of t.matchAll(
    /\b((?:19|20)\d{2})\s*[-–]\s*(present|now|current)\b/gi
  )) {
    const a = Number(m[1]);
    for (let y = a; y <= CURRENT; y++) years.add(y);
  }
  if (!years.size) {
    for (const m of t.matchAll(/\b((?:19|20)\d{2})\b/g)) years.add(Number(m[1]));
  }
  return years;
}

async function main() {
  const [makes, models, generations, submodels, bolts, bores] = await Promise.all([
    q(`*[_type=="make"]{ _id, name, "modelIds": models[]._ref }`),
    q(
      `*[_type=="model"]{ _id, name, isHidden, "generationIds": generations[]._ref }`
    ),
    q(`*[_type=="generation"]{
      _id, name, years, trim, isRedirect,
      "slug": pageInfo.canonical.current,
      "submodelIds": submodels[]._ref,
      "boltPatternId": boltPattern._ref,
      "centerBoreIds": centerBores[]._ref
    }`),
    q(`*[_type=="submodel"]{ _id, name, years }`),
    q(`*[_type=="boltPattern"]{ _id, name, value }`),
    q(`*[_type=="centerBore"]{ _id, name, value }`),
  ]);

  const modelById = Object.fromEntries(models.map((m) => [m._id, m]));
  const genById = Object.fromEntries(generations.map((g) => [g._id, g]));
  const subById = Object.fromEntries(submodels.map((s) => [s._id, s]));
  const boltById = Object.fromEntries(bolts.map((b) => [b._id, b]));
  const boreById = Object.fromEntries(bores.map((b) => [b._id, b]));

  const catalog = {};
  let fitmentRecords = 0;
  let skippedNoYears = 0;

  for (const make of [...makes].sort((a, b) => a.name.localeCompare(b.name))) {
    for (const mid of make.modelIds || []) {
      const model = modelById[mid];
      if (!model || model.isHidden) continue;
      for (const gid of model.generationIds || []) {
        const gen = genById[gid];
        if (!gen || gen.isRedirect) continue;
        const yearSet = expandYears(gen.years);
        const chassis = (gen.name || "").trim();
        const trim = (gen.trim || chassis).trim();
        const bolt = boltById[gen.boltPatternId || ""];
        const boreNames = (gen.centerBoreIds || [])
          .map((id) => boreById[id])
          .filter(Boolean)
          .map((b) => b.value || b.name);
        const subNames = [];
        for (const sid of gen.submodelIds || []) {
          const s = subById[sid];
          if (!s) continue;
          expandYears(s.years).forEach((y) => yearSet.add(y));
          subNames.push(s.name);
        }
        if (!yearSet.size) {
          skippedNoYears += 1;
          continue;
        }
        const boltVal = bolt ? bolt.value || bolt.name : null;
        const recChassis = chassis || trim;
        fitmentRecords += 1;
        for (const y of yearSet) {
          const ys = String(y);
          const bucket = ((catalog[ys] ??= {})[make.name] ??= {})[model.name] ??=
            [];
          if (!bucket.some((x) => x.chassis === recChassis)) {
            bucket.push({
              chassis: recChassis,
              trim,
              boltPattern: boltVal,
              centerBore: boreNames[0] || null,
              yearsLabel: gen.years || "",
              submodels: subNames,
              slug: gen.slug || "",
            });
          }
        }
      }
    }
  }

  const yearList = Object.keys(catalog)
    .map(Number)
    .sort((a, b) => b - a);
  const tree = {
    source:
      "apexwheels.com public Sanity dataset (make/model/generation/submodel)",
    pulledAt: new Date().toISOString(),
    stats: {
      makes: makes.length,
      models: models.length,
      generations: generations.length,
      submodels: submodels.length,
      fitmentRecords,
      yearsCovered: yearList.length,
      skippedNoYears,
    },
    yearList,
    years: Object.fromEntries(yearList.map((y) => [String(y), catalog[String(y)]])),
  };

  fs.writeFileSync(OUT, JSON.stringify(tree));
  console.log(`Wrote ${OUT}`);
  console.log(JSON.stringify(tree.stats, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

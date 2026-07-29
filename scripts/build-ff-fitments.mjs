#!/usr/bin/env node
/**
 * Extract Fortune Forged fitment guide configs from BMW page templates
 * into theme/assets/ff-ff-fitments.json for Shop By Vehicle.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TEMPLATES = [
  { slug: 'f80', file: 'page.f80-fitment.json' },
  { slug: 'g20-g21', file: 'page.g20-fitment.json' },
  { slug: 'e90-e92-e93', file: 'page.e9x-fitment.json' },
  { slug: 'g8x', file: 'page.shopbyvehiclebmw-template.json', sectionKey: 'ff_fitment_guide_g8x' },
];

const SLUG_ALIASES = {
  /* F8X — F80 M3 + F82/F83 M4 */
  'f82-f83': 'f80',
  /* G8X — G80 M3, G82/G83 M4, G87 M2 */
  'g80': 'g8x',
  'g82-g83': 'g8x',
  'g87': 'g8x',
  /* G2X / G4X — G20/G21 3 Series + G42 2 Series */
  'g22-g23-g26': 'g20-g21',
  'g26-i4': 'g20-g21',
  'g42': 'g20-g21',
  /* E9X */
  'e90-e91-e92-e93': 'e90-e92-e93',
  'e90-e91-lci': 'e90-e92-e93',
};

function cleanWheelSpec(spec) {
  if (!spec) return '';
  return String(spec)
    .replace(/^front:\s*/i, '')
    .replace(/^rear:\s*/i, '')
    .replace(/[\u201c\u201d"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function readTemplateJson(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  text = text.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '');
  return JSON.parse(text);
}

function extractConfigs(templatePath, sectionKey) {
  const raw = readTemplateJson(templatePath);
  const section = sectionKey
    ? raw.sections?.[sectionKey]
    : Object.values(raw.sections || {}).find((s) => s.type === 'ff-fitment-guide');
  if (!section || section.type !== 'ff-fitment-guide') return [];

  const configs = [];
  for (const block of Object.values(section.blocks || {})) {
    if (block.type !== 'tier') continue;
    const b = block.settings || {};
    for (const cfg of ['a', 'b']) {
      const front = cleanWheelSpec(b[`${cfg}_front`]);
      const rear = cleanWheelSpec(b[`${cfg}_rear`]);
      if (!front && !rear) continue;
      configs.push({
        tier: b.tier_title || '',
        config: b[`${cfg}_label`] || '',
        front: front || rear || '',
        rear: rear || front || '',
        notes: b[`${cfg}_notes`] || '',
        tirePick: b[`${cfg}_tire_pick`] || '',
        tireFlags: b[`${cfg}_tire_flags`] || '',
        source: 'fortune-forged',
      });
    }
  }
  return configs;
}

const fitments = {};
for (const { slug, file, sectionKey } of TEMPLATES) {
  const filePath = path.join(ROOT, 'theme/templates', file);
  if (!fs.existsSync(filePath)) {
    console.warn('Missing template:', file);
    continue;
  }
  fitments[slug] = extractConfigs(filePath, sectionKey);
  console.log(`${slug}: ${fitments[slug].length} configs from ${file}`);
}

const out = {
  source: 'Fortune Forged BMW fitment guides (page templates)',
  builtAt: new Date().toISOString(),
  slugAliases: SLUG_ALIASES,
  fitments,
};

const outPath = path.join(ROOT, 'theme/assets/ff-ff-fitments.json');
fs.writeFileSync(outPath, JSON.stringify(out));
console.log('Wrote', outPath);

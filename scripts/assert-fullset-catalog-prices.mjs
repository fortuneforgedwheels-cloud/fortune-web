#!/usr/bin/env node
/**
 * Asserts storefront-visible Monoblock / Two-Piece catalog prices are full-set,
 * not obsolete per-wheel amounts Google has previously indexed.
 *
 * Usage: node scripts/assert-fullset-catalog-prices.mjs
 */
const STOREFRONT = process.env.FF_STOREFRONT_URL || 'https://fortuneforgedwheels.com';

const COLLECTIONS = [
  'monoblock-wheels',
  'ff-monoblock-wheels',
  'oem-monoblock-wheels',
  'two-piece-wheels',
  'ff-two-piece-wheels',
];

const FORBIDDEN_PRODUCT_HANDLES = [
  'ff-sp3',
  'f-stars',
  'quadra-stars',
  'fsr-10',
  'jesse-test-item',
];

const MIN_FULLSET = {
  MONOBLOCK: 2890,
  'TWO PIECE': 3950,
};

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'FortuneForged-CatalogAssert/1.0' },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

function minVariantPrice(product) {
  const prices = (product.variants || []).map((v) => Number(v.price));
  return Math.min(...prices);
}

async function main() {
  const errors = [];

  for (const handle of FORBIDDEN_PRODUCT_HANDLES) {
    const res = await fetch(`${STOREFRONT}/products/${handle}.js`, {
      headers: { 'User-Agent': 'FortuneForged-CatalogAssert/1.0' },
    });
    if (res.ok) {
      errors.push(`Obsolete/orphan product still storefront-visible: ${handle}`);
    }
  }

  for (const collection of COLLECTIONS) {
    const data = await fetchJson(
      `${STOREFRONT}/collections/${collection}/products.json?limit=250`
    );
    for (const product of data.products || []) {
      const min = minVariantPrice(product);
      const tags = (product.tags || []).map((t) => String(t).toUpperCase());
      const isMono = tags.includes('MONOBLOCK');
      const isTwo = tags.includes('TWO PIECE') || tags.includes('TWO-PIECE');
      const floor = isTwo ? MIN_FULLSET['TWO PIECE'] : MIN_FULLSET.MONOBLOCK;
      if ((isMono || isTwo || collection.includes('monoblock') || collection.includes('two-piece')) && min < floor) {
        // Beadlock pairs must not appear in these collections; anything under floor is obsolete unit pricing.
        errors.push(
          `${collection}/${product.handle} min price $${min} below full-set floor $${floor}`
        );
      }
    }
  }

  // /collections/all must not expose classic per-wheel unit prices for non-beadlock wheels
  const all = await fetchJson(`${STOREFRONT}/collections/all/products.json?limit=250`);
  for (const product of all.products || []) {
    const min = minVariantPrice(product);
    const title = String(product.title || '');
    const tags = (product.tags || []).map((t) => String(t).toUpperCase());
    const isBeadlock = tags.includes('BEADLOCK') || /\bPAIR\b/i.test(title);
    const isAccessory =
      /surcharge|chrome|shirt|tee|hoodie|hat|sticker|gift|ticket|giveaway/i.test(title) ||
      tags.includes('CLOTHING') ||
      min < 150;
    if (!isBeadlock && !isAccessory && min >= 150 && min < 2000) {
      errors.push(
        `collections/all/${product.handle} exposes non-beadlock price $${min} in obsolete unit range`
      );
    }
  }

  if (errors.length) {
    console.error('Catalog full-set pricing assertions failed:');
    for (const e of errors) console.error(' -', e);
    process.exit(1);
  }
  console.log('OK: storefront Monoblock/Two-Piece catalog prices look full-set; orphans are not live.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

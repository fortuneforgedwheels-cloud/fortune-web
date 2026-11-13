/**
 * Unit checks for monoblock chrome surcharge math (no browser).
 * Run: node scripts/test-mono-chrome-surcharge.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'theme/assets/ff-bcpo-chrome-surcharge.js'), 'utf8');

const document = {
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
  addEventListener() {},
};
const window = {
  document,
  addEventListener() {},
  FF_CHROME_SURCHARGE: {
    variantId: '54535047840019',
    handle: 'chrome-finish-surcharge',
    amount: 250,
    monoVariantId: '68016585736467',
    monoHandle: 'chrome-finish-surcharge-mono',
    monoAmount: 220,
  },
  __ffChromeChargeV2: true, // prevent fetch hooks during load
};
window.window = window;
window.document = document;
const location = { pathname: '/' };
const context = { window, document, location, console, setInterval() { return 0; }, clearInterval() {} };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context);

const api = window.__ffChromeSurchargeApi;
assert.ok(api, 'exposes __ffChromeSurchargeApi');

assert.equal(api.isChromeValue('Chrome'), true);
assert.equal(api.isChromeValue('Triple Chrome'), true);
assert.equal(api.isChromeValue('Black Chrome'), true);
assert.equal(api.isChromeValue('24K Gold Chrome'), true);
assert.equal(api.isChromeValue('Triple Chrome (+$220)'), true);
assert.equal(api.isChromeValue('Brushed Silver'), false);
assert.equal(api.isChromeValue('Polished Gold'), false);

assert.equal(api.monoWheelCount(1), 4, 'PDP qty 1 → set of 4');
assert.equal(api.monoWheelCount(4), 4, 'SBV square qty 4');
assert.equal(api.monoWheelCount(2), 2, 'staggered pair qty 2');
assert.equal(api.monoWheelCount(8), 8);

assert.equal(4 * 220, 880, 'set of 4 chrome = $880');
assert.equal(api.monoWheelCount(1) * 220, 880);

console.log('ok: monoblock chrome surcharge unit checks passed');

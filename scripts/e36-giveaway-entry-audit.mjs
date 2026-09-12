#!/usr/bin/env node
/**
 * E36 giveaway entry auditor — matches live theme snippet
 * snippets/ff-giveaway-entry-tickets.liquid
 *
 * Rules:
 *   paid  = qty of lines where handle is 1998-bmw-m3 OR tags include giveaway-entry
 *           OR title looks like "1998 BMW M3" / "giveaway entry"
 *   bonus = +5 per line where handle is exclusive-deals-full-set
 *           OR tags include invasion-wheel-set OR bimmer-invasion
 *           OR title contains "exclusive deals"
 *           (fixed +5 per matching line item — not × quantity)
 *   tickets = `${orderName}-${i}` for i in 1..paid+bonus
 *
 * NOTE: Ticket IDs are derived — they are not separate Shopify orders and do not
 * appear as their own Admin order rows.
 * Usage:
 *   node scripts/e36-giveaway-entry-audit.mjs --self-test
 *   node scripts/e36-giveaway-entry-audit.mjs --csv path/to/orders.csv
 *   node scripts/e36-giveaway-entry-audit.mjs --csv path/to/orders.csv --out /tmp/e36.csv
 *
 * Preferred CSV columns:
 *   order_name,product_handle,quantity,tags,financial_status
 *
 * Shopify Admin Orders → Export (with line items) also works using
 * Name / Lineitem name / Lineitem quantity.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GIVEAWAY_HANDLE = '1998-bmw-m3';
const GIVEAWAY_TAG = 'giveaway-entry';
const WHEEL_SET_HANDLE = 'exclusive-deals-full-set';
const WHEEL_SET_TAGS = ['invasion-wheel-set', 'bimmer-invasion'];

const TITLE_TO_HANDLE = new Map([
  ['1998 bmw m3', GIVEAWAY_HANDLE],
  ['1998-bmw-m3', GIVEAWAY_HANDLE],
  ['exclusive deals — full set', WHEEL_SET_HANDLE],
  ['exclusive deals - full set', WHEEL_SET_HANDLE],
  ['exclusive deals full set', WHEEL_SET_HANDLE],
  ['exclusive-deals-full-set', WHEEL_SET_HANDLE],
]);

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  }
  if (tags == null || tags === '') return [];
  return String(tags)
    .split(/[,/|]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function resolveHandle(line) {
  const raw = String(line.product_handle || line.handle || '')
    .trim()
    .toLowerCase();
  if (raw) return raw;
  const title = String(line.product_title || line.lineitem_name || line.title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (TITLE_TO_HANDLE.has(title)) return TITLE_TO_HANDLE.get(title);
  if (title.includes('1998') && title.includes('m3')) return GIVEAWAY_HANDLE;
  if (title.includes('exclusive') && title.includes('full set')) return WHEEL_SET_HANDLE;
  return '';
}

function isPaidGiveawayLine(handle, tags) {
  return handle === GIVEAWAY_HANDLE || tags.includes(GIVEAWAY_TAG);
}

function isWheelSetBonusLine(handle, tags) {
  return handle === WHEEL_SET_HANDLE || WHEEL_SET_TAGS.some((t) => tags.includes(t));
}

export function calculateOrderEntries(order) {
  const orderName = String(order.order_name || order.name || '').trim();
  let paid = 0;
  let bonus = 0;
  const matched = [];

  for (const line of order.lines || []) {
    const handle = resolveHandle(line);
    const tags = normalizeTags(line.tags);
    const qty = Math.max(0, Number(line.quantity ?? line.qty ?? 0) || 0);
    let linePaid = 0;
    let lineBonus = 0;

    if (isPaidGiveawayLine(handle, tags)) {
      linePaid = qty;
      paid += linePaid;
    }
    if (isWheelSetBonusLine(handle, tags)) {
      lineBonus = 5; // fixed +5 per matching line — matches Liquid
      bonus += lineBonus;
    }

    if (linePaid || lineBonus) {
      matched.push({
        handle: handle || '(unresolved)',
        quantity: qty,
        paid: linePaid,
        bonus: lineBonus,
        tags,
      });
    }
  }

  const total = paid + bonus;
  const tickets = [];
  for (let i = 1; i <= total; i++) tickets.push(`${orderName}-${i}`);

  return {
    order_name: orderName,
    paid_entries: paid,
    bonus_entries: bonus,
    total_entries: total,
    tickets,
    matched_lines: matched,
  };
}

function parseCsv(text) {
  const rows = [];
  let i = 0;
  let field = '';
  let row = [];
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
  }
  return rows;
}

function headerKey(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '_');
}

export function ordersFromCsv(text) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  if (!rows.length) return [];
  const headers = rows[0].map(headerKey);
  const idx = (names) => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };

  const iOrder = idx(['order_name', 'name', 'order']);
  const iHandle = idx(['product_handle', 'handle']);
  const iTitle = idx(['product_title', 'lineitem_name', 'lineitemname', 'title']);
  const iQty = idx(['quantity', 'qty', 'lineitem_quantity', 'lineitemquantity']);
  const iTags = idx(['tags', 'product_tags']);
  const iStatus = idx(['financial_status', 'financialstatus']);

  if (iOrder < 0 || iQty < 0 || (iHandle < 0 && iTitle < 0)) {
    throw new Error(
      'CSV needs order_name (or Name), quantity (or Lineitem quantity), and product_handle or Lineitem name'
    );
  }

  const byOrder = new Map();
  for (const cells of rows.slice(1)) {
    const orderName = String(cells[iOrder] || '').trim();
    if (!orderName) continue;
    const status = iStatus >= 0 ? String(cells[iStatus] || '').trim() : '';
    if (!byOrder.has(orderName)) {
      byOrder.set(orderName, { order_name: orderName, financial_status: status, lines: [] });
    }
    const order = byOrder.get(orderName);
    if (status) order.financial_status = status;
    order.lines.push({
      product_handle: iHandle >= 0 ? cells[iHandle] : '',
      product_title: iTitle >= 0 ? cells[iTitle] : '',
      quantity: cells[iQty],
      tags: iTags >= 0 ? cells[iTags] : '',
    });
  }
  return [...byOrder.values()];
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function orderSortKey(name) {
  const raw = String(name || '').replace(/^#/, '');
  const digits = raw.replace(/\D+/g, '');
  const n = digits ? Number(digits) : NaN;
  return { n: Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER, raw: raw.toLowerCase() };
}

export function sortOrders(results) {
  return [...results].sort((a, b) => {
    const ka = orderSortKey(a.order_name);
    const kb = orderSortKey(b.order_name);
    if (ka.n !== kb.n) return ka.n - kb.n;
    return ka.raw.localeCompare(kb.raw);
  });
}

export function buildSummaryRows(results) {
  return sortOrders(results).map((r) => ({
    order_name: r.order_name,
    paid_entries: r.paid_entries,
    bonus_entries: r.bonus_entries,
    total_entries: r.total_entries,
    ticket_start: r.tickets[0] || '',
    ticket_end: r.tickets[r.tickets.length - 1] || '',
    all_tickets: r.tickets.join(' '),
  }));
}

export function buildTicketRows(results) {
  const rows = [];
  for (const r of sortOrders(results)) {
    r.tickets.forEach((ticket, idx) => {
      rows.push({
        ticket,
        order_name: r.order_name,
        ticket_index: idx + 1,
        paid_entries: r.paid_entries,
        bonus_entries: r.bonus_entries,
        total_entries: r.total_entries,
      });
    });
  }
  return rows;
}

function writeCsv(filePath, rows) {
  if (!rows.length) {
    fs.writeFileSync(filePath, '');
    return;
  }
  const cols = Object.keys(rows[0]);
  const lines = [cols.join(',')];
  for (const row of rows) lines.push(cols.map((c) => csvEscape(row[c])).join(','));
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function runSelfTests() {
  const cases = [
    {
      name: 'qty 1 giveaway only',
      order: { order_name: '#1001', lines: [{ product_handle: GIVEAWAY_HANDLE, quantity: 1 }] },
      expect: { paid: 1, bonus: 0, total: 1, tickets: ['#1001-1'] },
    },
    {
      name: 'qty 5 giveaway',
      order: { order_name: 'FF1002', lines: [{ product_handle: GIVEAWAY_HANDLE, quantity: 5 }] },
      expect: {
        paid: 5,
        bonus: 0,
        total: 5,
        tickets: ['FF1002-1', 'FF1002-2', 'FF1002-3', 'FF1002-4', 'FF1002-5'],
      },
    },
    {
      name: 'wheel set alone → +5 entries',
      order: { order_name: '#1003', lines: [{ product_handle: WHEEL_SET_HANDLE, quantity: 1 }] },
      expect: { paid: 0, bonus: 5, total: 5, tickets: ['#1003-1', '#1003-2', '#1003-3', '#1003-4', '#1003-5'] },
    },
    {
      name: 'wheel set qty 2 still +5 per line (Liquid does not × qty)',
      order: { order_name: '#1004', lines: [{ product_handle: WHEEL_SET_HANDLE, quantity: 2 }] },
      expect: { paid: 0, bonus: 5, total: 5 },
    },
    {
      name: 'giveaway + wheel set',
      order: {
        order_name: 'FF1005',
        lines: [
          { product_handle: GIVEAWAY_HANDLE, quantity: 2 },
          { product_handle: WHEEL_SET_HANDLE, quantity: 1 },
        ],
      },
      expect: {
        paid: 2,
        bonus: 5,
        total: 7,
        tickets: ['FF1005-1', 'FF1005-2', 'FF1005-3', 'FF1005-4', 'FF1005-5', 'FF1005-6', 'FF1005-7'],
      },
    },
    {
      name: 'tag giveaway-entry without handle',
      order: {
        order_name: '#1006',
        lines: [{ product_handle: 'other', quantity: 4, tags: 'Giveaway-Entry, e36' }],
      },
      expect: { paid: 4, bonus: 0, total: 4 },
    },
    {
      name: 'invasion tag bonus without handle',
      order: {
        order_name: '#1007',
        lines: [{ product_handle: 'wheels', quantity: 1, tags: 'bimmer-invasion' }],
      },
      expect: { paid: 0, bonus: 5, total: 5 },
    },
    {
      name: 'unrelated product → 0 tickets',
      order: { order_name: '#1008', lines: [{ product_handle: 'ff-s10', quantity: 1 }] },
      expect: { paid: 0, bonus: 0, total: 0, tickets: [] },
    },
    {
      name: 'title alias from Shopify CSV',
      order: { order_name: '#1009', lines: [{ product_title: '1998 BMW M3', quantity: 3 }] },
      expect: { paid: 3, bonus: 0, total: 3 },
    },
  ];

  let passed = 0;
  for (const tc of cases) {
    const got = calculateOrderEntries(tc.order);
    assert(got.paid_entries === tc.expect.paid, `${tc.name}: paid ${got.paid_entries} != ${tc.expect.paid}`);
    assert(
      got.bonus_entries === tc.expect.bonus,
      `${tc.name}: bonus ${got.bonus_entries} != ${tc.expect.bonus}`
    );
    assert(
      got.total_entries === tc.expect.total,
      `${tc.name}: total ${got.total_entries} != ${tc.expect.total}`
    );
    if (tc.expect.tickets) {
      assert(
        JSON.stringify(got.tickets) === JSON.stringify(tc.expect.tickets),
        `${tc.name}: tickets ${JSON.stringify(got.tickets)}`
      );
    }
    passed += 1;
    console.log(`  ✓ ${tc.name}`);
  }

  const sorted = sortOrders([
    calculateOrderEntries({
      order_name: '#1010',
      lines: [{ product_handle: GIVEAWAY_HANDLE, quantity: 1 }],
    }),
    calculateOrderEntries({
      order_name: '#1002',
      lines: [{ product_handle: GIVEAWAY_HANDLE, quantity: 1 }],
    }),
    calculateOrderEntries({
      order_name: 'FF9',
      lines: [{ product_handle: GIVEAWAY_HANDLE, quantity: 1 }],
    }),
  ]);
  assert(sorted.map((r) => r.order_name).join(',') === 'FF9,#1002,#1010', 'numeric order sort failed');
  console.log('  ✓ numeric order sort');
  passed += 1;

  const sampleCsv = [
    'order_name,product_handle,quantity,tags,financial_status',
    '#2001,1998-bmw-m3,2,,paid',
    '#2001,exclusive-deals-full-set,1,,paid',
    '#2002,1998-bmw-m3,1,,paid',
    '#1999,ff-s10,1,,paid',
  ].join('\n');
  const fromCsv = ordersFromCsv(sampleCsv)
    .map(calculateOrderEntries)
    .filter((r) => r.total_entries > 0);
  const summary = buildSummaryRows(fromCsv);
  assert(summary.length === 2, 'csv should yield 2 giveaway orders');
  assert(summary[0].order_name === '#2001', 'csv sort order');
  assert(summary[0].total_entries === 7, 'csv #2001 total');
  assert(summary[1].total_entries === 1, 'csv #2002 total');
  console.log('  ✓ csv parse + summary');
  passed += 1;

  console.log(`\nSelf-test passed: ${passed} checks`);
}

function printTable(rows) {
  if (!rows.length) {
    console.log('No giveaway-related orders found.');
    return;
  }
  const cols = [
    'order_name',
    'paid_entries',
    'bonus_entries',
    'total_entries',
    'ticket_start',
    'ticket_end',
  ];
  const widths = Object.fromEntries(
    cols.map((c) => [c, Math.max(c.length, ...rows.map((r) => String(r[c]).length))])
  );
  const line = (row) => cols.map((c) => String(row[c]).padEnd(widths[c])).join('  ');
  console.log(line(Object.fromEntries(cols.map((c) => [c, c]))));
  console.log(cols.map((c) => '-'.repeat(widths[c])).join('  '));
  for (const row of rows) console.log(line(row));
  const totalTickets = rows.reduce((sum, r) => sum + Number(r.total_entries), 0);
  console.log(`\nOrders with entries: ${rows.length}`);
  console.log(`Total tickets (drawing pool size): ${totalTickets}`);
}

function main(argv) {
  const args = argv.slice(2);
  const wantsSelfTest = args.includes('--self-test') || args.length === 0;
  const csvIdx = args.indexOf('--csv');

  if (wantsSelfTest) {
    console.log('Running E36 giveaway entry self-tests (Liquid parity)...\n');
    runSelfTests();
    if (csvIdx < 0) return;
    console.log('');
  }

  if (csvIdx >= 0) {
    const csvPath = args[csvIdx + 1];
    if (!csvPath) throw new Error('--csv requires a file path');
    const text = fs.readFileSync(csvPath, 'utf8');
    const orders = ordersFromCsv(text);
    const paidOnly = args.includes('--paid-only');
    const results = orders
      .map((o) => ({ ...calculateOrderEntries(o), financial_status: o.financial_status || '' }))
      .filter((r) => r.total_entries > 0)
      .filter((r) => {
        if (!paidOnly) return true;
        const s = String(r.financial_status || '').toLowerCase();
        return !s || s === 'paid';
      });

    const summary = buildSummaryRows(results);
    printTable(summary);

    const outIdx = args.indexOf('--out');
    const outPath =
      outIdx >= 0
        ? args[outIdx + 1]
        : path.join(path.dirname(csvPath), `e36-entry-summary-${Date.now()}.csv`);
    writeCsv(outPath, summary);

    const ticketsOut = outPath.replace(/\.csv$/i, '') + '-tickets.csv';
    writeCsv(ticketsOut, buildTicketRows(results));
    console.log(`\nWrote summary: ${outPath}`);
    console.log(`Wrote flat ticket list (easy raffle sort): ${ticketsOut}`);
    return;
  }

  if (!wantsSelfTest) {
    console.log(`Usage:
  node scripts/e36-giveaway-entry-audit.mjs --self-test
  node scripts/e36-giveaway-entry-audit.mjs --csv orders.csv [--out summary.csv] [--paid-only]`);
  }
}

const isDirect =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  try {
    main(process.argv);
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

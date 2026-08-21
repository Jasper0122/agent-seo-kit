#!/usr/bin/env node
/**
 * Merge this run's opportunities into the persistent ledger.
 *
 *   node scripts/geo-ledger.mjs
 *   node scripts/geo-ledger.mjs --list open
 *   node scripts/geo-ledger.mjs --set GEO014 --status in-progress --owner me
 *
 * Free.
 *
 * Two guarantees, and the file is worthless without either:
 *
 * IDEMPOTENT. Rows are keyed by question plus reason, so re-running a cycle
 * never duplicates work. What accumulates instead is firstSeenRun, lastSeenRun
 * and runsSeen, which is how you tell a standing loss from a bad afternoon.
 *
 * HUMAN FIELDS SURVIVE. status, owner, targetUrl, contentId, notes and verdict
 * are never overwritten by a merge; only measured fields refresh. Break this
 * and the first re-run silently erases every editorial decision in the file.
 */
import { argv, dataPath, readJson, writeJson, today, die } from '../lib/io.mjs';

const { flags } = argv();
const LEDGER = dataPath('geo-ledger.json');
const ledger = readJson(LEDGER, { version: 1, updatedAt: null, rows: [] });

const HUMAN_FIELDS = ['status', 'owner', 'targetUrl', 'contentId', 'notes', 'verdict'];

if (flags.set) {
  const row = ledger.rows.find((r) => r.id.toLowerCase() === String(flags.set).toLowerCase());
  if (!row) die(`no row ${flags.set}`);
  let n = 0;
  for (const field of HUMAN_FIELDS) {
    if (flags[field] !== undefined) { row[field] = flags[field]; n += 1; }
  }
  if (!n) die(`nothing to set. Human fields: ${HUMAN_FIELDS.join(', ')}`);
  writeJson(LEDGER, { ...ledger, updatedAt: today() });
  console.log(`ok ${row.id} updated (${n} field(s))`);
  process.exit(0);
}

if (flags.list) {
  const want = String(flags.list);
  const rows = want === 'all' ? ledger.rows : ledger.rows.filter((r) => r.status === want);
  console.log(`${rows.length} row(s) with status ${want}\n`);
  for (const r of rows) {
    console.log(`${r.id}  ${String(r.status).padEnd(12)} ${r.reason.padEnd(32)} ${String(r.query).slice(0, 60)}`);
  }
  process.exit(0);
}

const opportunities = readJson(dataPath('geo-opportunities.json'));
if (!opportunities) die('no data/geo-opportunities.json. Run: node scripts/geo-opportunities.mjs');

const runId = String(opportunities.fromRun ?? today()).slice(0, 19);
const incoming = [
  ...opportunities.groups.attack,
  ...opportunities.groups.defend,
  ...opportunities.groups.uncited,
];

const key = (row) => `${row.queryId}::${row.reason}`;
const existing = new Map(ledger.rows.map((r) => [`${r.queryId}::${r.reason}`, r]));

let added = 0, refreshed = 0, resolved = 0;
const seenNow = new Set();

for (const row of incoming) {
  const k = key(row);
  seenNow.add(k);
  const found = existing.get(k);

  if (!found) {
    ledger.rows.push({
      id: 'GEO' + String(ledger.rows.length + 1).padStart(3, '0'),
      queryId: row.queryId,
      query: row.query,
      cohort: row.cohort,
      reason: row.reason,
      competitors: row.competitors ?? [],
      mustJoin: row.mustJoin ?? [],
      firstSeenRun: runId,
      lastSeenRun: runId,
      runsSeen: 1,
      // Human fields. A merge must never touch these again.
      status: 'open',
      owner: '',
      targetUrl: '',
      contentId: '',
      notes: '',
      verdict: '',
    });
    added += 1;
    continue;
  }

  // Measured fields refresh, human fields do not.
  found.competitors = row.competitors ?? found.competitors;
  found.mustJoin = row.mustJoin ?? found.mustJoin;
  found.lastSeenRun = runId;
  found.runsSeen = (found.runsSeen ?? 0) + 1;
  if (found.status === 'resolved') found.status = 'open';
  refreshed += 1;
}

for (const [k, row] of existing) {
  if (seenNow.has(k) || row.status === 'resolved') continue;
  // A gap that stopped appearing is marked resolved, never deleted. "We were
  // absent here and now we are not" is the only outcome evidence this pipeline
  // produces, and deleting the row throws it away. It is still not proof that
  // anything you published caused it.
  row.status = 'resolved';
  row.resolvedAtRun = runId;
  resolved += 1;
}

writeJson(LEDGER, { ...ledger, updatedAt: today() });

console.log(`ledger merged from run ${runId}\n`);
console.log(`  ${String(added).padStart(4)}  new`);
console.log(`  ${String(refreshed).padStart(4)}  still open`);
console.log(`  ${String(resolved).padStart(4)}  marked resolved (stopped appearing)`);
console.log(`\n${ledger.rows.length} row(s) total in data/geo-ledger.json`);
console.log('A resolved row is evidence of a change, not proof of its cause.');

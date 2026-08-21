#!/usr/bin/env node
/**
 * Pull the organic keyword set for your domain and for each configured
 * competitor, one file per domain.
 *
 *   node scripts/pull-organic.mjs --dry-run     quote the cost, spend nothing
 *   node scripts/pull-organic.mjs
 *   node scripts/pull-organic.mjs --only competitor-a.com --limit 100
 *
 * These reports bill per returned row, so `limits.rowsPerDomain` in the config
 * is the cost dial and nothing else. Run the dry quote first whenever it moves.
 */
import { loadConfig } from '../lib/config.mjs';
import { pullOrganic, PRICE_PER_ROW, MAX_ROWS } from '../lib/keywords.mjs';
import { argv, dataPath, writeJson } from '../lib/io.mjs';

const { flags } = argv();
const cfg = loadConfig();

const domains = flags.only
  ? [String(flags.only)]
  : [cfg.site.domain, ...cfg.competitors];

const rowsEach = Math.min(Number(flags.limit ?? cfg.limits.rowsPerDomain), MAX_ROWS[cfg.source]);
const estimate = domains.length * rowsEach * PRICE_PER_ROW[cfg.source];

console.log(`source ${cfg.source}, ${domains.length} domain(s), up to ${rowsEach} rows each`);
console.log(`estimated cost $${estimate.toFixed(2)} at $${PRICE_PER_ROW[cfg.source]}/row\n`);

if (flags['dry-run']) {
  for (const d of domains) console.log(`  would pull ${d}`);
  console.log('\nNothing was spent. Drop --dry-run to run it.');
  process.exit(0);
}

if (estimate > cfg.limits.maxSpendPerRunUsd) {
  console.error(
    `x estimate $${estimate.toFixed(2)} is over limits.maxSpendPerRunUsd ` +
    `($${cfg.limits.maxSpendPerRunUsd}).\n` +
    '  Lower limits.rowsPerDomain, cut competitors, or raise the ceiling deliberately.',
  );
  process.exit(1);
}

let spent = 0;
for (const domain of domains) {
  process.stdout.write(`  ${domain} ... `);
  try {
    const result = await pullOrganic(domain, cfg, { limit: rowsEach });
    spent += result.cost ?? result.rows.length * PRICE_PER_ROW[cfg.source];
    writeJson(dataPath('organic', `${domain.replace(/[^a-z0-9.-]/gi, '_')}.json`), result);
    console.log(`${result.rows.length} rows`);
  } catch (error) {
    // One domain with no coverage must not lose the domains after it. A young
    // site often returns nothing at all, and that is a finding, not a crash.
    console.log(`failed: ${error.message.split('\n')[0]}`);
  }
}

console.log(`\nSpent about $${spent.toFixed(2)}. Next: node scripts/classify.mjs`);

#!/usr/bin/env node
/**
 * Route every keyword to the one action that can actually help it.
 *
 *   node scripts/classify.mjs
 *
 * Free: it only reads what pull-organic already bought.
 *
 * The buckets exist because the wrong action on the right keyword does
 * nothing. Rewriting a title helps a page a search engine already ranks and
 * shows; spend that effort on a keyword sitting at position 40 and nothing
 * happens, because the page is barely being shown at all. Separating those two
 * cases is the whole job of this file.
 */
import { readdirSync, existsSync } from 'node:fs';
import { loadConfig, isBrandOrNoise } from '../lib/config.mjs';
import { dataPath, readJson, writeJson, today } from '../lib/io.mjs';

const cfg = loadConfig();
const dir = dataPath('organic');
if (!existsSync(dir)) {
  console.error('x no data/organic yet. Run: node scripts/pull-organic.mjs');
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const pulls = files.map((f) => readJson(dataPath('organic', f))).filter(Boolean);
const ours = pulls.find((p) => p.domain === cfg.site.domain);
const theirs = pulls.filter((p) => p.domain !== cfg.site.domain);

if (!ours) {
  console.error(`x no pull for ${cfg.site.domain}. Run pull-organic without --only first.`);
  process.exit(1);
}

const [, headHi] = cfg.bands.head;
const [, strikeHi] = cfg.bands.striking;
const [, depthHi] = cfg.bands.depth;

const ourKeywords = new Map();
for (const row of ours.rows) {
  const key = row.keyword.toLowerCase().trim();
  const seen = ourKeywords.get(key);
  if (!seen || row.position < seen.position) ourKeywords.set(key, row);
}

const rows = [];

// Our own keywords: what do we already hold, and what is one push away.
for (const [key, row] of ourKeywords) {
  if (isBrandOrNoise(key, cfg)) {
    rows.push({ ...row, action: 'noise', why: 'brand navigation or blocklisted' });
    continue;
  }
  if (row.volume < cfg.limits.minVolume) {
    rows.push({ ...row, action: 'noise', why: `volume ${row.volume} under the floor` });
    continue;
  }
  if (row.position <= headHi) {
    rows.push({ ...row, action: 'defend', why: `holds position ${row.position}` });
  } else if (row.position <= strikeHi) {
    rows.push({
      ...row,
      action: 'striking',
      why: `position ${row.position}, one push from the first page`,
    });
  } else if (row.position <= depthHi) {
    rows.push({
      ...row,
      action: 'build-depth',
      why: `position ${row.position}, ranked but not shown; needs depth and internal links`,
    });
  } else {
    rows.push({ ...row, action: 'noise', why: `position ${row.position}, out of reach for now` });
  }
}

// The gap: what competitors earn traffic from and we do not appear for at all.
// Computed locally from per domain pulls rather than bought as a packaged "gap
// report", because this way every gap row can name which competitor ranks
// where, and that provenance is what makes it auditable later.
const gap = new Map();
for (const pull of theirs) {
  const theirBrand = pull.domain.split('.')[0].toLowerCase();
  for (const row of pull.rows) {
    const key = row.keyword.toLowerCase().trim();
    if (ourKeywords.has(key)) continue;
    if (isBrandOrNoise(key, cfg)) continue;
    if (row.volume < cfg.limits.minVolume) continue;
    // A competitor's own brand term is their navigation, not our opportunity.
    if (key.includes(theirBrand)) continue;

    if (!gap.has(key)) {
      gap.set(key, {
        keyword: row.keyword,
        volume: row.volume,
        cpc: row.cpc,
        position: null,
        url: '',
        traffic: 0,
        action: 'write-new',
        why: '',
        rankedBy: [],
      });
    }
    gap.get(key).rankedBy.push({
      domain: pull.domain,
      position: row.position,
      url: row.url,
    });
  }
}

for (const row of gap.values()) {
  row.rankedBy.sort((a, b) => a.position - b.position);
  const best = row.rankedBy[0];
  const others = row.rankedBy.length - 1;
  row.why = `${best.domain} ranks ${best.position}` +
    (others > 0 ? `, and ${others} other competitor(s) rank too` : '');
  // Several competitors ranking for one term is the strongest available signal
  // that the category treats the question as real.
  row.confirmedBy = row.rankedBy.length;
  rows.push(row);
}

const order = { 'write-new': 0, striking: 1, 'build-depth': 2, defend: 3, noise: 4 };
rows.sort((a, b) =>
  order[a.action] - order[b.action] ||
  (b.confirmedBy ?? 0) - (a.confirmedBy ?? 0) ||
  b.volume - a.volume);

const counts = {};
for (const r of rows) counts[r.action] = (counts[r.action] ?? 0) + 1;

const intake = {
  generatedAt: today(),
  source: cfg.source,
  site: cfg.site.domain,
  competitors: theirs.map((p) => p.domain),
  bands: cfg.bands,
  minVolume: cfg.limits.minVolume,
  counts,
  // Kept as a first class number, not hidden: when a pull is capped at N rows
  // the gap is bounded by what that cap could see, and reporting it as "the
  // gap" without saying so overstates coverage.
  coverage: {
    rowsPulledPerDomain: cfg.limits.rowsPerDomain,
    note: 'Every count here is bounded by the row cap. A bigger cap finds more gap.',
  },
  rows,
};

writeJson(dataPath('intake.json'), intake);

console.log(`intake for ${cfg.site.domain}, ${rows.length} keyword(s)\n`);
for (const [action, n] of Object.entries(counts).sort((a, b) => order[a[0]] - order[b[0]])) {
  console.log(`  ${String(n).padStart(5)}  ${action}`);
}
console.log(`\nTop write-new candidates (bounded by a ${cfg.limits.rowsPerDomain} row cap per domain):\n`);
for (const row of rows.filter((r) => r.action === 'write-new').slice(0, 12)) {
  console.log(`  ${row.keyword}`);
  console.log(`      volume ${row.volume}, ${row.why}`);
}
console.log('\nWritten to data/intake.json');

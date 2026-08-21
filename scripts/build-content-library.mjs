#!/usr/bin/env node
/**
 * Fuse the search side and the answer side into one ranked list of targets.
 *
 *   node scripts/build-content-library.mjs
 *
 * Free.
 *
 * The two surfaces disagree often enough that reading either one alone puts
 * you on the wrong work. A topic flagged on both is the strongest signal this
 * pipeline can produce: the category treats the question as real, and you are
 * in none of the answers.
 *
 * `confirmation` is the field that matters:
 *
 *   both          ranked or gapped in search AND absent from AI answers
 *   ai-only       an answer engine names rivals for it, search says nothing yet
 *   search-only   a real keyword, no answer evidence either way
 */
import { dataPath, readJson, writeJson, today, die } from '../lib/io.mjs';

const intake = readJson(dataPath('intake.json'));
const opportunities = readJson(dataPath('geo-opportunities.json'));

if (!intake && !opportunities) {
  die('nothing to fuse yet.\n' +
      '  search side: node scripts/pull-organic.mjs && node scripts/classify.mjs\n' +
      '  answer side: node scripts/run-geo.mjs && node scripts/geo-opportunities.mjs');
}

const rows = new Map();
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const upsert = (topic) => {
  const key = norm(topic);
  if (!rows.has(key)) {
    rows.set(key, {
      topic,
      action: null,
      confirmation: null,
      evidence: { search: null, ai: null },
      mustJoinCitations: [],
      score: 0,
    });
  }
  return rows.get(key);
};

// Search side. The action carried here decides in-place work versus new work,
// and getting that wrong is the one irreversible mistake downstream.
for (const row of intake?.rows ?? []) {
  if (row.action === 'noise' || row.action === 'defend') continue;
  const entry = upsert(row.keyword);
  entry.action = row.action;
  entry.evidence.search = {
    action: row.action,
    volume: row.volume,
    position: row.position,
    url: row.url,
    why: row.why,
    rankedBy: row.rankedBy ?? [],
  };
  // Volume matters, but a term several competitors all rank for is better
  // evidence that the question is real than a big number on one row.
  entry.score += Math.log10(Math.max(row.volume, 10)) * 10;
  entry.score += (row.confirmedBy ?? 0) * 8;
  if (row.action === 'striking') entry.score += 25;   // cheapest possible win
  if (row.action === 'build-depth') entry.score += 12;
}

// Answer side.
for (const group of ['attack', 'uncited', 'defend']) {
  for (const row of opportunities?.groups?.[group] ?? []) {
    const entry = upsert(row.query);
    entry.evidence.ai = {
      group,
      reason: row.reason,
      competitors: row.competitors ?? [],
      cohort: row.cohort,
    };
    entry.mustJoinCitations = row.mustJoin ?? row.citedHosts ?? entry.mustJoinCitations;
    entry.score += group === 'attack' ? 30 : group === 'uncited' ? 18 : 10;
  }
}

for (const entry of rows.values()) {
  const hasSearch = Boolean(entry.evidence.search);
  const hasAi = Boolean(entry.evidence.ai);
  entry.confirmation = hasSearch && hasAi ? 'both' : hasAi ? 'ai-only' : 'search-only';
  if (entry.confirmation === 'both') entry.score += 40;
  if (!entry.action) entry.action = 'write-new';
}

const list = [...rows.values()].sort((a, b) => b.score - a.score);
list.forEach((row, i) => { row.rank = i + 1; });

writeJson(dataPath('content-library.json'), {
  generatedAt: today(),
  searchRun: intake?.generatedAt ?? null,
  answerRun: opportunities?.fromRun ?? null,
  counts: {
    both: list.filter((r) => r.confirmation === 'both').length,
    aiOnly: list.filter((r) => r.confirmation === 'ai-only').length,
    searchOnly: list.filter((r) => r.confirmation === 'search-only').length,
  },
  rows: list,
});

console.log(`content library, ${list.length} target(s)\n`);
console.log(`  ${list.filter((r) => r.confirmation === 'both').length} confirmed on both surfaces`);
console.log(`  ${list.filter((r) => r.confirmation === 'ai-only').length} answer engine only`);
console.log(`  ${list.filter((r) => r.confirmation === 'search-only').length} search only\n`);

for (const row of list.slice(0, 15)) {
  console.log(`  ${String(row.rank).padStart(3)}  ${row.confirmation.padEnd(12)} ${row.action.padEnd(12)} ${String(row.topic).slice(0, 62)}`);
}
console.log('\nWritten to data/content-library.json');
console.log('Take exactly ONE target per writing run, and take it from the top.');

#!/usr/bin/env node
/**
 * Turn one GEO run into work, split by the three ways you can be losing.
 *
 *   node scripts/geo-opportunities.mjs
 *
 * Free.
 *
 * Three gap types, never collapsed into one number, because each one needs a
 * different thing done to it:
 *
 *   brand-absent-competitor-present   a rival is named, we are not   attack
 *   mentioned-not-recommended         we are named, they get the nod  defend
 *   uncited                           we are named, our page is not   earn the citation
 *
 * A fourth group is counted and is deliberately NOT an opportunity: absent,
 * and no known competitor named either. Those answers usually point at an
 * official platform or explain a process without naming vendors, so there is
 * no slot to take. Counting them as attack words inflates the queue with work
 * that cannot be done. When this group is large, suspect the dictionary before
 * concluding the market is empty.
 */
import { dataPath, readJson, writeJson, die } from '../lib/io.mjs';

const run = readJson(dataPath('geo-latest.json'));
if (!run) die('no data/geo-latest.json. Run: node scripts/run-geo.mjs');

const groups = {
  attack: [],
  defend: [],
  uncited: [],
  noSlot: [],
};

for (const r of run.results ?? []) {
  if (r.error) continue;
  const rivals = (r.competitors ?? []).filter((c) => c.named || c.citations);

  if (!r.mentioned && rivals.length) {
    groups.attack.push({
      queryId: r.queryId,
      query: r.query,
      cohort: r.cohort,
      reason: 'brand-absent-competitor-present',
      competitors: rivals.map((c) => c.name),
      citedHosts: r.citedHosts ?? [],
    });
  } else if (!r.mentioned) {
    groups.noSlot.push({ queryId: r.queryId, query: r.query, cohort: r.cohort });
  } else {
    if (!r.recommended && rivals.length) {
      groups.defend.push({
        queryId: r.queryId,
        query: r.query,
        cohort: r.cohort,
        reason: 'mentioned-not-recommended',
        competitors: rivals.map((c) => c.name),
      });
    }
    if (!r.cited) {
      groups.uncited.push({
        queryId: r.queryId,
        query: r.query,
        cohort: r.cohort,
        reason: 'uncited',
        // The hosts that WERE cited are the acceptance test for the page you
        // are about to write: to be cited here it has to be at least as
        // useful to the answer as these already are.
        mustJoin: r.citedHosts ?? [],
      });
    }
  }
}

const payload = {
  fromRun: run.runAt,
  engine: run.engine,
  registryVersion: run.registryVersion,
  competitorDictionaryVersion: run.competitorDictionaryVersion,
  counts: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])),
  groups,
};

writeJson(dataPath('geo-opportunities.json'), payload);

console.log(`from the run of ${String(run.runAt).slice(0, 10)}, engine ${run.engine}\n`);
console.log(`  ${String(groups.attack.length).padStart(4)}  attack    a rival is named and we are not`);
console.log(`  ${String(groups.defend.length).padStart(4)}  defend    we are named, the nod goes elsewhere`);
console.log(`  ${String(groups.uncited.length).padStart(4)}  uncited   we are named, our page is not a source`);
console.log(`  ${String(groups.noSlot.length).padStart(4)}  no slot   absent, and no known competitor named either`);

if (groups.noSlot.length > groups.attack.length) {
  console.log('\n! The no-slot group is larger than the attack group. Before reading that');
  console.log('  as an empty market, check the competitor dictionary: a short dictionary');
  console.log('  produces exactly this shape. node scripts/geo-dictionary.mjs --min 2');
}

console.log('\nTop attack questions:\n');
for (const row of groups.attack.slice(0, 12)) {
  console.log(`  ${String(row.query).slice(0, 88)}`);
  console.log(`      named instead: ${row.competitors.join(', ') || 'unknown'}`);
}
console.log('\nWritten to data/geo-opportunities.json. Next: node scripts/geo-ledger.mjs');

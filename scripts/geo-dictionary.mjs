#!/usr/bin/env node
/**
 * Harvest the products an answer engine actually names, so the competitor
 * dictionary is measured rather than guessed.
 *
 *   node scripts/geo-dictionary.mjs --min 2
 *
 * Free: it re-reads the answers already stored by run-geo.
 *
 * The population an AI answer names is not the population a keyword tool calls
 * your competitors. Tools that never appear in a keyword gap turn up in answer
 * after answer, and the reverse happens too. So: run first, harvest what was
 * named, have a person confirm it, then freeze and version it.
 *
 * This writes a DRAFT only. Promoting a draft to the live dictionary is a
 * human decision, because the threshold below is not a tuning knob, it is a
 * decision about what counts as competition. Set it too high and answers come
 * back as "absent, and nobody else was named either", which reads like an
 * empty market and is usually a short dictionary.
 */
import { loadConfig } from '../lib/config.mjs';
import { hostOf } from '../lib/detect.mjs';
import { argv, dataPath, readJson, writeJson, die } from '../lib/io.mjs';

const { flags } = argv();
const cfg = loadConfig();
const MIN = Number(flags.min ?? 2);

const run = readJson(dataPath('geo-latest.json'));
if (!run) die('no data/geo-latest.json. Run: node scripts/run-geo.mjs');

const existing = readJson(dataPath('competitor-dictionary.json'), { version: 0, entries: [] });
const known = new Set(existing.entries.map((e) => e.domain).filter(Boolean));

const ourDomain = cfg.site.domain.toLowerCase();
const ignore = new Set([
  ...(cfg.outreach.platformHosts ?? []),
  ...(cfg.outreach.directoryHosts ?? []),
  'wikipedia.org', 'reddit.com', 'github.com', 'youtube.com', 'medium.com',
  'linkedin.com', 'stackoverflow.com', 'news.ycombinator.com', 'quora.com',
]);

/**
 * Cited hosts are the reliable half of the harvest: a domain in a source list
 * is a fact, where a capitalised word in prose is a guess about what is a
 * product name.
 */
const hosts = new Map();
for (const result of run.results ?? []) {
  if (result.error) continue;
  const seenHere = new Set();
  for (const url of result.citations ?? []) {
    const host = hostOf(url);
    if (!host || host === ourDomain || host.endsWith(`.${ourDomain}`)) continue;
    if (ignore.has(host)) continue;
    if (seenHere.has(host)) continue;
    seenHere.add(host);

    const row = hosts.get(host) ?? { host, answers: 0, questions: [] };
    row.answers += 1;
    row.questions.push(result.query ?? result.queryId);
    hosts.set(host, row);
  }
}

const candidates = [...hosts.values()]
  .filter((r) => r.answers >= MIN && !known.has(r.host))
  .sort((a, b) => b.answers - a.answers);

const nameFromHost = (host) => {
  const base = host.replace(/\.(com|io|ai|dev|co|net|org|app|co\.uk)$/, '').split('.').pop();
  return base.charAt(0).toUpperCase() + base.slice(1);
};

const draft = {
  version: (existing.version ?? 0) + 1,
  draftedAt: new Date().toISOString(),
  threshold: MIN,
  note: 'DRAFT. Read every row, delete what is not a competitor, add aliases, ' +
        'then save as competitor-dictionary.json and rerun redetect.mjs.',
  entries: [
    ...existing.entries,
    ...candidates.map((c) => ({
      name: nameFromHost(c.host),
      aliases: [],
      domain: c.host,
      firstSeenIn: c.answers,
      evidence: c.questions.slice(0, 2),
      confirmed: false,
    })),
  ],
};

const out = writeJson(dataPath('competitor-dictionary.draft.json'), draft);

console.log(`${hosts.size} non-platform host(s) cited across the run`);
console.log(`${candidates.length} new candidate(s) at --min ${MIN}, ${existing.entries.length} already known\n`);
for (const c of candidates.slice(0, 30)) {
  console.log(`  ${c.host.padEnd(28)} named in ${c.answers} answer(s)`);
  console.log(`      e.g. "${String(c.questions[0]).slice(0, 82)}"`);
}
console.log(`\nDraft written to ${out}`);
console.log('Nothing is live until a person confirms it. Then: node scripts/redetect.mjs');

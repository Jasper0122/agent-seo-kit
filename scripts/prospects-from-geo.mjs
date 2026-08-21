#!/usr/bin/env node
/**
 * Turn the GEO run's citation list into a ranked backlink prospect list.
 *
 *   node scripts/prospects-from-geo.mjs --min 2
 *   node scripts/prospects-from-geo.mjs --min 2 --authority   (paid, see below)
 *
 * Why start here rather than with a search for "<topic> blogs".
 *
 * A link is worth most on a page an answer engine already reads. The GEO run
 * recorded which hosts were cited when your own registry questions were
 * answered, so this list is not a guess about authority: it is a record of
 * what got cited on the exact questions you care about. A generic search
 * returns a similar looking set with none of that evidence attached.
 *
 * Rows are ranked by how often you were ABSENT from the answers they were
 * cited in. A host cited on a question where two rivals were named and you
 * were not is a page actively shaping an answer you are losing.
 *
 * --authority adds Domain Rating and referring domain counts for the top
 * prospects in one batched call. Paid, per row. Skip it until the list is
 * short enough that a measured number changes a decision.
 */
import { loadConfig } from '../lib/config.mjs';
import { run, costMeter } from '../lib/monid.mjs';
import { hostOf } from '../lib/detect.mjs';
import { argv, dataPath, readJson, writeJson, die } from '../lib/io.mjs';

const { flags } = argv();
const cfg = loadConfig();
const MIN = Number(flags.min ?? 2);
const LIMIT = Number(flags.limit ?? 30);

const geo = readJson(dataPath('geo-latest.json'));
if (!geo) die('no data/geo-latest.json. Run: node scripts/run-geo.mjs');

const dictionary = readJson(dataPath('competitor-dictionary.json'), { entries: [] });
const competitorHosts = new Set(dictionary.entries.map((e) => e.domain).filter(Boolean));
const partnerHosts = new Set(cfg.outreach.partnerHosts ?? []);
const platformHosts = new Set([
  ...(cfg.outreach.platformHosts ?? []),
  'reddit.com', 'github.com', 'linkedin.com', 'youtube.com', 'stackoverflow.com',
  'medium.com', 'dev.to', 'x.com', 'twitter.com', 'facebook.com', 'quora.com',
  'news.ycombinator.com', 'producthunt.com', 'substack.com', 'wikipedia.org',
  'npmjs.com', 'pypi.org', 'gitlab.com', 'discord.com',
]);
const directoryHosts = new Set([
  ...(cfg.outreach.directoryHosts ?? []),
  'g2.com', 'capterra.com', 'trustpilot.com', 'getapp.com', 'softwareadvice.com',
  'alternativeto.net', 'saashub.com', 'slashdot.org', 'sourceforge.net',
]);

// A partner beats a competitor when a host is both: the relationship you
// already have is the more useful fact about them.
const classify = (host) => {
  if (partnerHosts.has(host)) return 'partner';
  if (competitorHosts.has(host)) return 'competitor';
  if (platformHosts.has(host)) return 'platform';
  if (directoryHosts.has(host)) return 'directory';
  return 'prospect';
};

const ourDomain = cfg.site.domain.toLowerCase();
const hosts = new Map();

for (const result of geo.results ?? []) {
  if (result.error) continue;
  const weAreAbsent = !result.mentioned;
  const seenHere = new Set();

  for (const url of result.citations ?? []) {
    const host = hostOf(url);
    if (!host || host === ourDomain || host.endsWith(`.${ourDomain}`)) continue;

    if (!hosts.has(host)) {
      hosts.set(host, { host, cites: 0, questions: new Set(), absentOn: 0, urls: new Set() });
    }
    const row = hosts.get(host);
    row.cites += 1;
    row.urls.add(url);
    if (!seenHere.has(host)) {
      seenHere.add(host);
      row.questions.add(result.query ?? result.queryId);
      if (weAreAbsent) row.absentOn += 1;
    }
  }
}

let rows = [...hosts.values()]
  .map((r) => ({
    host: r.host,
    kind: classify(r.host),
    cites: r.cites,
    questions: [...r.questions],
    absentOn: r.absentOn,
    urls: [...r.urls],
  }))
  .filter((r) => r.cites >= MIN)
  .sort((a, b) => b.absentOn - a.absentOn || b.cites - a.cites);

if (flags.authority) {
  const targets = rows
    .filter((r) => r.kind === 'partner' || r.kind === 'prospect')
    .slice(0, Math.min(LIMIT, 100));
  console.log(`measuring authority for ${targets.length} host(s), rough cost $${(targets.length * 0.063).toFixed(2)}\n`);
  const meter = costMeter();
  try {
    const record = await run('ahrefs', '/batch-analysis/batch-analysis', {
      body: {
        targets: targets.map((t) => ({ url: t.host, mode: 'domain' })),
        country: cfg.site.country,
      },
    }, { waitSeconds: 120 });
    meter.add(record);
    const byTarget = new Map();
    for (const row of record.output?.rows ?? []) {
      const key = hostOf(row.url ?? row.target ?? '') ?? row.url ?? row.target;
      byTarget.set(key, row);
    }
    rows = rows.map((r) => ({ ...r, authority: byTarget.get(r.host) ?? null }));
    console.log(`${meter.line()}\n`);
  } catch (error) {
    console.log(`authority lookup failed: ${error.message.split('\n')[0]}`);
    console.log('Ranking below is unaffected; it just carries no measured DR.\n');
  }
}

writeJson(dataPath('prospects.json'), {
  fromRun: geo.runAt,
  threshold: MIN,
  rows,
});

const show = (title, note, list, n = LIMIT) => {
  if (!list.length) return;
  console.log(`\n${title}`);
  console.log(note);
  console.log('');
  for (const r of list.slice(0, n)) {
    const dr = r.authority?.domain_rating != null ? `  DR ${r.authority.domain_rating}` : '';
    console.log(`  ${r.host}${dr}`);
    console.log(`      cited ${r.cites}x across ${r.questions.length} question(s); ` +
      `${r.absentOn} of those answers did not mention you`);
    console.log(`      e.g. "${String(r.questions[0] ?? '').slice(0, 84)}"`);
    console.log(`      ${r.urls[0]}`);
  }
};

console.log(`prospects from the GEO run of ${String(geo.runAt).slice(0, 10)}`);
console.log(`${hosts.size} host(s) cited; showing those cited at least ${MIN}x.`);

show(
  'PARTNERS AND EXISTING RELATIONSHIPS, warmest, start here',
  '  A contact and a reason to talk already exist. Where their own article on\n' +
  '  their category is cited and leaves you out, that is a gap in their\n' +
  '  coverage as much as in your link profile.',
  rows.filter((r) => r.kind === 'partner'),
  12,
);

show(
  'PROSPECTS, worth researching',
  '  Cited when your questions were answered, and not a rival, a platform or a\n' +
  '  directory. Every one still needs the workflow fit test before contact.',
  rows.filter((r) => r.kind === 'prospect'),
);

show(
  'COMPETITORS, do not pitch, read instead',
  '  They will not link to you. They are here because what they publish is what\n' +
  '  gets cited on your questions, which makes them a reading list and a measure\n' +
  '  of the gap.',
  rows.filter((r) => r.kind === 'competitor'),
  12,
);

show(
  'DIRECTORIES, a listing play and not an article pitch',
  '  Getting listed is worth doing and is a different process. Not a\n' +
  '  personalised article email.',
  rows.filter((r) => r.kind === 'directory'),
  10,
);

console.log('\nWritten to data/prospects.json');

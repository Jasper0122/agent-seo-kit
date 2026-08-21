#!/usr/bin/env node
/**
 * Put the question registry to an AI answer engine, store every answer, and
 * detect the three signals.
 *
 *   node scripts/run-geo.mjs --dry-run
 *   node scripts/run-geo.mjs
 *   node scripts/run-geo.mjs --limit 10 --cohort generic
 *
 * Why this exists at all: losing in an AI answer is invisible. In search, a
 * lost customer still leaves an impression with no click. In an answer they
 * leave nothing: no click, no referrer, no log line. The only way to know it
 * happened is to ask the questions yourself and write down what came back.
 *
 * Single threaded with a gap between calls and a retry on failure, because a
 * throttled row and a genuine absence look identical once they are written
 * down, and one of them is a lie.
 */
import { loadConfig } from '../lib/config.mjs';
import { run, costMeter } from '../lib/monid.mjs';
import { detect } from '../lib/detect.mjs';
import { argv, dataPath, readJson, writeJson, sleep, stamp, die } from '../lib/io.mjs';

const { flags } = argv();
const cfg = loadConfig();

const registry = readJson(dataPath('geo-registry.json'));
if (!registry) {
  die('no data/geo-registry.json.\n' +
      '  cp data/geo-registry.example.json data/geo-registry.json and put your own\n' +
      '  questions in it. Questions come from real people, never from a model.');
}

const dictionary = readJson(dataPath('competitor-dictionary.json'), { version: 0, entries: [] });

let queries = registry.queries ?? [];
if (flags.cohort) queries = queries.filter((q) => q.cohort === flags.cohort);
if (flags.limit) queries = queries.slice(0, Number(flags.limit));

const PRICE_HINT = 0.0121; // blockrun.ai exa/answer at the time of writing
console.log(`registry v${registry.version ?? '?'}, ${queries.length} question(s)`);
console.log(`engine ${cfg.geo.provider}${cfg.geo.endpoint}`);
console.log(`rough cost $${(queries.length * PRICE_HINT).toFixed(2)}, roughly ` +
  `${Math.ceil(queries.length * (cfg.geo.gapSeconds + 6) / 60)} min\n`);

if (flags['dry-run']) {
  for (const q of queries.slice(0, 10)) console.log(`  [${q.cohort}] ${q.query}`);
  if (queries.length > 10) console.log(`  ... and ${queries.length - 10} more`);
  console.log('\nNothing was spent. Drop --dry-run to run it.');
  process.exit(0);
}

const meter = costMeter();
const results = [];

for (const [index, q] of queries.entries()) {
  process.stdout.write(`  ${String(index + 1).padStart(3)}/${queries.length} ${q.id} ... `);
  let record = null, error = null;

  for (let attempt = 0; attempt < 3 && !record; attempt++) {
    try {
      record = await run(cfg.geo.provider, cfg.geo.endpoint, {
        body: { query: q.query },
      }, { waitSeconds: 90 });
    } catch (e) {
      error = e.message.split('\n')[0];
      // Back off rather than retry immediately: the usual cause is throttling,
      // and hammering it turns a slow run into a run full of false zeroes.
      await sleep((attempt + 1) * 5000);
    }
  }

  if (!record) {
    console.log(`error (${error})`);
    // Recorded as an error, never as an absence. A failed row must not be
    // counted in any denominator.
    results.push({ queryId: q.id, cohort: q.cohort, error });
    continue;
  }

  meter.add(record);
  const answer = record.output?.answer ?? record.output?.text ?? '';
  const citations = record.output?.citations ?? record.output?.sources ?? [];
  const signals = detect(answer, citations, cfg, dictionary.entries);

  results.push({
    queryId: q.id,
    cohort: q.cohort,
    query: q.query,
    answer,
    runId: record.runId,
    ...signals,
  });

  const marks = [
    signals.mentioned ? 'mentioned' : null,
    signals.cited ? 'cited' : null,
    signals.recommended ? 'recommended?' : null,
  ].filter(Boolean);
  console.log(marks.length ? marks.join(' + ') : 'absent');

  await sleep(cfg.geo.gapSeconds * 1000);
}

// Cohorts are reported separately, always. A brand defence question names the
// brand almost by construction; averaged in with generic questions it produces
// a healthy looking number that describes nothing that happened.
const byCohort = {};
for (const r of results) {
  if (r.error) continue;
  const c = (byCohort[r.cohort] ??= { n: 0, mentioned: 0, recommended: 0, cited: 0 });
  c.n += 1;
  if (r.mentioned) c.mentioned += 1;
  if (r.recommended) c.recommended += 1;
  if (r.cited) c.cited += 1;
}

const payload = {
  runAt: new Date().toISOString(),
  engine: `${cfg.geo.provider}${cfg.geo.endpoint}`,
  site: cfg.site.domain,
  // The comparability contract. A trend only means something when the same
  // questions ran against the same engine under the same parser, so every run
  // carries the versions that decided its numbers.
  registryVersion: registry.version ?? null,
  competitorDictionaryVersion: dictionary.version ?? 0,
  detectorVersion: 1,
  country: cfg.site.country,
  cost: meter.usd,
  errors: results.filter((r) => r.error).length,
  byCohort,
  results,
};

writeJson(dataPath('geo-latest.json'), payload);
writeJson(dataPath('geo-runs', `${stamp()}.json`), payload);

console.log('\nBy cohort, with denominators:\n');
for (const [cohort, c] of Object.entries(byCohort)) {
  console.log(`  ${cohort} (n=${c.n})`);
  console.log(`      mentioned ${c.mentioned}   cited ${c.cited}   recommended ${c.recommended} (heuristic, verify by hand)`);
}
console.log(`\n${payload.errors} error row(s), excluded from every denominator above.`);
console.log(`Spent ${meter.line()}. Written to data/geo-latest.json`);

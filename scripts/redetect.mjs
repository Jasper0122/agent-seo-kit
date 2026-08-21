#!/usr/bin/env node
/**
 * Re-read the stored answers with the current dictionary and detector.
 *
 *   node scripts/redetect.mjs
 *   node scripts/redetect.mjs --file data/geo-runs/2026-01-01T00-00-00-000Z.json
 *
 * Free, and it is the only honest way to compare two parsing decisions: the
 * input is held fixed by construction, so any change in the numbers is the
 * change you made and not a different day of the internet.
 */
import { loadConfig } from '../lib/config.mjs';
import { detect } from '../lib/detect.mjs';
import { argv, dataPath, readJson, writeJson, die, ROOT } from '../lib/io.mjs';
import { join, isAbsolute } from 'node:path';

const { flags } = argv();
const cfg = loadConfig();

const file = flags.file
  ? (isAbsolute(String(flags.file)) ? String(flags.file) : join(ROOT, String(flags.file)))
  : dataPath('geo-latest.json');

const run = readJson(file);
if (!run) die(`no run at ${file}`);

const dictionary = readJson(dataPath('competitor-dictionary.json'), { version: 0, entries: [] });

const before = { mentioned: 0, cited: 0, recommended: 0, n: 0 };
const after = { mentioned: 0, cited: 0, recommended: 0, n: 0 };

const results = run.results.map((r) => {
  if (r.error) return r;
  before.n += 1;
  if (r.mentioned) before.mentioned += 1;
  if (r.cited) before.cited += 1;
  if (r.recommended) before.recommended += 1;

  const signals = detect(r.answer, r.citations ?? [], cfg, dictionary.entries);
  after.n += 1;
  if (signals.mentioned) after.mentioned += 1;
  if (signals.cited) after.cited += 1;
  if (signals.recommended) after.recommended += 1;

  return { ...r, ...signals };
});

const byCohort = {};
for (const r of results) {
  if (r.error) continue;
  const c = (byCohort[r.cohort] ??= { n: 0, mentioned: 0, recommended: 0, cited: 0 });
  c.n += 1;
  if (r.mentioned) c.mentioned += 1;
  if (r.recommended) c.recommended += 1;
  if (r.cited) c.cited += 1;
}

writeJson(file, {
  ...run,
  results,
  byCohort,
  competitorDictionaryVersion: dictionary.version ?? 0,
  redetectedAt: new Date().toISOString(),
});

console.log(`re-read ${before.n} stored answer(s) with dictionary v${dictionary.version ?? 0}\n`);
console.log('  signal        before   after');
for (const key of ['mentioned', 'cited', 'recommended']) {
  const delta = after[key] - before[key];
  console.log(`  ${key.padEnd(13)} ${String(before[key]).padStart(5)}   ${String(after[key]).padStart(5)}` +
    (delta ? `   (${delta > 0 ? '+' : ''}${delta})` : ''));
}
console.log('\nA changed detector or dictionary starts a NEW baseline. Do not continue');
console.log('a trend line across the change: say which version produced which number.');

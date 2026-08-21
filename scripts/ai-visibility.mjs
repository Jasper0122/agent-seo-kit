#!/usr/bin/env node
/**
 * Count how often eight AI assistants cite you, and cite each competitor.
 *
 *   node scripts/ai-visibility.mjs --dry-run
 *   node scripts/ai-visibility.mjs
 *   node scripts/ai-visibility.mjs --target example.com
 *
 * One call per target, covering ChatGPT, Microsoft Copilot, Gemini, Google AI
 * Mode, Google AI Overviews, Grok and Perplexity. This is the cross check on
 * run-geo, and the two answer different questions:
 *
 *   run-geo         YOUR questions, one engine, the exact answers stored so
 *                   you can read why you lost. Cheap, repeatable, auditable.
 *   this script     somebody else's crawl, eight surfaces, a count and no
 *                   answers. Broad, and it cannot tell you what to fix.
 *
 * Use it for share of answer against rivals and to catch the case where you
 * look fine on the one engine you probe and invisible everywhere else. Do not
 * use it as a substitute for reading answers.
 *
 * Requires the Ahrefs entitlement on your Monid workspace. Priced per returned
 * row, so a competitor sweep is a real decision: check the quote first.
 */
import { loadConfig } from '../lib/config.mjs';
import { run, costMeter } from '../lib/monid.mjs';
import { argv, dataPath, writeJson, today, sleep } from '../lib/io.mjs';

const { flags } = argv();
const cfg = loadConfig();

const targets = flags.target
  ? [String(flags.target)]
  : [cfg.site.domain, ...cfg.competitors];

const PRICE_HINT = 0.36;
console.log(`${targets.length} target(s), rough cost $${(targets.length * PRICE_HINT).toFixed(2)}\n`);

if (flags['dry-run']) {
  for (const t of targets) console.log(`  would check ${t}`);
  console.log('\nNothing was spent. Drop --dry-run to run it.');
  process.exit(0);
}

/**
 * Pull one citation count per assistant out of the response.
 *
 * `google_ai_overviews_keywords` is dropped on purpose: it counts the keywords
 * whose AI Overview cites you, not the answers, so adding it to the others
 * inflates the total by a different unit and makes every comparison wrong.
 */
function assistants(data) {
  const out = {};
  for (const [name, value] of Object.entries(data ?? {})) {
    if (name.endsWith('_keywords')) continue;
    const n = typeof value === 'number' ? value : value?.citations;
    if (typeof n === 'number') out[name] = n;
  }
  return out;
}

const meter = costMeter();
const rows = [];

for (const target of targets) {
  process.stdout.write(`  ${target} ... `);
  try {
    const record = await run('ahrefs', '/site-explorer/ai-responses-count', {
      queryParams: { target, date: today(), country: cfg.site.country, mode: 'subdomains' },
    }, { waitSeconds: 90 });
    meter.add(record);

    const data = record.output?.data ?? record.output?.rows?.[0]?.data ?? record.output ?? {};
    const perAssistant = assistants(data);
    const total = Object.values(perAssistant).reduce((sum, n) => sum + n, 0);

    rows.push({ target, isUs: target === cfg.site.domain, total, perAssistant, raw: data });
    console.log(`${total} citation(s) across ${Object.keys(perAssistant).length} assistant(s)`);
    for (const [name, n] of Object.entries(perAssistant).sort((a, b) => b[1] - a[1])) {
      console.log(`      ${String(n).padStart(6)}  ${name}`);
    }
  } catch (error) {
    const first = error.message.split('\n')[0];
    console.log(`failed: ${first}`);
    if (/403|permission|not enabled|forbidden/i.test(first)) {
      console.log('      This endpoint needs the Ahrefs entitlement on your workspace. See the README.');
    }
    rows.push({ target, error: first });
  }
  await sleep(1000);
}

writeJson(dataPath('ai-visibility.json'), {
  checkedAt: new Date().toISOString(),
  country: cfg.site.country,
  cost: meter.usd,
  rows,
});

const scored = rows.filter((r) => !r.error);
if (scored.length > 1) {
  const pool = scored.reduce((sum, r) => sum + r.total, 0);
  console.log('\nShare of the citations counted here:\n');
  for (const r of [...scored].sort((a, b) => b.total - a.total)) {
    const share = pool ? ((r.total / pool) * 100).toFixed(1) : '0.0';
    console.log(`  ${String(share).padStart(5)}%  ${r.target}${r.isUs ? '  (you)' : ''}`);
  }
  console.log('\nThat share is only over the domains you listed, not the whole market.');
}

console.log(`\nSpent ${meter.line()}. Written to data/ai-visibility.json`);
console.log('A count is a scoreboard, not a diagnosis. To learn WHY a surface');
console.log('does not name you, read the stored answers from run-geo.mjs.');

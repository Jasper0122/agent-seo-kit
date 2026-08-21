#!/usr/bin/env node
/**
 * The question bank for one keyword: what real people actually ask about it.
 *
 *   node scripts/questions-for.mjs "web scraping api" --dry-run
 *   node scripts/questions-for.mjs "web scraping api"
 *   node scripts/questions-for.mjs "web scraping api" --max 15
 *
 * Three ranked sources, best first:
 *
 *   reddit    titles in the asker's own words. Buy these; they are the only
 *             source that gives you the phrasing rather than your phrasing.
 *   geo       registry questions where the engine answered naming a rival and
 *             not you. Free, already stored, and the highest intent rows here.
 *   keywords  terms from the intake. Real demand, but they are keywords, so
 *             any rewrite into a question is a guess and is labelled one.
 *
 * Why this runs before the brief and not after: the library decides what to
 * write about, this decides what the article has to answer. A heading with no
 * row from this output is a section shaped like an answer to nothing, which is
 * the exact thing that matches no query and gets quoted by nobody.
 */
import { loadConfig } from '../lib/config.mjs';
import { run, costMeter } from '../lib/monid.mjs';
import { argv, dataPath, readJson, writeJson, die } from '../lib/io.mjs';

const { flags, positional } = argv();
const keyword = positional.join(' ').trim();
if (!keyword) die('usage: node scripts/questions-for.mjs "<keyword>" [--max 15] [--dry-run]');

const cfg = loadConfig();
const MAX = Number(flags.max ?? 15);

const out = [];

// 1. GEO registry rows about this topic, free, and the strongest intent signal
//    available: somebody asked it and the answer named somebody else.
const ledger = readJson(dataPath('geo-ledger.json'), { rows: [] });
const words = keyword.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
for (const row of ledger.rows) {
  const q = String(row.query ?? '').toLowerCase();
  const overlap = words.filter((w) => q.includes(w)).length;
  if (!overlap) continue;
  out.push({
    question: row.query,
    source: 'geo',
    url: '',
    overlap,
    note: `${row.reason}${row.competitors?.length ? `, named instead: ${row.competitors.join(', ')}` : ''}`,
  });
}

// 2. Keyword rows from the intake, free. Labelled, because a keyword is not a
//    question and turning one into a question is our wording, not theirs.
const intake = readJson(dataPath('intake.json'), { rows: [] });
for (const row of intake.rows ?? []) {
  if (row.action === 'noise') continue;
  const k = String(row.keyword).toLowerCase();
  const overlap = words.filter((w) => k.includes(w)).length;
  if (!overlap || k === keyword.toLowerCase()) continue;
  out.push({
    question: row.keyword,
    source: 'keyword',
    url: row.url ?? '',
    overlap,
    note: `volume ${row.volume}, ${row.action}. A keyword, not a question: any rewrite is a guess.`,
  });
}

// 3. Reddit, paid. The only source that returns the asker's own phrasing.
if (flags['dry-run']) {
  console.log(`would search Reddit for "${keyword}", up to ${MAX} posts`);
  console.log('rough cost: a flat fee plus a few tenths of a cent per post\n');
} else {
  const meter = costMeter();
  try {
    const record = await run('apify', '/trudax/reddit-scraper-lite', {
      body: {
        searches: [keyword],
        searchPosts: true,
        searchComments: false,
        searchCommunities: false,
        searchUsers: false,
        skipComments: true,
        sort: 'relevance',
        time: 'year',
        maxItems: MAX,
        maxPostCount: MAX,
      },
    }, { waitSeconds: 120 });
    meter.add(record);

    const items = Array.isArray(record.output) ? record.output : (record.output?.items ?? []);
    // The actor returns communities and users alongside posts. Only a post
    // title is somebody asking something.
    const posts = items.filter((i) => !i.dataType || i.dataType === 'post');
    for (const post of posts) {
      const title = post.title ?? post.name;
      if (!title) continue;
      const t = String(title).toLowerCase();
      out.push({
        question: title,
        source: 'reddit',
        url: post.url ?? post.link ?? '',
        overlap: words.filter((w) => t.includes(w)).length,
        note: String(post.communityName ?? post.subreddit ?? 'r/?').replace(/^(r\/)?/, 'r/') +
          (post.numberOfComments != null ? `, ${post.numberOfComments} comments` : ''),
      });
    }
    console.log(`reddit: ${posts.length} post(s), ${meter.line()}\n`);
  } catch (error) {
    console.log(`reddit search failed: ${error.message.split('\n')[0]}`);
    console.log('The free sources below still stand.\n');
  }
}

// A row covering the whole topic outranks a partial one. Among equal partials,
// a busy thread outranks a quiet one, but read the list rather than taking the
// top N: a question you cannot answer well is worse than one you leave out.
const rank = { reddit: 0, geo: 1, keyword: 2 };
out.sort((a, b) => b.overlap - a.overlap || rank[a.source] - rank[b.source]);

// The same thread is often cross posted. One question asked twice is still one
// question, and counting it twice makes a topic look busier than it is.
const seen = new Set();
const questions = out.filter((q) => {
  const key = String(q.question).toLowerCase().replace(/\s+/g, ' ').trim();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const payload = { keyword, generatedAt: new Date().toISOString(), questions };
writeJson(dataPath('questions', `${keyword.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`), payload);

console.log(`questions for "${keyword}" (${questions.length})\n`);
for (const q of questions.slice(0, 25)) {
  console.log(`  [${q.source}] ${q.question}`);
  console.log(`      ${q.note}${q.url ? `  ${q.url}` : ''}`);
}

if (questions.filter((q) => q.source === 'reddit').length === 0) {
  console.log('\n! No real phrasing came back for this topic. That is a finding, not an');
  console.log('  obstacle to write around: check whether the demand is real before drafting.');
}

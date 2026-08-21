#!/usr/bin/env node
/**
 * Outreach tracker.
 *
 *   node scripts/tracker.mjs list [--state sent]
 *   node scripts/tracker.mjs add --company "Acme" --url acme.com \
 *        --article "https://acme.com/guide/thing" [--email a@acme.com]
 *   node scripts/tracker.mjs set BL001 --email a@acme.com --emailSource "about page"
 *   node scripts/tracker.mjs state BL001 sent --message-id <id>
 *   node scripts/tracker.mjs show BL001
 *
 * The point of this file is that the state rules are ENFORCED rather than
 * remembered. `sent` cannot be recorded without a message id from a real send
 * event, and a placement cannot be marked live without an evidence URL. Every
 * transition is stamped and appended to the row's history, so "did we already
 * email them" is answerable from data instead of from memory.
 *
 * A finished draft is not a send. That distinction is the reason the guard
 * exists: an agent that drafts an email and then records it as sent will
 * cheerfully tell you next week that the prospect never replied.
 */
import { dataPath, readJson, writeJson, argv, today, die } from '../lib/io.mjs';

const FILE = dataPath('outreach-tracker.json');

const STATES = [
  'not_contacted', 'research_complete', 'draft_ready', 'approved_to_send',
  'sent', 'replied', 'interested', 'materials_requested', 'materials_received',
  'our_content_drafting', 'our_placement_live', 'their_placement_live',
  'verified', 'declined', 'bounced', 'closed',
];

const NEEDS_MESSAGE_ID = new Set(['sent']);
const NEEDS_NOTE = new Set(['our_placement_live', 'their_placement_live', 'verified', 'bounced']);

const db = readJson(FILE, { version: 1, updatedAt: null, rows: [] });
const save = () => writeJson(FILE, { ...db, updatedAt: today() });

const { flags, positional } = argv();
const cmd = positional[0] ?? 'list';
const find = (id) => db.rows.find((r) => r.id.toLowerCase() === String(id ?? '').toLowerCase());

if (cmd === 'add') {
  if (!flags.company) die('--company is required');
  if (!flags.article) die('--article is required: the exact target article URL, never a homepage');

  const id = 'BL' + String(db.rows.length + 1).padStart(3, '0');
  db.rows.push({
    id,
    company: flags.company,
    domain: flags.url ?? '',
    tier: flags.tier ?? 'prospect',
    score: flags.score ? Number(flags.score) : null,
    targetArticle: flags.article,
    recipientName: flags.name ?? '',
    recipientEmail: flags.email ?? '',
    emailSourceType: flags.emailSource ?? '',
    emailVerifiedDate: null,
    subject: '',
    sentMessageId: null,
    contactStatus: 'research_complete',
    firstContactDate: null,
    replyStatus: null,
    followUpDue: null,
    materialsReceived: null,
    ourPlacement: null,
    theirPlacement: null,
    linkAttributes: null,
    verificationDate: null,
    notes: flags.note ?? '',
    history: [{ date: today(), state: 'research_complete', evidence: flags.note ?? 'row created' }],
  });
  save();
  console.log(`ok ${id}  ${flags.company}  [${flags.tier ?? 'prospect'}]  -> research_complete`);
  console.log(`   target: ${flags.article}`);
  process.exit(0);
}

if (cmd === 'state') {
  const [, id, state] = positional;
  if (!id || !state) die('usage: state <id> <state> [--message-id x] [--note "evidence"]');
  if (!STATES.includes(state)) die(`unknown state "${state}". One of:\n  ${STATES.join(', ')}`);

  const row = find(id);
  if (!row) die(`no row ${id}`);

  if (NEEDS_MESSAGE_ID.has(state) && !flags['message-id']) {
    die(`"${state}" requires --message-id from a real send event.\n` +
        '  A finished draft is not a send. This guard is the point of the file.');
  }
  if (NEEDS_NOTE.has(state) && !flags.note) {
    die(`"${state}" requires --note carrying the evidence, usually the live URL.`);
  }

  row.contactStatus = state;
  if (state === 'sent') {
    row.sentMessageId = flags['message-id'];
    row.firstContactDate ??= today();
  }
  if (state === 'our_placement_live') row.ourPlacement = flags.note;
  if (state === 'their_placement_live') row.theirPlacement = flags.note;
  if (state === 'verified') row.verificationDate = today();
  if (flags.note) row.notes = flags.note;

  row.history.push({ date: today(), state, evidence: flags.note ?? flags['message-id'] ?? '' });
  save();
  console.log(`ok ${row.id}  ${row.company}  -> ${state}`);
  process.exit(0);
}

if (cmd === 'set') {
  const row = find(positional[1]);
  if (!row) die('usage: set <id> --email x@y.com --emailSource "..." --name "..." --score 88');
  const map = {
    email: 'recipientEmail', emailSource: 'emailSourceType', name: 'recipientName',
    subject: 'subject', score: 'score', tier: 'tier', note: 'notes',
    verified: 'emailVerifiedDate', article: 'targetArticle',
    followUp: 'followUpDue', reply: 'replyStatus',
  };
  let n = 0;
  for (const [flag, field] of Object.entries(map)) {
    if (flags[flag] === undefined) continue;
    row[field] = flag === 'score' ? Number(flags[flag]) : flags[flag];
    n += 1;
  }
  if (!n) die('nothing to set');
  if (flags.email && !flags.emailSource) {
    console.log('! recording an address with no --emailSource. Source and date are');
    console.log('  required by the schema: an address with no provenance is a guess.');
  }
  save();
  console.log(`ok ${row.id} updated (${n} field(s))`);
  process.exit(0);
}

if (cmd === 'show') {
  const row = find(positional[1]);
  if (!row) die('no such row');
  console.log(JSON.stringify(row, null, 2));
  process.exit(0);
}

const rows = flags.state ? db.rows.filter((r) => r.contactStatus === flags.state) : db.rows;
if (!rows.length) {
  console.log(`No rows yet in ${FILE}`);
  console.log('Add one:  node scripts/tracker.mjs add --company "X" --url x.com --article "<exact article URL>"');
  process.exit(0);
}

console.log(`${rows.length} row(s) in ${FILE}\n`);
for (const r of rows) {
  const marks = [
    r.sentMessageId ? 'sent' : null,
    r.ourPlacement ? 'ours live' : null,
    r.theirPlacement ? 'theirs live' : null,
  ].filter(Boolean);
  console.log(`${r.id}  ${r.contactStatus.padEnd(20)} ${r.company}  [${r.tier}]${r.score ? ' ' + r.score : ''}`);
  console.log(`      ${r.targetArticle}`);
  if (marks.length) console.log(`      ${marks.join(' | ')}`);
}

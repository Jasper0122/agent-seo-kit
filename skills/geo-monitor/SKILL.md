---
name: geo-monitor
description: Run and read the GEO pipeline, which measures whether AI answer engines mention, recommend and cite your site. Puts a fixed registry of real user questions to an answer engine through the Monid tool layer, detects the three signals plus competitors, and turns "a rival is named and we are not" into a tracked work queue. Optionally cross checks against citation counts for eight assistants. Use when asked to run a GEO cycle, check AI answer visibility, find attack words, add questions to the registry, review the competitor dictionary, or interpret a mention/recommendation/citation rate. Triggers "GEO", "AI visibility", "attack words", "run a GEO cycle", "does ChatGPT mention us", "geo-monitor", "question registry", "AEO".
---

# GEO monitor

Sibling to `seo-intake`, same repo, same demand gate.

The reason this pipeline exists: **losing in an AI answer is invisible.** In
search, a lost customer still leaves an impression with no click. In an answer
they leave nothing at all: no click, no referrer, no log line. The only way to
know it happened is to ask the questions yourself and write down what came
back.

## The cycle

```bash
node scripts/run-geo.mjs --dry-run          # see the questions, spend nothing
node scripts/run-geo.mjs                    # registry -> engine -> answers + detection
node scripts/geo-dictionary.mjs --min 2     # harvest who was actually named (DRAFT only)
node scripts/redetect.mjs                   # re-read stored answers with a new dictionary, free
node scripts/geo-opportunities.mjs          # three gap types, counted separately
node scripts/geo-ledger.mjs                 # merge into the persistent, idempotent ledger
```

`run-geo` takes `--limit N` and `--cohort <name>`. It is single threaded with a
gap between calls and a backoff on failure, because **a throttled row and a
genuine absence look identical once they are written down**, and one of them is
a lie. Failures are recorded as errors and excluded from every denominator.

## The three signals, and which one you can actually move

| Signal | How it is read | How fast content moves it |
|---|---|---|
| `mentioned` | your brand name in the answer text | slow, depends on what the model knows |
| `recommended` | **heuristic**, see below | slower still |
| `cited` | your domain in the answer's sources | **fastest: this is what a good page changes** |

`cited` is the GEO equivalent of a backlink and the one thing publishing
directly affects. It is also why a page that renders empty to a crawler hurts
more here than in search: an unreadable page can never enter a citation list at
all.

## Never mix the cohorts

Brand defence questions name the brand almost by construction. Averaged with
generic questions they produce a healthy looking number that describes nothing
that happened.

Report the two lines separately, always, with denominators. The shape you
should expect on a young domain is a brand defence cohort at or near 100% and a
generic cohort at zero. That is not a bad measurement, that is the finding: the
engine knows you perfectly well when named, and never brings you up otherwise.

## The recommendation detector is a heuristic and it has been wrong before

The generous version of this detector, the one that counts a bare "use" or
"try" as endorsement, fires on ordinary description: "a pay per use tool",
"how to use it", "works with Python". Every one of those reads as a
recommendation to a naive matcher and none of them is one.

The version here uses a short cue list and a narrow window, and it still
overcounts. **Before reporting any non zero recommendation rate, read the
excerpts in `recommendationEvidence` and confirm them by hand.** A sentence
like "the strongest signal is that it has an active product site" describes
evidence of legitimacy, not endorsement, and only a person can see that.

`mentioned` and `cited` are deterministic and need no such care.

## The competitor dictionary cannot be guessed

The rivals a keyword tool names and the products an AI answer names are
different populations. Expect names that appear nowhere in your keyword gap to
show up in answer after answer, and expect some of your keyword rivals never to
be mentioned at all.

So: run first, harvest what was named, have a person confirm, then freeze and
version it. `geo-dictionary.mjs` only ever writes a `.draft.json`; promoting it
to `competitor-dictionary.json` is a human decision.

**The harvest threshold is a decision about what counts as competition, not a
tuning knob.** Set it high and a pile of answers come back as "absent, and
nobody else was named either", which reads like an empty market and is usually
a short dictionary. `geo-opportunities.mjs` warns when that group is larger
than the attack group, for exactly this reason.

After any dictionary change, run `redetect.mjs`. It re-reads the stored answers
for free, which is the only honest way to compare two parsing decisions: the
input is held fixed by construction, so any change in the numbers is the change
you made and not a different day of the internet.

## Three gap types, never one number

```
brand-absent-competitor-present   a rival is named, you are not     attack
mentioned-not-recommended         you are named, they get the nod   defend
uncited                           you are named, your page is not   earn the citation
```

A fourth group is tracked and is deliberately **not** an opportunity: **absent,
and no known competitor named either.** Those answers usually point at an
official platform API or explain a process without naming vendors, so there is
no slot to take. Counting them as attack words dilutes the real signal with
work that cannot be done.

The `mustJoin` hosts on an `uncited` row are the closest thing to an acceptance
test this pipeline produces: those pages were good enough to be a source for
that answer, so to join them yours has to be at least as useful. Read one or
two before writing anything.

## The ledger is the working record

`geo-ledger.mjs` merges each run into `data/geo-ledger.json` with two
guarantees, and the file is worthless without either:

- **Idempotent.** Keyed by question plus reason, so re-running never
  duplicates. What accumulates is `firstSeenRun`, `lastSeenRun` and `runsSeen`,
  which is how you tell a standing loss from a bad afternoon.
- **Human fields survive.** `status`, `owner`, `targetUrl`, `contentId`,
  `notes` and `verdict` are never overwritten by a merge; only measured fields
  refresh. Break this and the first re-run silently erases every editorial
  decision in the file.

A gap that stops appearing is marked `resolved`, not deleted: "we were absent
here and now we are not" is the only outcome evidence this system produces.
**Do not claim a published article caused it** without more than the sequence.

Edit a row by hand through the helper, so the guarantee holds:

```bash
node scripts/geo-ledger.mjs --list open
node scripts/geo-ledger.mjs --set GEO014 --status in-progress --owner me
```

## Comparability contract

A trend is only real when the same questions ran against the same engine under
the same parser. Every run records `registryVersion`, `detectorVersion`,
`competitorDictionaryVersion`, the engine and the country. **If any of those
change, start a new baseline rather than continuing the series.**

Keep the fixed core fixed. Explore with new rows, not by rewording old ones.

## The registry, and where questions come from

`data/geo-registry.json`. The chain is:

```
a real search term  ->  used as the search query on Reddit  ->  the real human
phrasing  ->  registry row
```

Not: a term reworded into a question by you. That step is lossy and it goes
wrong in a specific way, by reading a term in your own vocabulary instead of
the asker's. "bounce rate api" looks like phone validation and the real thread
is asking for an email lookup API to reduce bounce rates, which is a
deliverability problem with a different buyer entirely. Same words, different
market.

`node scripts/questions-for.mjs "<term>"` does the Reddit half for you.

`sourceType` records the distance travelled: `exact` (the asker's own words),
`naturalized` (your rewording), `synthesized` (your framing over evidenced
pain). Prefer `exact`, and keep the ratio honest: a registry that is mostly
`synthesized` is measuring your imagination.

`evidenceGrade` is confidence that people ask it, **not** commercial value.
That is what `priority` is for, which is why grade C plus P0 is a valid row.

## One surface is not the market

`run-geo` probes one answer engine. That is not every engine, and an engine's
API is not always the same retrieval as its consumer product. **Phrase every
finding with the surface named.**

For breadth, `ai-visibility.mjs` counts how often eight assistants cite you,
including ChatGPT, Gemini, Copilot, Grok, Perplexity and Google AI Overviews:

```bash
node scripts/ai-visibility.mjs --dry-run
node scripts/ai-visibility.mjs                 # you plus every competitor
```

The two answer different questions and neither replaces the other:

| | `run-geo` | `ai-visibility` |
|---|---|---|
| questions | yours, fixed, repeatable | somebody else's crawl |
| surfaces | one | eight |
| output | the full answers, stored | a count |
| tells you why you lost | yes, read the answer | no |
| cost | cents per question | dearer, one call per domain |

Use the count for share of answer against rivals and to catch the case where
you look fine on the one engine you probe and are invisible everywhere else.
Use the stored answers to learn what to fix. **A count is a scoreboard, not a
diagnosis.**

## What comes next

- `node scripts/build-content-library.mjs` fuses this with the search side. A
  topic flagged on both surfaces is the strongest target available.
- `node scripts/prospects-from-geo.mjs` turns the citation list into ranked
  backlink prospects, which is what `backlink-outreach` runs on.

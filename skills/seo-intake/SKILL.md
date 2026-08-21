---
name: seo-intake
description: Run and read the SEO intake pipeline. Pulls the organic keyword set for your domain and for each competitor through the Monid tool layer, computes the gap locally, and routes every keyword to the one action that can help it (write-new / striking / build-depth / defend / noise). Use when asked to refresh the SEO queue, decide what content to commission, check keyword gaps or rankings, or read the intake. Triggers "SEO queue", "keyword gap", "what should we write", "seo intake", "rankings", "competitor keywords".
---

# SEO intake

Project: your clone of `agent-seo-kit`. Every network call goes through Monid,
so there is one key, one balance, and one place the cost is visible.

Two halves feed one queue:

- **Where you stand**: the keywords your domain already ranks for, and at what
  position.
- **Where the gap is**: the keywords your competitors earn traffic from and you
  do not appear for at all, computed as a local set difference.

The queue is the product. Everything else exists to make it trustworthy.

## The rule the whole thing rests on

**Every topic must trace to evidence of real demand.** A keyword tool, a real
thread, first party research. Never a model's suggestion.

The moment a topic is invented, every number downstream becomes decoration and
the pipeline is manufacturing pages nobody wants. When asked to add a topic
with no keyword behind it, say so and offer to check its volume first rather
than adding it.

## Setup, once

This kit has no API keys of its own. It borrows Monid's, which is the point:
Semrush, Ahrefs, Reddit and the answer engine all arrive through one account
instead of four contracts.

1. Install the `monid` skill and its CLI, then add a key:

   ```bash
   npm install -g @monid-ai/cli@latest
   monid setup
   monid keys add -k <key from https://app.monid.ai/access/api-keys> -l main
   ```

2. Copy the config and fill it in:

   ```bash
   cp seo.config.example.json seo.config.json
   ```

   `site.domain`, `site.brandTerms` and `competitors` are the three fields that
   decide whether the output is useful. Get the competitors right by hand: see
   the traps below.

3. Check the paid reports are enabled on the workspace. Ahrefs and Semrush are
   entitlements, not public endpoints, so a fresh workspace can see them in
   `monid discover` and still be refused at run time. If a pull fails with a
   permission error, the README says who to ask; it is free to enable.

## Commands

```bash
node scripts/pull-organic.mjs --dry-run   # quote the cost, spend nothing
node scripts/pull-organic.mjs             # your domain + every competitor
node scripts/pull-organic.mjs --only competitor-a.com --limit 100
node scripts/classify.mjs                 # free: routes what was already bought
```

**Always run the dry quote first when the row cap moves.** These reports bill
per returned row, and `limits.rowsPerDomain` is the cost dial and nothing else.
The difference between the two sources is not small:

| source | per row | max per call | when |
|---|---|---|---|
| `ahrefs` | about 36x the Semrush rate | 100 | the default. Also the only one that can measure AI citations. |
| `semrush` | the cheap one | 10,000 | when you want depth and the row budget is what is stopping you. |

Switching is one field in the config. Nothing downstream knows which one ran.

## The five buckets, and why confusing two of them wastes money

| Bucket | Symptom | Action |
|---|---|---|
| `write-new` | No page of yours competes; a competitor ranks | Commission content |
| `striking` | You rank 4 to 20, one push from the first page | Rewrite the title, add depth, earn a link |
| `build-depth` | You rank 21 to 60, barely shown | Internal links, depth, references |
| `defend` | You rank 1 to 3 | Leave it alone unless it slips |
| `noise` | Brand, typo, under the volume floor, or out of reach | Ignore, deliberately |

**A title rewrite only helps a page that is already being shown.** Spend one on
a `build-depth` keyword and nothing happens, because almost nobody is seeing
the result to not click it. This is the most common wasted action in SEO and
the main reason the classifier exists.

The bands are in `seo.config.json` and they are **starting assumptions, not
measured truth**. Say so whenever you report a number that depends on one.

## Reading the data without fooling yourself

1. **Is the keyword above the noise floor?** One or two searches a month is a
   long tail accident, not a trend, and rate maths on tiny denominators is
   theatre. `limits.minVolume` exists for this.
2. **Is a brand term doing the work?** A young domain's organic footprint is
   mostly its own name. Left in, brand terms dominate every average and the
   pipeline writes articles for people who already found you. `brandTerms`
   catches the obvious ones and near typos; check the `noise` bucket by eye
   after the first run and add what leaked.
3. **How many competitors rank for it?** One competitor at position 9 is weak
   evidence. Three of them ranking is the category telling you the question is
   real. `confirmedBy` carries that count.
4. **Was the row cap the limiting factor?** Every count in `intake.json` is
   bounded by `rowsPerDomain`. `coverage` records it. Reporting the gap without
   saying what bounded it overstates coverage, every time.

## Known traps, all of them observed in real runs

- **Pull competitor keywords by traffic, not by volume.** Volume sorted returns
  the mega terms at the top of the category that nobody in a normal competitive
  position could rank for. Traffic sorted returns what is really sending them
  visitors. The adapter already sorts this way; do not "fix" it.

- **Scraping and tooling competitors drag adult and piracy traffic into the
  gap.** This is not hypothetical: a three domain test run put "xhamster
  downloader" and "erome downloader" in the top ten write-new rows, both real
  keywords a competitor really ranks for, and both worthless. Keep
  `excludeKeywordPatterns` populated and **eyeball the queue after any
  competitor change**. It is a blocklist, so it only catches what it knows.

- **Automatic competitor discovery does not work for a young domain.** The
  comparison data is not there, and what comes back is a directory site and a
  social network at near zero relevance. Hand pick the competitor list and keep
  it hand picked until the domain has a real footprint.

- **A competitor's own brand terms are their navigation, not your
  opportunity.** The classifier drops them. If a competitor's product name is
  also a common word, the drop is too aggressive, and that is worth knowing
  before you conclude they rank for nothing.

- **A domain property covers subdomains.** Docs, app and marketing pages can
  all appear. Read the ranking URL, not just the position, before deciding
  which page moved.

- **The Monid CLI cannot be driven through a shell on Windows.** The `.cmd`
  shim mangles JSON arguments and rewrites POSIX looking endpoint paths into
  drive letters. `lib/monid.mjs` resolves the package entry and runs it under
  `node` directly. Do not "simplify" that back to a shell call.

- **Fire and poll, never wait inline.** When an inline wait window closes on a
  run that is merely slow, the CLI exits non zero and the run id goes with it,
  so a job that was about to finish looks exactly like one that failed.

## When reporting results

- Name the source (`ahrefs` or `semrush`), the country, and the row cap.
- Separate measured from assumed. The bands are assumed until recalibrated.
- Give the cost of the pull.
- Do not present a `write-new` row as a brief. It still needs a human check on
  whether you can honestly serve that topic, and on which page it should send a
  reader to.

## What comes next

`classify.mjs` writes `data/intake.json`. On its own that is half a picture:
it says what search demand looks like and nothing about whether an AI answer
names you. Run `geo-monitor` for the other half, then
`node scripts/build-content-library.mjs` to fuse them. A topic confirmed on
both surfaces is the strongest target this pipeline can produce.

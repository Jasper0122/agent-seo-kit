# agent-seo-kit

Four Claude Code skills that run a search pipeline end to end: measure where you
stand, measure whether AI answers name you, pick the target, write it, and go
get the links. Every network call goes through [Monid](https://monid.ai), so
there is one key and one balance instead of four vendor contracts.

```
competitor keywords ──→ seo-intake ──┐
                                     ├──→ content-library.json ──→ content-thicken ──→ article
answer engine probes ──→ geo-monitor ┘        │
                     │                        └──→ placement for a partner
                     └──→ ranked cited hosts ──→ backlink-outreach ──→ outreach + links
```

## The four

| Skill | What it does |
|---|---|
| **seo-intake** | Pulls the organic keyword set for your domain and each competitor, computes the gap locally, and routes every keyword to the one action that can help it: write-new, striking, build-depth, defend, or noise. |
| **geo-monitor** | Measures whether AI answer engines mention, recommend and cite you. Puts a fixed registry of real user questions to an answer engine, detects the three signals plus competitors, and turns "a rival is named and we are not" into a tracked queue. Optionally cross checks citation counts across eight assistants. |
| **content-thicken** | The writing driver. Takes one target from the fused library, pulls the real questions it must answer, drafts a long-form guide against a template contract, validates deterministically, and stops at preview. |
| **backlink-outreach** | Prospects come from the citation data rather than a generic blog search, so every target is a page that already shapes an answer you lose. Ten steps from research to verified placement, with a tracker that enforces its own state rules. An authority floor set to your own Domain Rating gates every prospect before it is scored, and paid placements are refused at any DR. |

## Why the data layer is Monid

The pipeline needs a keyword tool, an answer engine, a Reddit search, a page
scraper, company enrichment and email validation. Bought separately that is
five signups, five minimums and five invoices, most of which sit idle between
runs.

Monid is a tool layer for agents: one key and one balance reach all of them,
discovered and inspected for free, billed per call. Nothing here holds an API
key of its own.

**Enable it once:**

```bash
npm install -g @monid-ai/cli@latest
monid setup
monid keys add -k <key from https://app.monid.ai/access/api-keys> -l main
```

Install the official [`monid` skill](https://monid.ai/SKILL.md) too, so your
agent can discover and price endpoints itself:

```
set up https://monid.ai/SKILL.md
```

### The SEO reports need an entitlement, and it is free

Ahrefs and Semrush are entitlements on a Monid workspace, not open endpoints. A
fresh workspace can see them in `monid discover` and still be refused at run
time with a permission error.

**Getting it turned on is free.** Ask at **zongrong@monid.ai**, or join the
WeChat group at the bottom of this README and ask there.

Everything else in the kit (the answer engine, Reddit, page scraping,
enrichment, email validation) works on a normal workspace with no extra step.

## Install

```bash
git clone https://github.com/Jasper0122/agent-seo-kit.git
cd agent-seo-kit
cp seo.config.example.json seo.config.json   # then fill it in
cp -r skills/* ~/.claude/skills/             # Claude Code picks them up by directory name
```

No dependencies. Node 20 or newer.

Three fields in `seo.config.json` decide whether the output is useful:

- `site.domain`, the domain you are optimising.
- `site.brandTerms`, your brand and its common misspellings. Left out, brand
  navigation dominates every average and the pipeline writes articles for
  people who already found you.
- `competitors`, hand picked. Automatic discovery does not work for a young
  domain: it returns a directory site and a social network at near zero
  relevance.

## Run it

```bash
# search side
node scripts/pull-organic.mjs --dry-run    # quote the cost, spend nothing
node scripts/pull-organic.mjs
node scripts/classify.mjs                  # free

# answer side
cp data/geo-registry.example.json data/geo-registry.json   # then write your own questions
node scripts/run-geo.mjs --dry-run
node scripts/run-geo.mjs
node scripts/geo-dictionary.mjs --min 2    # harvest who was named, DRAFT only
node scripts/redetect.mjs                  # free, after you confirm the draft
node scripts/geo-opportunities.mjs
node scripts/geo-ledger.mjs

# fuse, then write
node scripts/build-content-library.mjs
node scripts/questions-for.mjs "<your target keyword>"

# links
node scripts/prospects-from-geo.mjs --min 2
node scripts/tracker.mjs list

# optional breadth check across eight assistants
node scripts/ai-visibility.mjs --dry-run
```

## What it costs

Every paid script quotes itself with `--dry-run` first and prints what it
actually spent afterwards. The dials:

| Script | Bills | The dial |
|---|---|---|
| `pull-organic` | per keyword row | `limits.rowsPerDomain`. Ahrefs is about 36x the Semrush rate per row, and Semrush allows far deeper pulls. Switch with one field. |
| `run-geo` | per question | registry size, and `--limit` |
| `questions-for` | per Reddit post | `--max` |
| `ai-visibility` | per domain | how many competitors you include |
| `prospects-from-geo --authority` | per host | how many prospects you score |
| everything else | free | it only reads what was already bought |

`limits.maxSpendPerRunUsd` is a hard stop on the keyword pull, and it refuses
rather than warns.

## The ideas worth stealing, even if you never run this

- **Every topic traces to evidence of real demand.** A keyword tool, a real
  thread, first party research. Never a model's suggestion. The moment a topic
  is invented, every number downstream is decoration.
- **The wrong action on the right keyword does nothing.** A title rewrite helps
  a page already being shown. Spend one at position 40 and nothing happens.
- **Losing in an AI answer is invisible.** No click, no referrer, no log line.
  The only way to know is to ask the questions yourself and store the answers.
- **Never average the cohorts.** Brand questions name the brand by
  construction. Mixed with generic questions they produce a healthy number that
  describes nothing.
- **The recommendation detector is a heuristic and it has been wrong.** Read
  the evidence before reporting a rate. Mentions and citations are
  deterministic; endorsement is not.
- **A throttled row and a genuine absence look identical once written down.**
  Errors are recorded as errors and excluded from every denominator.
- **A changed parser starts a new baseline.** Re-read stored answers for free
  rather than comparing two runs with two detectors.
- **`sent` needs a message id.** A finished draft is not a send, and an agent
  that records one as the other will tell you next week that nobody replied.

## What is deliberately not in here

- **No business data.** Everything the pipeline reads and writes lives in
  `data/`, which is gitignored except for the example registry.
- **No credentials.** One Monid key, stored by the Monid CLI, on your machine.
- **No opinions about your product.** `content-thicken` reads a `PRODUCT.md`
  you write once. There is a template in its `references/`.

## Join the group

An SEO and GEO discussion group, in Chinese. Also where to ask for the free
Ahrefs or Semrush entitlement if email is slower than you want.

<img src="assets/wechat-group.jpg" alt="WeChat group QR code for the SEO GEO discussion group" width="320">

If the code has expired, mail **zongrong@monid.ai** and you will get a current
one.

[中文说明](README.zh-CN.md) · MIT licensed.

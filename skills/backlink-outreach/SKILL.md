---
name: backlink-outreach
description: Find, evaluate, pitch and track natural backlink and content partnerships. Prospects come from the GEO citation data rather than a generic blog search: the targets are the pages an AI already cites when answering your category questions. Research runs on the Monid tool layer (web search and scrape, authority metrics, company enrichment, email validation). Triggers "backlink", "link building", "outreach email", "who is citing us", "find link partners", "guest placement", "backlink-outreach". Research and drafting are always allowed; SENDING, PUBLISHING and PROMISING a link are never done without an explicit instruction.
---

# Backlink outreach

Build editorially useful partnerships. A backlink is the result of a content
collaboration that helps a reader, not a swap.

## The one rule that must never break

```
research -> evaluate -> draft -> approve -> send
         -> receive materials -> write -> review -> publish -> verify
```

**No stage advances without the user saying so.** In particular:

- "look at", "review", "draft a reply", "who should we contact" are read-only
  or draft-only. They never authorise a send.
- A finished draft is not permission to send it. Sending needs its own yes.
- Never promise placement, guarantee a followed link, or say you will
  "definitely include" a partner before editorial review.
- Never edit or publish a live article as part of an outreach commitment
  without explicit approval.

Editorial independence outranks the partnership. Mention a product when it
helps the reader, and the writing pipeline's honesty rules still apply: no
invented traffic, ranking, funding, customer or performance claims about
anyone.

## Step 1: take prospects from the GEO data, do not re-derive them

```bash
node scripts/prospects-from-geo.mjs --min 2
node scripts/prospects-from-geo.mjs --min 2 --authority   # paid, adds Domain Rating
```

This reads `data/geo-latest.json` and returns the hosts an AI actually cited
when answering your registry questions, ranked by how often **you were absent**
from those answers.

That ranking is the point. A host cited on a question where the engine named
two rivals and not you is a page actively shaping an answer you are losing. A
generic search for "<topic> blogs" finds a similar set with none of that
evidence attached.

Four tiers, and the tier decides the play:

| Tier | What it means | The play |
|---|---|---|
| **Partner** | Already a customer, supplier, integration or existing relationship | Warmest. A contact and a reason to talk exist. |
| **Prospect** | Cited, not a competitor or a platform | The normal research and pitch path. |
| **Competitor** | Sells what you sell | Never pitch. Read what they publish; that is the gap. |
| **Directory** | Review sites, listicle farms | Getting listed is a different task, not an article email. |

The competitor tier is read from the confirmed dictionary that `geo-monitor`
maintains, so it improves as that file does. Partners come from
`outreach.partnerHosts` in the config, which you fill in by hand.

**Partners first, always.** Where their own article about their category is
cited and omits that you exist alongside them, that is a gap in *their*
coverage as much as in your link profile. That framing is honest and it is the
whole pitch.

A competitor being highly cited is a finding about the category. Report it, do
not email it.

## Step 2: research through the tool layer

Every command below runs through Monid, so there is no separate contract for
each of these. Run `monid inspect` for the current price before a batch.

**Find and read the exact target page.** Never pitch from a homepage skim.

```bash
monid run -p context.dev -e /web/search \
  --query '{"query":"<their topic> site:<their domain>","limit":10}'

monid run -p context.dev -e /web/scrape/markdown \
  --query '{"url":"<the exact article URL>"}'
```

Scraping the page to clean markdown costs a fraction of a cent and is what
makes a real observation possible instead of a generic compliment.

**Measure their authority instead of guessing it.**

```bash
node scripts/prospects-from-geo.mjs --min 2 --authority
```

One batched call returns Domain Rating, referring domains and traffic estimates
for up to a hundred hosts. Do it once the list is short enough that a measured
number changes a decision, not before.

**Confirm who they are, and validate the address before it is ever used.** A
bounced first email burns the prospect.

```bash
monid run -p pdl -e /v5/company/enrich --query '{"website":"<domain>"}'
monid run -p api.strale.io -e /x402/email-validate --query '{"email":"<address>"}'
```

Read `valid`, MX records, whether it is a role address, and any typo
suggestion. A role address (`info@`, `hello@`) is not disqualifying but lowers
the reply odds and should be recorded as such. **Validation is not permission
to send.**

Record every address with its source, the exact source URL, the date checked
and a confidence note. Source preference, best first: an inbound message, an
official partnership or contact page, the help centre, a named employee author,
then a clearly labelled third party.

## Step 3: test the workflow fit before scoring anything

State both products as one sentence, in order:

```
<their product> does <step>  ->  <your product> does <the adjacent step>
```

If their core function **replaces** yours, defer. A neutral comparison is a
different piece of work with a different approval.

The partners that work are the layers either side of what you do: the thing
that runs before you, the thing that runs after you, and the suppliers whose
capability you distribute. Anything that occupies the same step is a
competitor, however friendly the conversation.

## Step 4: score, and be honest about what the score is

Score each dimension 1 to 5, then `score = sum(dimension / 5 * weight)`.

| Dimension | Weight | A 5 means |
|---|---:|---|
| GEO citation strength | 25 | Cited repeatedly on questions where you were absent |
| Workflow complementarity | 20 | Clearly the adjacent step, not a substitute |
| Domain authority | 20 | Measured, not inferred |
| Content activity | 15 | Recent, sustained, useful publishing |
| Contactability | 10 | A named editor, founder or official channel exists |
| Natural link space | 10 | A specific existing page where you genuinely belong |

85+ first batch. 75 to 84 contact after confirming the page and the owner.
60 to 74 monitor. Below 60 defer.

The first dimension replaces the usual "SEO visibility" because it is better
evidence for the actual goal: you want to be in the answer, and citation data
measures that directly.

## Step 5: draft

**Cold first contact: use
[references/cold-email-template.md](references/cold-email-template.md).** Other
situations (inbound reply, placement live, follow-up) are in
[references/email-frameworks.md](references/email-frameworks.md). Adapt every
one. **Never send two prospects the same body.**

Five short blocks, and the first must prove the article was read. The test:
**could this sentence have been written without opening the page?** If yes,
rewrite it.

What you may offer, all of it true:

- A specific placement on one of your guides, subject to editorial review.
- Real measured numbers from your own testing, with the date and the input.
- Screenshots and an approved reference pack so they describe you accurately.
- A genuine distribution argument, when one exists.

What is never said: any of the phrases at the end of the frameworks file, plus
anything about your funding, customer count, traffic or team size.

## Step 6: triage the reply

| Reply | Next action |
|---|---|
| **Interested** | Go to Step 7. In the same reply, ask for their materials (approved description, priority features, preferred landing page, accuracy notes, two or three current screenshots) and attach your reference pack **now**, not later. |
| **Questions** | Answer them factually and link the docs. Do not re-pitch. A second pitch inside a reply thread reads as pressure and converts worse than a plain answer. |
| **Declined** | One line of thanks, record the reason, close the row. Do not pivot to a different article in the same thread. |
| **No reply** | One follow-up, only if delivery succeeded and the fit still holds. Then stop. |

Silence is recorded as `no reply`, never as a decline with a reason attached.
Do not invent a motive for a person who has not written back.

## Step 7: write their placement first

**This is the move that makes the whole pipeline work.** You publish their
mention before asking for anything. Full playbook:
[references/reciprocal-placement.md](references/reciprocal-placement.md).

Short version: pick a host article that genuinely needs them (thicken in place,
never change a live URL), brief `content-thicken` with sourced facts only, stop
at preview, get a human yes, publish.

**The gate:** if the reader benefit of that link cannot be stated in one
sentence, there is no placement and the outreach ends at the email. A section
that exists only to hold a link is a link scheme, and it reads that way to the
partner as much as to a search engine.

Publishing is its own authorisation. It is never implied by "the draft is
good".

## Step 8: deliver, then ask

Send the live URL with the reference pack attached. Body is in
[references/reciprocal-placement.md](references/reciprocal-placement.md).

Two rules. **The delivery carries no ask, and it says so out loud.** The ask
that follows is conditional, "if a mention ever fits one of your pieces", never
"in exchange" and never "reciprocal".

If nothing comes back, one follow-up, then stop. **Never pull your placement
because they did not reciprocate.** If it was editorially correct on the day it
published, it stays correct.

## Step 9: track

One row per company or distinct target article, schema in
[references/tracker-schema.md](references/tracker-schema.md). Use the helper so
the state rules are enforced rather than remembered:

```bash
node scripts/tracker.mjs list
node scripts/tracker.mjs add --company "<name>" --url "<their domain>" \
  --article "<exact target article URL>" [--email <addr>]
node scripts/tracker.mjs state <id> <state> [--message-id <id>] [--note "<evidence>"]
```

`sent` is only ever recorded from an authoritative send event with a message
id; the helper refuses it otherwise. It is never inferred from a finished
draft. The two placement columns move independently: theirs going live does not
mean yours did.

## Step 10: verify a live placement

1. Destination URL correct, anchor and surrounding context sensible.
2. The description of you is factually right.
3. Page returns a success status and is not blocked from indexing.
4. Link attributes: `nofollow`, `sponsored`, redirects. Record as facts. A
   nofollow link can still carry referral and partnership value.
5. Whether the reciprocal content exists and stands up editorially.
6. **Re-run the GEO question it was meant to influence.** That is the only test
   that matters here: did being on that page change whether an AI names you.

## Output requirements

Research: evidence, score, risk, recommended target page, contact and its
source, next action.

Email: recipient and address source, subject, body, materials requested, and
the authorisation stage in plain words: `draft only`, `approved`, or `sent`.

Batch: the prospect table first, and an explicit send authorisation before any
message is transmitted.

## Related

- Prospects come from `geo-monitor` run data.
- Placements land in guides written by `content-thicken`, which owns the
  product canon and the pricing policy this skill inherits.
- Both read the same config and data directory.

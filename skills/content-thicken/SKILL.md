---
name: content-thicken
description: Evidence-driven blog driver. Takes ONE target from the fused search plus AI-answer content library, pulls the real questions it has to answer, drafts a thick long-form guide against a template contract, validates it deterministically, and stops at preview. Two modes, thicken an already-earning post IN PLACE (never change its URL) or author a net-new guide. Drafts by default; publishing is a separate explicit authorisation. Use for "thicken this post", "what should we write this week", "write a guide", "blog pipeline", "which post should we deepen", "content brief".
---

# Content thicken

The single writing skill. Selection, brief, drafting and validation live here.
Two things live outside it on purpose:

- **`PRODUCT.md`**, which you write once. What your product actually is, what
  it cannot do, what you are not allowed to claim. See
  [references/PRODUCT.template.md](references/PRODUCT.template.md).
- **`TEMPLATE.md`**, the shape of an article on your blog. Start from
  [references/article-template.md](references/article-template.md).

Splitting "how to write" from "what is true" across two files is how they drift
into contradicting each other. One definition each, referenced from here.

## The one rule that must never break

Two output modes. Picking the wrong one destroys traffic that already exists.

| Mode | When | The URL |
|---|---|---|
| **In place** | The post already earns clicks or holds a real ranking | **Keep the exact slug, file name and route.** Rewrite in place, add depth and figures. Never move it, never add a redirect, never touch its sitemap entry. |
| **New guide** | Net-new topic, or a page with no equity yet | A new URL is free here because there is nothing to protect. |

When unsure, thicken **in place**. Moving a URL that a search engine already
sends traffic to is the one irreversible mistake this pipeline can make.

## Non-negotiable inputs

Do not draft until each of these is known or explicitly marked a hypothesis:

```text
primaryKeyword     the verified query or question
questions          the real questions this must answer, from questions-for.mjs
searchIntent       informational | commercial | comparison | troubleshooting
demandEvidence     an intake row, a gap row, a real thread, or a GEO attack word
productEvidence    features that really exist, checked today, not from memory
conversionGoal     the page it should send a reader to
internalLinks      live URLs, each checked
mode               in-place | new-guide
publishingMode     draft (always, unless the user explicitly says publish)
```

A topic with no demand evidence is not a topic. Say so and offer to check it
rather than writing anyway.

The same applies one level down: **a heading with no question behind it is not
a heading.** The library decides what to write about; the question bank decides
what the article has to answer. Neither is optional and neither substitutes for
the other.

## Step 1: take a target from the library, do not re-derive one

```bash
node scripts/build-content-library.mjs
node -e "const l=require('./data/content-library.json');
  l.rows.slice(0,15).forEach(r=>console.log(r.rank, r.confirmation, r.action, '|', r.topic))"
```

Each row carries `action`, `confirmation`, `evidence` from both surfaces, and
`mustJoinCitations`. Priority:

1. **A page that already ranks and earns nothing for a technical reason.**
   Renders empty to crawlers, blocked in robots, canonical pointing elsewhere.
   **Not a writing job.** Report it and stop; an article here is effort spent
   on a problem the page does not have.
2. **`confirmation: both`.** Flagged in search AND absent from AI answers. The
   category treats the question as real and you are in none of the answers.
   Strongest signal available.
3. **`striking`**, then **`build-depth`**: in-place work on pages that already
   have exposure. Cheapest wins in the file.
4. **`ai-only`**, then **`search-only`**.

**Take exactly ONE target per run.** Record its `action` and `confirmation`:
they decide the mode and the framing.

## Step 2: pull the questions, then write the brief

The library row says the topic is worth writing. It does not say what the
article has to answer. That comes from the question bank, and it runs **before**
the brief, because the questions decide the spine:

```bash
node scripts/questions-for.mjs "<primary keyword>"
```

Three ranked sources: real thread titles in the asker's own words, GEO registry
questions where the engine named a rival and not you, and keyword rows (real
demand, but keywords, so any rewrite into a question is a guess and is labelled
one).

Take the questions this article can honestly answer. Read the list rather than
taking the top N: rows that cover the whole topic sort above partial ones, but
a question you cannot answer well is worse than one you leave out.

**Every H2 in the draft comes from this output, and the provenance block at the
top of the draft records which row and its source.** A heading with no row is
the failure mode this exists to prevent: an article shaped like an answer to
nothing, matching no real query and quotable by no AI.

A topic returning almost no usable questions is a finding, not an obstacle to
write around. Say so and check whether the demand is real.

```text
Brief
  primaryKeyword, secondaryQueries[]
  questions[]             { question, source, url, becomes: H2 | FAQ }
                          verbatim, never reworded into your vocabulary
  obstacleQuestion        the one that opens the piece
  searchIntent, audience, userProblem
  answerThesis            the conclusion, in one sentence
  workflows[]             2-3 concrete jobs, each with real steps
  productFacts[]          verified today, from PRODUCT.md, with the date
  prohibitedClaims[]      anything you cannot back
  competitorFacts[]       primary sources only
  internalLinks[]         { url, anchorOptions[], relevance }, each verified live
  mustJoinCitations[]     hosts the AI actually cited for this topic
  category, cta, freshnessDate
```

`mustJoinCitations` comes straight from the library row and is the closest
thing to an acceptance test a brief can carry: to be cited, the page has to be
at least as useful as those. Read one or two before writing.

## Step 3: draft against the template contract

Follow the spine in your `TEMPLATE.md`: obstacle question, then task questions
with numbered steps, then the leftover questions as the FAQ. The headings are
the questions from Step 2, in the asker's words.

What the rendered page additionally requires:

**Heading shape decides the sidebar.** A table of contents rail shows H2s and
expands the H3s of the section being read. Fourteen flat H2s render as a
fourteen item wall; five to seven H2s each holding two to four H3s render as a
navigable outline. **Write to that shape.** Question headings run longer than
topic labels, so keep them to the asker's phrasing with no padding.

**Every H3 must stand alone.** An AI lifting one section into an answer should
produce something correct without the rest of the post. This is why every step
carries the same short sub-heads: what it does, what it needs, the call, what
comes back, what it costs.

**Answer first, explain second, in every section.** The sentence that gets
quoted is the one that answers before it elaborates. A section that builds to
its conclusion cannot be lifted.

**`category` is the subject, never the format.** Writing `category: "Guides"`
is a bug: it labels the route, not the topic, and the breadcrumb, the listing
card and the filter chip all read that field.

**Image `alt` is the caption.** Write it as a sentence a reader benefits from,
not as accessibility filler, and never leave it empty.

**Put the comparison axis in column one.** The first column of a table reads as
the dimension you scan down. A table whose first column is a value rather than
a dimension will look wrong no matter how good the data is.

**Length 2,200 to 2,600 words. A cover plus four or five in-body figures.**

**This is a generation requirement, not a second pass.** A new post is finished
when it ships, and "write it, then thicken it" is not a workflow. It has been
tried: it produces posts at 1,700 words with a plan to go back and add
substance later, which is an unfinished draft with a schedule attached.

If a section is missing, it is missing at the outline stage. Count the H2s
against the question list before writing prose, and if the questions the topic
honestly supports do not fill the range, that is a finding about the topic. Say
so and write a shorter post deliberately, rather than a long one padded.

The word count is a symptom. What it measures is whether each section answers
its question with something a reader could not have guessed: a real field list,
a concrete failure mode, a decision rule. Adding sentences to hit a number
produces the length without the substance and fools nobody.

### Internal links: link widely, from the corpus, not from memory

Internal linking is one of the few ranking levers you control outright, and it
is usually the worst executed. Writing from memory reaches the same four posts
every time and wastes the rest of the corpus.

- **Aim for 8 to 14 internal links in a 2,400 word guide**, spread through the
  body rather than piled into a "related reading" block at the end.
- **Link the product or category page every time a capability is named.** A
  how-to that names a feature and does not link the page that sells it is
  missing its best link, and it is the only kind that points at a commercial
  destination rather than another article.
- **Both directions.** Link forward to the deeper guide and sideways to the
  narrow post that answers one sub-question well.
- **Every link must earn its sentence.** A link exists because the reader might
  genuinely want that page at that moment, not because two posts share a tag.
- **Vary the anchor.** Never repeat one phrase across every link pointing at
  the same page: identical anchors everywhere read as optimisation rather than
  writing.
- **Check every destination resolves** before the draft ships. Never emit a
  placeholder, and never link a redirect.
- **Record what was used** so the link graph can be audited later.

## Step 4: covers and figures

Two covers per guide, a matched pair from one HTML template rendered to PNG:
the hero shown inside the post, and the listing card. Keep the card as the hero
minus its corner texts, with the headline unchanged in text, size and position.
Do not recentre, resize or reword it.

**A figure must add structure the prose cannot: flow, branching, or
convergence.** Never make a grid of text cards that restates a comparison table
already in the body; that duplicates content and gets cut. If a section's
content is tabular, use a table. Good layouts, varied across figures and posts:

- **linear flow**: nodes left to right with edges, a pipeline or a loop.
- **decision tree**: branching questions with labelled edges to different ends.
- **before and after**: two panels, only when the contrast is the point.
- **fan in or fan out**: many sources into one hub, or one call into many
  returned fields.

An in-place thicken keeps its existing cover unless it has none.

## Step 5: validate deterministically, before showing anything

Fail or revise on any of these. Report each result rather than one opaque score.

```text
frontmatter starts at byte 0; the provenance block sits BELOW it
provenance block present, and EVERY H2 has a row in it naming its source
every H2 is a question, or the obstacle/task heading the question maps to
FAQ questions carry a question mark and the asker's own wording
category is a subject, and is NOT the name of the route
frontmatter complete; description within the length your template allows
5 to 7 H2 sections; H3s nested under them, not flat
every runnable command or claimed feature verified TODAY, not from memory
8 to 14 internal links present, spread through the body, anchors varied
every named feature links its product or category page
every internal link resolves and is not a redirect
every image has caption-grade alt text
no invented competitor, customer, funding or performance claim
no unresolved placeholder or leaked scaffolding
in-place mode: file name, slug, route and published date unchanged
status stays draft
```

Any component syntax your renderer uses gets its own check here. The failure to
watch for is the one that still returns a 200: an unclosed block that swallows
the rest of the file, or frontmatter that is read as body. The page loads, the
content is gone, and nothing errors.

## Step 6: preview, then stop

Render the draft and show the user: the target chosen, its mode, and the
evidence behind it, citing the actual library row and both surfaces. The run
ends here. **Do not push, do not open a pull request unsolicited.**

## Step 7: publish, only on explicit OK

**In place:** commit the edited file and new assets to a branch. **Touch
nothing about the route**: no move, no redirect rule, no sitemap edit.

**New guide:** add the file plus covers and figures, branch, open the request.

Never push without an explicit go. State the branch and the mode.

## Honesty rules

Each of these is what stops a comparison reading as a pitch.

- **Disclose the bias, then undercut it.** Say plainly that the reader is on
  your blog, and name where a rival genuinely wins. A comparison that never
  concedes anything is read as marketing and cited by nobody.
- **Close on a decision heuristic, not a hard CTA.** "The best X is the one
  that ..." beats "start your free trial". The reader arrived to make a choice;
  hand them the rule they can apply themselves.
- **A migration or alternatives post needs a REAL event.** A verified
  retirement, a verified pricing change. Do not manufacture the trigger and do
  not upgrade a rumour into a deprecation. If it cannot be verified with a
  primary source, the post does not exist yet.
- **Every external claim carries an evidence link.** Rivals, official APIs,
  pricing tiers, shutdowns, funding, customer counts. Never describe a
  competitor as unsafe, poor or missing a feature without current primary
  evidence.

## Pricing: a published number is a promise

If you print a price, the post is wrong the moment anything reprices, and
nobody goes back to fix it. Unless your prices genuinely never move:

- **Describe cost as magnitude**: "a fraction of a cent per result", "a few
  dollars for a whole competitor teardown".
- **Link the pricing page** where cost first comes up and in any cost FAQ. That
  page is current; a sentence in a post is not.
- **Tables state the billing shape**, per call versus per seat versus per
  result, never a figure. The shape is what changes how a reader architects,
  and it does not go stale.
- **A billing finding survives without the number.** "This is described as
  billing per query and the charge tracks records instead" is the useful half.

## What this skill will not invent

Everything factual about your product comes from `PRODUCT.md` and is checked on
the day of writing. If a fact is not in there and cannot be verified now, it
does not go in the post. That covers funding, customers, team size, uptime,
throughput, "we saw X% improvement", and any competitor's price list.

Drafts by default. Publishing is a separate, explicitly authorised action, and
nothing is reported as published without reading it back from the live URL.

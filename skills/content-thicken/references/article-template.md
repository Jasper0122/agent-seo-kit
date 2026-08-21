# TEMPLATE.md starter

Copy this to your content repo as `TEMPLATE.md` and adapt it to your renderer.
It is the single definition of an article's SHAPE. Define length, structure and
the reference model here and nowhere else: defining them twice is how a
pipeline ends up with two different word counts and an agent that picks
whichever one it read last.

---

## The spine

```
provenance block         which question each H2 came from, and its source
frontmatter              title, description, dates, category, cover, tags
opening                  the obstacle question, answered in the first paragraph
H2 x 5-7                 each one a real question, in the asker's words
  H3 x 2-4               each standing alone, answer first
honest caveat            where a rival genuinely wins, said plainly
FAQ                      the leftover questions, question marks intact
close                    a decision heuristic, not a hard CTA
last updated line
```

## The opening

Open on the obstacle question, and answer it in the first paragraph. Do not
open with context, history, or "in today's fast moving world". The reader
arrived from a search result with one question; if the first paragraph does not
touch it, the tab closes.

## Every H2 is a question

Taken verbatim from `questions-for.mjs`, in the asker's own words. The
provenance block records which row and which source, so a heading with no row
is visible at review time rather than after publication.

Question headings run longer than topic labels. Keep them to the asker's
phrasing with no padding, because they also render as the table of contents.

## Every H3 stands alone

An AI lifting one H3 into an answer should produce something correct without
the rest of the post. In a how-to, give every step the same short sub-heads so
the shape is predictable:

```
**What it does**      one sentence
**What it needs**     inputs, prerequisites
**The call**          the real command or the real click path
**What comes back**   the actual fields, not a description of them
**What it costs**     the billing shape, and time
```

## Answer first, explain second

In every section. The sentence that gets quoted is the one that answers before
it elaborates. A section that builds to its conclusion cannot be lifted, so it
never gets cited.

## The honest caveat

A section that names where a competitor genuinely wins. It is not a weakness
in the post, it is the reason the rest of the post is believed. A comparison
that never concedes anything reads as marketing and gets cited by nobody.

## Tables

Put the comparison axis in column one, the dimension you scan down. State
billing shapes rather than figures. A table whose first column is a value
rather than a dimension will look wrong no matter how good the data is.

## Figures

One cover plus four or five in-body figures. A figure must add structure the
prose cannot: flow, branching, or convergence. Never a grid of text cards that
restates a table already in the body.

Image alt text is the caption. Write it as a sentence a reader benefits from.

## Length

2,200 to 2,600 words, and it is a generation requirement, not a second pass. If
the questions the topic honestly supports do not fill the range, that is a
finding about the topic: write a shorter post deliberately and say why.

## The close

A decision heuristic, not a hard CTA. "The best X is the one that ..." beats
"start your free trial". The reader came to make a choice; hand them the rule
they can apply themselves.

End with `*Last updated <Month Year>.*`

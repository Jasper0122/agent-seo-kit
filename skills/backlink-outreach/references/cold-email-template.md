# Cold outbound template

The one shape to reuse for a first contact partnership email.

## Why this shape works

Six blocks, nothing else. Each does a job, and dropping one breaks it.

| Block | Job | Fails when |
|---|---|---|
| 1. Greeting | Address a team or a named person | "Dear Sir/Madam", or a name you guessed |
| 2. Proof of read | Name the exact article and restate its actual argument | The sentence could have been written from the homepage |
| 3. The fit | Where you sit relative to that step, concretely | A feature list with no workflow relationship |
| 4. Bare URL | One line, no anchor text, no tracking parameters | Buried in prose, or three links |
| 5. Offer and ask | Give something first, then ask small | Asking for a link before offering anything |
| 6. Sign-off | Real name, real title, company | No title, or an invented role |

Two structural details carry most of the weight:

- **The URL gets its own line.** It reads as a reference, not a pitch. A link
  wrapped in "check out our amazing tool at" reads as spam.
- **The reciprocity offer removes their risk.** Going first converts a favour
  into a trade where they hold nothing.

## The template

```
Subject: Potential content partnership

Hi [Name],

I read your article, "[Article Title]," and found [specific point] useful,
particularly [the actual argument, in your own words].

[One sentence on what you do. No feature list.]

We would be glad to include and link to [Product/Company] in a relevant guide
of ours. Would you be open to mentioning [Your Product] in a relevant article
or resource on your side as well?

[bare-domain.com]

If it helps, I can suggest a natural placement and send a short description or
reference materials.

Best,
[Real name]
[Real title], [Company]
```

Why it works, so nobody improves it into something worse:

- **You offer before you ask.** The include-and-link sentence comes first, so
  the question after it is a proposal between two publishers, not a request for
  a favour.
- **One line of self-description.** A technical reader is oriented in four
  seconds. If you cannot say it in one line, that is a positioning problem, not
  an email problem.
- **The reference pack is offered at the end, never attached.** It arrives when
  they say yes, which is when it has a job.

## Filling the slots

| Slot | Rule |
|---|---|
| `[specific point]` | **The only slot that can sink the email.** A real argument from the piece, not a compliment about the piece. Test: could this be written from the title alone? Then it is not done. |
| `[Article Title]` | Exact, in quotes. No URL needed, they wrote it. |
| `[Product/Company]` | Their product name as they write it. |
| `[Name]` | A real first name. If there is no named author or contact, this template is not ready to send. |

## Hard limits

**150 words, and the ask on its own line.** A cold email that needs two screens
has already lost. Put the request in one short sentence with nothing else in
it, so a reader skimming on a phone hits it.

Say the purpose plainly. Hedged openings ("I was wondering if perhaps") read as
either a waste of time or a setup for something worse. Directness is not
pushiness: the pushy version is the follow-up nobody asked for, not a clear
first sentence.

The order that works:

`specific praise (provable) -> the proposal -> who you are -> why complementary -> link`

## Block 3 by prospect tier

The fit sentence is the only part that changes structurally. Tiers come from
`prospects-from-geo.mjs`.

**Partner or supplier.** Warmest, always first.

> We already work with [Partner]. The part usually missing from a piece like
> this is [the true thing their readers do not know]. That is distribution on
> your side, not a competing product.

Never position yourself as an alternative to somebody you depend on.

**Adjacent platform** (they run the workflow, you are a step inside it).

> [Your product] fits inside that workflow, at the step where it needs
> [the thing you do]. It does not replace the workflow, it is what the workflow
> calls.

**Directory, framework or ecosystem page.**

> [One line]. One thing your readers can test in thirty seconds: [a concrete,
> checkable claim].

A claim the reader can test immediately is the strongest asset a cold email
has, because it costs them nothing to disprove you.

## Proposing a mutual placement

Allowed, phrased as a proposal between two publishers:

> I would like to propose a mutual mention: [you] in our guide on [topic], and
> [us] in yours.

Still forbidden: making it conditional or transactional ("if you link to us we
will link to you", "in return", "you owe"), and promising a placement is
already decided. What is proposed is a proposal. Editorial review still happens
on both sides.

## The credibility line, and the one to never copy

"Our organic visibility has been growing steadily" is unverifiable, and
traffic, ranking, funding, customer and team-size claims are banned outright.

Replace it with something checkable. A figure you measured yourself, with the
date and the input, lands harder than any adjective:

> We ran [the thing] on [date] with [input] and it came to [figure]. Happy to
> send the raw output if it is useful for the piece.

If there is no measured number for this topic, offer the reference pack instead
and say nothing about your own performance.

## Reciprocity, two variants

**A. Offer to draft.** The default. Nothing is promised.

> If a reciprocal resource link is interesting, we can draft the placement on
> our side and send you the preview before it publishes. We keep editorial
> control, but nothing goes live that you have not seen.

**B. Already published.** Strongest, and it needs no ask at all.

> We published [our article] and included [them] here: [URL]. No ask attached.
> If you ever cover [topic], our reference pack is below and the wording is
> yours to adapt.

Variant B is worth the extra work on a high value prospect. An email with
nothing to grant gets read differently from one with a request in it.

**Never** write "we will feature you", "we will definitely include you", or
anything that commits a placement before editorial review. Offering to draft is
not the same as promising to publish, and the difference has to survive being
quoted back at you.

## Subject line

Name the purpose flatly. The recipient decides in one second whether this is
their job; the people who own partnerships open it, and the people who do not
were never the audience.

Never write "link swap" or "guest post opportunity" in a subject. Those are the
literal signature of link-scheme mail and they get filtered.

## When the reference pack is attached, and when it is not

**Never on first contact.** A large attachment from an unknown sender hurts
deliverability, and the recipient has not asked for it. Offer it in one clause
and stop.

Attach it at exactly two moments:

1. **They reply interested.** Attach it in that reply, with the materials
   request. They are about to write something, so the pack has a job.
2. **You publish their placement.** Attach it to the delivery email, after the
   live URL and after "there is no ask attached to that".

## Before it goes out

1. Could block 2 have been written without opening the page? If yes, not done.
2. Is the target one exact article, never a homepage?
3. Was the address validated, and is it a role address? Record it either way.
4. Does anything promise a link, quote a live price, or claim traffic, funding
   or customers? All of those are cuts.
5. Is this body different from every other body in the batch? Two prospects
   never receive the same text.

Drafting is always allowed. **Sending is not.** It needs its own explicit yes,
and `sent` is only recorded from a real send event with a message id.

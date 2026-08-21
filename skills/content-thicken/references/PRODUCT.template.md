# PRODUCT.md template

Copy this to the root of your content repo, fill it in once, and keep it as the
only definition of what is true about your product. `content-thicken` reads it
and refuses to state anything factual that is not in here or verified today.

Why it is a separate file: if "how to write" and "what is true" live in the
same document, they drift into contradicting each other, usually about length,
about the opening, and about which competitor you are allowed to name. One
definition each.

---

## What we are

<!--
One sentence a technical reader understands in four seconds. Not a feature
list, not a mission statement. If you cannot write it in one line, that is a
positioning problem and no article will fix it.
-->

## What we are NOT

<!--
The framings you have already rejected, and why. This section stops an agent
from reaching for the obvious wrong shorthand.

Example shape:
- Do NOT call us "a <narrow category> tool". That was the old framing and it
  undersells <the thing it leaves out>.
-->

## Approved shorthand

<!--
The analogy you allow, plus its limits. Every good shorthand is wrong in some
direction; write down which direction, so it is used where it lands and dropped
where it does not.

Example shape:
- "<X>, but for <Y>". Approved for developer audiences. Two limits: it is an
  analogy about SHAPE not category, and it must never imply a partnership with
  or endorsement by <X>. Drop it for marketing and ops readers, where the name
  carries nothing.
-->

## Scale claims and how to phrase them

<!--
Any number that goes stale silently belongs here as a RANGE, never as an exact
figure. "Over a thousand" survives a week; "1,047" is wrong by Friday and
nobody goes back to fix it.
-->

## The core workflow

<!--
The two to four verbs a user actually performs, in order, with what each one
costs them. This is the spine of every how-to you will ever publish.
-->

## Real syntax

<!--
Every code block in every post must use the ACTUAL syntax, never pseudo-code.
Paste the real commands here, from the real help output, with the date you
checked. Copied payloads have been wrong before: two endpoints in the same
product can take differently shaped input, and a post that ships the wrong one
teaches the reader that your docs cannot be trusted.
-->

```bash
# real command, verified YYYY-MM-DD
```

## Pricing policy

<!--
Decide once: do you print figures or magnitudes? The default in this kit is
magnitudes, because a published number is a promise the reader holds you to,
and prices move under it.

If you keep internal reference figures here for judging magnitude, mark them
INTERNAL, NEVER PRINTED, and say so on the line.
-->

## Partners and suppliers we may name

<!--
Who you may name in a post, and how they must be described. Re-check before
naming any of them: a list like this goes stale and naming a former partner as
a current one is worse than naming nobody.
-->

## Hard rules

<!--
The claims that are banned outright. The usual set:

- Never invent funding, customers, team size, SLAs, uptime, throughput, or a
  "we saw X% improvement" figure.
- Never publish a competitor's price list.
- Never describe a competitor as unsafe, poor or missing a feature without
  current primary evidence.
- The CTA domain is <yours>.
-->

## House voices

<!--
One row per content line. The voice changes what the opening reframes and what
the worked examples are, not the shape of the article.

| line | voice | author | what the opening does | what the examples are |
|---|---|---|---|---|
| product | team "we" | The Team | old way vs the new model | three capabilities of one feature family |
| user | personal "I" to "you" | a named person | how I used to do it vs how I do it now | three things I actually built |
| scenario | second person imperative | The Team | the manual process vs the automated one | three stages of one pipeline |
| competitor | opinionated analysis | The Team | the named rival's approach vs yours | three jobs where the split shows |

Keep the use cases DIVERSE across posts. Do not make every post the same
pipeline with different nouns.
-->

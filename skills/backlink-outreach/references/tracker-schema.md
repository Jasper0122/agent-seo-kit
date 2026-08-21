# Outreach tracker schema

One row per company, or per distinct target article. Managed by
`scripts/tracker.mjs`, which enforces the rules below rather than trusting you
to remember them.

| Field | Purpose |
|---|---|
| ID | Stable record identifier |
| Company | Prospect identity |
| Domain | Their root domain |
| Tier | partner, prospect, competitor, directory |
| Score | The weighted score from the skill's scoring table |
| Target Article | The exact proposed placement page, never a homepage |
| Recipient Name | Known person or team |
| Recipient Email | Address used or proposed |
| Email Source Type | Inbound, official contact page, help centre, named author, third party |
| Email Verified Date | Date the address was checked |
| Subject | Personalised subject |
| Sent Message ID | Authoritative sent-message identifier |
| Contact Status | Workflow state, from the list below |
| First Contact Date | Actual send date |
| Reply Status | No reply, interested, needs follow-up, declined, bounced |
| Follow-up Due | Planned date, not an automatic-send instruction |
| Materials Received | What arrived and where it is stored |
| Our Placement | Your article URL and section |
| Their Placement | Partner article URL and section |
| Link Attributes | Followed, nofollow, sponsored, redirect details |
| Verification Date | Last live-page check |
| Notes | Overlap, contact confidence, claim or editorial risk |
| History | Every transition, stamped, with its evidence |

## States

Explicit states, rather than collapsing the process into "contacted":

```
not_contacted        research_complete    draft_ready       approved_to_send
sent                 replied              interested        materials_requested
materials_received   our_content_drafting our_placement_live their_placement_live
verified             declined             bounced           closed
```

## The two enforced guards

- **`sent` requires `--message-id`** from a real send event. A finished draft
  is not a send. Without this guard an agent will draft an email, record it as
  sent, and tell you next week that the prospect never replied.
- **`our_placement_live`, `their_placement_live`, `verified` and `bounced`
  require `--note`** carrying the evidence, which is normally the live URL.

## Follow-up rules

- Set a follow-up date only after a real send event.
- Follow up only when delivery succeeded and the editorial fit still holds.
- One follow-up, then stop. Partnership outreach that keeps going is spam.
- The two placement columns move independently. One side going live does not
  prove the other side is live.
- Record exact evidence for every status transition.

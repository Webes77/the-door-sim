# First shift: plan

Decided by James on 17 November 2026. The GIG door is parked on `claude/plan-v0.1` (draft PR #1). Nothing there is deleted.

## What it is

A phone-first practice shift for new callers at The Intro, who phone New Zealanders on behalf of Broadbent Risk to book a free policy review with a broker. The job is a headset and a script, so the simulation is the call. No 3D.

- The learner goes Available. The dialler connects a fictional prospect. Captions always show. Recorded New Zealand voices come after James has played it.
- The learner answers by tapping one of three lines (the guided level). Speaking comes with the classifier.
- A shift is four short calls. After every call the learner picks the disposition from the real list. Then a debrief.
- It is called a simulation or a practice shift on screen. Never a game.

## Sources (the only source of content)

The Intro Agent Hub, read in full on 17 November 2026. Nothing is copied into the repo except the short rule quotes each item cites.

| Short name | Document |
|---|---|
| Guide | Call Centre Onboarding Guide v1.0, sections 01 to 13 |
| SOP | Agent Call Workflow SOP v1.4 |
| Script | Outbound Call Script v1.8, with guidance |
| Journey | Lead Journey Map |

Not used on screen: staff phone numbers, commission amounts, targets, broker and insurer lists, the timetable.

## The four calls

Every prospect is fictional. Calls 1 and 2 are built first.

| # | Prospect | Compliance moments | Rule and source | Disposition |
|---|---|---|---|---|
| 1 | Warm. Bank policy that rolls over each year. Says yes to the review. | "What cover should I be on, and what would it cost?" "Can they ring me Tuesday at 3?" | Book only. No advice, quotes or comparisons: Guide 05, Script "Before you dial". Never book a specific time: Script 08 and "Before you dial". | Lead Submitted (SOP 2.2, 5.2) |
| 2 | Annoyed from the first second. | "Where did you get my details?" "Don't call me again." | Approved line only, never guess: SOP 2.3, Guide 10. Accept without argument and wrap as DNC: Guide 05, Guide 06, SOP 2.2. | DNC (SOP 2.2). Missing it is a critical error. |
| 3 | Busy and half listening. | "Are you from Broadbent?" "Just email me something." | You work for The Intro and call on behalf of Broadbent Risk: Guide 04, Guide 06. Never promise when the email arrives: SOP 5.1, Script 08. | Email Requested (SOP 2.2, 5.3) |
| 4 | Polite, then objects to the recording. | Recording disclosure in the first 30 seconds. She will not be recorded. | Disclosure every call: Script 01. End the call, never switch recording off: SOP 2.6, SOP 8. | Not named in the SOP. Question for Hayden or Joelinda. Unscored until answered. |

The opening line is a choice in call 1 (on behalf of Broadbent, recording disclosure) and is played for the learner in later calls.

Held for a later call bank, so a shift can draw four from more: a yes given only to get off the phone (Guide 07), a prospect in distress or with a medical trigger (Script 07, Script 09 "Refer up"), a strong existing broker relationship (Script 09 "Clean exit"), over 60 or outside the four checks (SOP 3.1, Script 06).

## Engine

A new, small engine beside the door engine: `src/engine/shift/`. Same golden rule. Pure `reduce(state, action, pack)`. The same seed and the same actions always give the same state.

**Actions**

| Action | From | Effect |
|---|---|---|
| `available` | UI | The dialler connects the next call. The prospect's first lines play. |
| `say {ids}` | Tap now, classifier later | Ids are checked against the options allowed at this point in the call. No match: the prospect says "Sorry?" and nothing changes. |
| `disposition {id}` | UI | Records the wrap code. Scores it. Moves to the next call or the debrief. |

**Hidden state**

| Field | Meaning |
|---|---|
| `seed`, `call`, `phase` | Which shift, which call, and whether the learner is waiting, talking, wrapping or finished. |
| `node` | Where the call is. Each call is a small graph of points in the pack. |
| `log` | Every line said, by whom, in order. |
| `decisions` | For each choice: the option taken, the rules it kept and the rules it broke. |
| `results` | For each call: the disposition picked, whether it was right, and any critical error. |

**The engine decides**

- Which line the prospect says next.
- Whether a rule was kept or broken. Options carry rule ids. The AI never judges.
- Whether the disposition is right. A wrong one is scored.
- Critical errors. A rule marked critical, or a missed DNC, is listed on its own and forces the result down to "Needs work", whatever the rest scored.
- Bands: Strong at 80 percent, Getting there at 50 percent, from the pack.

**AI layer (later)**: classify the learner's spoken words into the option ids allowed at that point, and write one debrief note from engine facts. Both have a scripted fallback. Tap mode needs no AI.

## Content pack

`src/content/clients/the-intro-broadbent/`

| File | Holds |
|---|---|
| `client.json` | Employer name, client name, the caller's first name, labels. Lines use `{{employer}}`, `{{client}}` and `{{clientShort}}`, so a version with the names swapped is a settings change. |
| `rules.json` | Each rule: the exact words from the source, the document, the section, and whether a breach is critical. |
| `dispositions.json` | The real list from SOP 2.2, with "when to use" in the SOP's words. |
| `shift.json` | The calls: prospect, lines, options, which rules each option keeps or breaks, the right disposition. |

Every item carries `review: pending`. Screens show "Draft for compliance review" until Hayden or Joelinda approve. `scripts/review_pack.py` builds the review pack (Markdown and Word) from the pack: tick column, changes column, sign-off block.

Weak options are things a nervous new caller would plausibly say, about the same length as the right line. A test fails if the right line is usually the longest.

## Debrief order

1. The learner's own read first.
2. The timeline, call by call.
3. Critical errors on their own.
4. Results in bands, per call and for the shift.
5. Each compliance moment with the exact rule quoted and its section.

## Reused from the door build

The pure reducer pattern and replay tests, the seeded option mix, the keyword matcher (for speech later), the brand setting and Magnum look, the display rule that removes em dashes, the debrief layout pieces, the recorded-voice player with tap unlock, the private preview and the headless phone tests.

## Build order

1. Calls 1 and 2, dispositions, debrief, tap mode with captions. Preview link. (This session.)
2. James plays it. Then calls 3 and 4, and the review pack goes to Hayden or Joelinda.
3. New Zealand voices for the prospects.
4. Speaking, with the classifier, once the Anthropic key is in Netlify.
5. Password gate and Netlify deploy.

## Waiting on James

- The disposition after a recording refusal (SOP 2.6 does not name one).
- SOP 3.1 says "Disposition as Over 60s". The list in SOP 2.2 has no such code.
- Which breaches count as critical. The draft marks three: a missed DNC (the SOP calls it critical), giving advice or a quote (the Guide calls it a legal boundary), and saying you are from Broadbent (the Guide calls it legally important).
- The Intro's logo and colours, if the shift should wear them. It wears the Magnum look for now.

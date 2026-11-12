# Plan: The Door prototype

Version 0.1, 12 November 2026. Written from `docs/brief-v0.1.md` and `docs/build-framework.md`. Framework section 15 wins where the two conflict. Framework section 17 (James's additions) is empty; fold it in here when it arrives.

Status: plan only. No app code yet.

## Current direction: GIG proof of concept (12 November 2026, James)

This section overrides the rest of the plan where they differ. Sections 0 to 7 below were written for Rebuild Relief. The engine design, turn pipeline, latency budget and fallbacks still hold. The Rebuild Relief content (personas, compliance list, strong lines, recorded-line counts) is paused until that pack comes back.

### What we build

A GIG-branded training app for new fundraisers. Black, GIG coral (#FF554D from the logo) and cream, with the GIG logo. Australian voices.

1. **Dashboard.** The rep lands here and sees two sections and their progress.
2. **Onboarding (placeholder).** Rules of conduct for fundraisers. Placeholder cards until James supplies GIG's onboarding document. These rules become the critical errors at the door.
3. **Sales skills.** Built from GIG's "First 4 Weeks Training Manual". Interactive. The door simulator lives here.

Not building yet: a full design. James wants to see animation ideas first.

### How the manual maps onto the engine

| Manual (page) | In the app |
| --- | --- |
| The 5 Steps: Introduction, Problem, Solution, Close, Consolidation (p8, p14 to p25) | The stages the engine tracks and the debrief scores |
| Impulse Curve, Attention Line, Buying Line (p31, p32) | Hidden state: an impulse number. Below the Attention Line the donor disengages; above the Buying Line a close can land. Never shown in play; drawn in the debrief |
| KISS vs KILL: no more than 30 seconds without a question (p12, p13) | Derived event from speech time; the donor shows it (glances away, shorter answers) |
| Close at least three times, five methods (p22, p23) | Close attempts and methods counted and scored |
| Deflection: Listen, Acknowledge, Confirm, Re-impulse, Re-close; "I hear you", never "I understand" (p26 to p28) | Objection handling scored step by step; "I understand" flagged |
| GIFTS impulse factors (p29, p30) | Classifier tags which factor a line uses; layering scored |
| Intelligence and rapport: one open question, no fake compliments, bring it back later (p38 to p40) | Scored; a compliment about something not in the scene counts as fake |
| Consolidation self-justification question (p24) | Scored at the end of a sign-up |
| S.E.E.N., body language, tone, matching (p10, p11, p33 to p37) | Can't be scored from words (tonality is out of scope). Taught as short read-and-check cards, and shown through the donor's poses |
| Emotional control and reset (p41 to p43) | A short reset beat between doors |
| 8 Step System, Law of Averages, KPIs (p6, p44 to p47) | Not in this build |

Figures in the manual (company totals, the close-rate percentages on the impulse curve, KPI numbers) stay off screen.

### The door for GIG

- Goal: a regular-giving sign-up, monthly or annual, with the details confirmed. A "maybe" is not a sign-up.
- Charity: a placeholder campaign until a real GIG brief arrives. Any facts it uses are written down, agreed and marked fictional.
- Donor personas, objections and conduct rules: drafted after the onboarding document arrives.

### Open items

- GIG website, for exact colours and fonts.
- GIG onboarding document (rules of conduct).
- A campaign brief, or sign-off on a fictional placeholder charity.
- Where the GIG manual should live for future sessions (Drive file id, or a private `docs/sources/` folder).
- Animation direction: James to choose from the ideas list.

## 0. Decisions locked for this build

These follow framework section 15. Each one changes or sharpens the brief.

| # | Brief says | Build does | Why |
| --- | --- | --- | --- |
| 1 | Classify, then voice the reply with AI every turn | AI classifies. The engine picks a line from a recorded bank. Live rewording is a switch, off by default | Live voice drifts in pitch line to line and adds 0.5 to 1 second. Only way to hit the latency target |
| 2 | Browser speech recognition first | ElevenLabs Scribe first, browser recognition as fallback, then typing | Browser recognition was unreliable on phones in the earlier build |
| 3 | Rep checks transcript? (not stated) | Speech auto-sends at end of speech. Transcript shows. Empty classification gives "Sorry?" and no state change | A door conversation can't wait for a confirm tap |
| 4 | Claude API (model not stated) | `claude-haiku-5-5`, effort `low`, structured output with an enum of allowed ids. Set by env var | Measured about 1 second per classify call with no loss of accuracy. Re-benchmark on 20 or so real rep lines first |
| 5 | Compliance list in a data file | Same file also feeds the guard, and holds deterministic phrase rules for the rep's words | One list, three uses |
| 6 | Booking = time agreed plus basics | Booking is a tier of elements: time, name, best number, readback. Customer asks only for what is missing | "Yeah, maybe" can never count |
| 7 | (not stated) | Evidence rule: a rep claim about the roof or the street counts as unverified unless the scenario gave the rep that fact | Unverified damage claims are a compliance risk |
| 8 | (not stated) | Password gate from day one. Presenter mode for demos. Review pack generated from the data files | Every spoken turn spends API credit. James demos to Rebuild Relief and GIG |
| 9 | Server functions (region not stated) | One `/api/turn` call does transcribe then classify, so a phone makes one round trip per turn. Functions region set to Sydney if the Netlify plan allows it `[NEEDS CONFIRMING]` | Default functions region is in the US. Two trips across the Pacific cost more than the engine does |

## 1. The engine

### 1.1 Shape

- `reduce(state, action, pack) -> state`. Pure. No randomness, clock reads or network.
- `start(pack, mode, personaId, seed) -> state`. Draws the persona variant (name, street, damage noticed), the interruption schedule and line orders from the seed, once.
- `replay(pack, seed, actions) -> state`. Tests and the debrief use it.
- Determinism covers everything after classification. The engine's inputs are the action log. The same log always gives the same result, so scoring is fair. A classification is stored in the log with its transcript, so a replay never calls the AI.

### 1.2 Actions

Actions are a closed list. The engine defines the **kinds** and their effects. Each content pack defines the concrete **action ids** under each kind, with a plain description for the classifier and a keyword list for the no-AI matcher. A test fails the build if a pack uses a kind the engine doesn't know. This is how GIG gets "ask for a monthly gift" without a code change.

**Rep actions (classified from what the rep says; one turn can carry several):**

| Kind | Rebuild Relief ids (draft) | Stage |
| --- | --- | --- |
| `greet` | `greet` | opener |
| `introduce` | `say_own_name`, `name_company` | opener |
| `reason` | `state_reason_storm`, `state_reason_nearby_job` (evidence: only if the scenario says a job is nearby) | opener |
| `icebreak` | `comment_on_property` | opener, rapport |
| `preempt` | `preempt_other_companies` | opener |
| `permission` | `ask_for_a_minute` | opener, objection |
| `small_talk` | one id per pack topic: `talk_storm`, `talk_street`, `talk_kids`, `talk_dog`, `talk_footy`, `talk_work`, `talk_weather`, `talk_house`, ... | any |
| `acknowledge` | `acknowledge_interruption`, `acknowledge_feeling`, `acknowledge_objection` | any |
| `qualify` | `ask_owner`, `ask_inspected_since_storm`, `ask_anyone_else_looked`, `ask_insurance_cover`, `ask_decision_maker`, `ask_open_question` | qualifying |
| `present` | `explain_service`, `state_company_approved`, `describe_inspector_approved`, `explain_no_cost`, `explain_hidden_damage` | presenting |
| `handle` | `diagnose_objection`, `answer_objection:<element>` (elements per objection in the pack), `acknowledge_right_to_own_claim`, `no_oriented_question` | objection |
| `ask` | `ask_for_inspection`, `propose_time` | asking |
| `confirm` | `ask_name`, `ask_number`, `confirm_time`, `read_back` | confirming |
| `leave` | `thank_and_leave`, `leave_card`, `leave_door_open`, `ask_owner_contact` | leaving |
| `risk` | `criticise_insurer`, `claim_unverified` | any (scored, never helpful) |
| `compliance` | one id per rule in `compliance.json` (AI may flag; phrase rules also match) | any |

**Engine-derived (never classified, worked out from state and the transcript):**

| Derived event | Rule |
| --- | --- |
| `talked_over` | A rep turn while an interruption is active, with no `acknowledge_interruption` |
| `long_turn` | Rep turn longer than the persona's word budget for its time pressure |
| `pushed` | `ask` after two clear refusals, or `ask` to someone who said they are not the owner |
| `ignored_objection` | A turn with no `handle` or `acknowledge` while an objection is open |
| `asked_early` | `ask` before any `qualify` or `present` |
| `question_count` | Turns with a `qualify` or `handle` question, or a question mark in the transcript |

**System actions (from the UI, never from the AI):** `knock`, `rep_turn` (classified ids, transcript, word count, speech milliseconds), `interruption_due` (fires by turn number from the seed, never by real time), `walk_away`, `tech_pause`, `resume_text_mode`, `jump_to_turn` (debrief retry), `presenter_jump`.

**Customer moves (engine output, each one picks a recorded line):** `open_door`, `reply_topic`, `answer_question`, `raise_objection`, `re_raise_objection`, `accept_answer`, `cool`, `warm`, `clarify` ("Sorry?"), `interruption_start`, `interruption_end`, `ask_missing_booking_element`, `agree_booking`, `counterfeit_yes`, `refuse`, `close_door`, `take_card`, `thinking_beat`.

### 1.3 Hidden state

Numbers in the engine, clues on screen. Every threshold lives in the pack.

| Field | Type | Notes |
| --- | --- | --- |
| `seed`, `personaId`, `variant` | ids | Name, street, damage noticed |
| `mode` | `practice` or `drill` | Recorded with the result |
| `stage` | one of the eight stages | Opener, rapport, qualifying, presenting, objection handling, asking, confirming, leaving well |
| `trust` | 0 to 100 | Bands from the pack: low, warming, open |
| `friction` | 0 and up | Rises with `long_turn`, `talked_over`, `pushed`, `ignored_objection`, `asked_early`, `criticise_insurer` |
| `doorThreshold` | number | Friction at which the door closes |
| `timePressure` | none, some, high | Sets the word budget per turn and the clock budget |
| `clock` | virtual seconds | Rep turn cost from word count. Customer line cost from the pack. Never real time |
| `decisionMaker` | yes, needs partner, not owner | Revealed only when asked or volunteered |
| `stormAwareness` | noticed, unsure, none | |
| `insurance` | insured, unsure, already claimed | |
| `objectionQueue` | list of `{id, status, elementsMet}` | Status: queued, raised, handled, dropped. Handled when the pack's `handledWhen` condition is met |
| `revealed` | set of fact ids | What the customer has told the rep. Feeds evidence and the debrief |
| `claims` | list of `{claim, verified}` | Evidence rule |
| `interruption` | `{id, active, acknowledged}` | |
| `booking` | `{agreed, time, name, number, readBack}` | Booked only when all four are true |
| `refusals`, `loops` | counts | Pack limit: three loops (Field Manual B19 compliance note) |
| `criticalErrors` | list of `{ruleId, turn, source: phrase or ai}` | Never hidden in a score |
| `lineCursor` | per topic index | No repeats while a fresh line is left; never the same line twice running |
| `pose` | derived | `arms_folded`, `glancing_inside`, `neutral`, `relaxed`, `leaning_in`, from trust, friction and interruption |
| `outcome` | in play, booked, booked with breach, left well, not booked, door closed, walked away | |
| `turns` | log | Each turn stores the action, the state snapshot before and after, and the rule that fired. The debrief timeline reads this |

**How a door goes (rules, numbers in the pack):**

- Each rep action has an effect on trust and friction from the persona's reaction table, with conditions in the shared condition language (`always`, `not:x`, `a|b`, `count:n:a,b,c`, `revealed:x`, `stage:x`, `trust:band`).
- An objection is raised when its trigger condition is met (for example `stage:presenting` or the first `ask`). It stays open until handled. Handling it lifts trust. Ignoring it adds friction.
- Agreement to book happens only on `ask` when trust is open, no objection is open and the decision maker is `yes`. Then the customer asks for each missing booking element in turn.
- `counterfeit_yes` ("Yeah, maybe") comes back when the rep asks while trust is only warming. It never books.
- The door closes when friction reaches the threshold, the clock runs past the persona's budget, or after a third clear refusal.
- A compliance breach is recorded whatever the customer does. Some customers would happily accept "your insurer will pay". The booking still counts as failed.

### 1.4 Starting state for the five personas (draft, `review: pending`)

| Persona | Trust | Time pressure | Decision maker | Storm awareness | Insurance | Objection queue | Door threshold |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Busy parent | low end of warming | high | yes | unsure | insured | `not_now_busy` | low |
| Burnt sceptic | low | none | yes | unsure | insured | `whats_the_catch`, `who_are_you_with`, `no_signing_at_door` | medium |
| "Insurer will handle it" | warming | some | yes | noticed damage | insured | `ill_sort_it_myself` | medium |
| Renter | warming | some | not owner | noticed damage | unsure | none (the right move is to qualify and leave well) | medium |
| Friendly talker | open | none | yes | unsure | unsure | `maybe_later` (soft) | high, but a clock budget ends the chat if the rep never asks |

Behaviour comes from the situation (dinner on the stove, past bad tradies, renting, a free afternoon), never from age, gender or background.

### 1.5 Compliance

`compliance.json` holds each rule with an id, phrase patterns, a severity and its source. Starting list from brief section 6, all critical:

- `promise_outcome`: promises or implies an insurance outcome.
- `no_win_no_fee`: says "no win, no fee".
- `licensed_inspector`: describes the inspector as licensed.
- `company_wording`: the approved company wording is "licensed claims management company". Wrong wording is a rubric miss; misdescribing the licence is critical.
- `pressure_non_owner`: pressures a non-owner to book.

Proposed additions from the field manual's own compliance notes, `[NEEDS CONFIRMING]` by James and the compliance team:

- `deadline_language` (critical): "Do not use deadline language at the door" (Field Manual B1, compliance note).
- `fourth_loop` (critical): "Three loops is the limit... There is no fourth loop. Exit cleanly every time." (Field Manual B19, compliance note).
- `right_to_own_claim` (rubric, not critical): acknowledge the homeowner's right to manage their own claim before presenting (Field Manual B19 and B23, compliance notes).

Detection: phrase rules on the rep's transcript are deterministic. The classifier may also return a rule id from the same enum when the rep paraphrases. Either source records a critical error; the debrief shows which source.

### 1.6 Scoring and debrief

- Rubric in `rubric.json`: one list of criteria per stage, one point each, conditions in the condition language. Bands: strong at 80 per cent, getting there at 50 per cent, needs work below. Thresholds in the file.
- Two verdicts: "Did you sell well?" (stage bands, forced down by any critical error) and "What happened at the door?" (outcome).
- Turning point, worked out by the engine: a critical error if there is one; otherwise the turn with the biggest drop in `trust - friction` on a lost door, or the biggest gain on a won door; earliest on a tie. Each turn records the rule that fired, and the rubric maps that rule to a coaching moment and its strong-rep lines.
- Talk-to-listen ratio from rep speech milliseconds against customer line durations (words in text mode). Question count from `question_count`.
- Debrief order follows the brief: the rep's read first, timeline with hidden state revealed, turning point with the strong-rep line, stage bands, ratio and questions, try again (same persona, same seed, or jump back to the turning point).

### 1.7 Objection drill

Each drillable objection has a `drillStart` block in the pack: the persona list it can run with, the starting stage, trust and friction, and that objection at the head of the queue. A drill ends when the objection is handled (pass), friction hits the threshold (fail), or after three attempts. Next round rotates the persona.

Drill set for the prototype (four needed, five planned): `not_interested` (Field Manual B15), `already_checked` (B7, B13), `ill_sort_it_myself` (B19, B23), `whats_the_catch`, `who_are_you_with`.

## 2. Content pack layout

```
src/content/
  schema/                          JSON Schemas, one per file type below
  clients/
    rebuild-relief/
      client.json                  name, brand colours, approved wording, reviewer and date, voice env var names
      scenario.storm-door.json     meta: stages, time costs, trust bands, rubric thresholds, booking elements, interruption pool and schedule rules
      actions.json                 rep action ids: kind, classifier description, keywords, stage, review
      objections.json              id, trigger, handledWhen, answer elements, customer line refs, strong-line refs, drillStart, review
      compliance.json              rules, phrase patterns, severity, guard terms, source, review
      rubric.json                  criteria per stage, coaching moments, turning-point mapping, verdict text
      strong-lines.json            verbatim quote, manual section id, display text, review
      interruptions.json           dog, kid, phone: start lines, after-acknowledge lines, talked-over lines, keywords
      personas/
        busy-parent.json           start state, thresholds, variants, reaction table, topics and lines, poses, voice
        burnt-sceptic.json
        insurer-owner.json
        renter.json
        friendly-talker.json
      ui.json                      on-screen strings for this client (debrief questions, mode names)
  fixtures/
    second-pack/                   tiny made-up pack used only by tests, to prove a second client loads with no code change
public/
  voice/rebuild-relief/<hash>.mp3  recorded lines
  voice/rebuild-relief/manifest.json  hash of speaker + text + settings to file
  art/rebuild-relief/              doorways and persona poses (placeholder first)
```

GIG is a new folder under `clients/` when its pack is written. Nothing ships for GIG in the prototype.

Every line, option, objection, rule and criterion carries `review`. `npm run review-pack` turns the pack into a Markdown and Word review document with a tick column, a changes column and a sign-off block, for the field trainer and the compliance team.

## 3. Turn pipeline and latency budget

### 3.1 Voice turn

```
rep speaks
  -> browser mic (MediaRecorder), level meter, end-of-speech detector
  -> at 500 ms of silence: start upload speculatively (cancel if speech resumes)
  -> POST /api/turn {audio, sceneContext}         one round trip
       server: Scribe transcribe -> build allowed ids from pack -> Haiku classify (enum schema)
       returns {transcript, ids, ruleFlags, sttMs, classifyMs}
  -> phrase rules on transcript (compliance), derived events
  -> reduce(state, rep_turn) -> customer move -> line id
  -> play recorded line (preloaded) + caption
```

Fallbacks at each step follow framework section 9: Scribe fails, browser recognition; classify fails, keyword matcher; audio fails, captions only; function missing at load, scripted mode said on the title screen. None of these is scored.

### 3.2 Budget (end of rep speech to first sound of the reply)

Target from the brief: about 2,000 ms.

| Step | Budget (ms) | Basis |
| --- | --- | --- |
| End-of-speech detection | 800 | Framework 15.2: test 800 to 1,000, tune by ear |
| Upload to function (short clip, phone) | 150 | Budget. Measure in phase 6 |
| Scribe transcription | 500 | Budget. Not yet measured on this build |
| Classify, Haiku 5.5 effort low | 900 | Earlier build measured about 1,000 |
| Response back to phone | 50 | Budget |
| Engine and line pick | 10 | Pure code |
| Audio start, preloaded file | 50 | Recorded line, already in memory |
| **Total, serial** | **2,460** | |
| Speculative upload from 500 ms of silence | -300 | Overlaps the last 300 ms of the silence window |
| **Total with overlap** | **about 2,160** | |

That is over target on paper. Two things cover it:

- A recorded thinking beat ("Mm.", a glance inside, a shift of weight) plays if no reply is ready 1,200 ms after end of speech. The rep never hears dead air.
- Levers in order, each measured before the next: silence window down toward 800; Sydney functions region; keep the classify prompt short and its stable part cached; Scribe streaming if it beats batch on short clips. A keyword fast path that skips the AI on a single strong match would save about 900 ms, but it changes how words map to actions. James decides on that one only if the numbers stay over after the other levers.

Typed turn: send, then classify, then line. Budget about 1,100 ms.

### 3.3 Measuring

Measured from the first playable build (phase 3), not bolted on later. Each turn records: speech end, upload start, server `sttMs` and `classifyMs`, reply ready, first audio frame. Stored in session state, shown in presenter mode, and posted (numbers only, no transcript) to `/api/metrics`, which writes one log line per turn. E2E tests assert the numbers are present and sane.

## 4. Recorded lines per persona

Customer lines are drafted from each persona's situation and marked `review: pending` for the Rebuild Relief field trainer. They are customer speech, not sales theory, so nothing here is invented guidance. Strong-rep lines are separate (section 5) and are shown as text in the debrief, not voiced.

| Category | Lines per persona | Notes |
| --- | --- | --- |
| Door opens, first words | 3 | |
| Small talk | 48 | 16 topics, 3 lines each: the storm, the street, the kids, the dog, the footy, work, the weather, the house, the garden, the neighbours, the car, the weekend, the heat, school, traffic, the new place up the road |
| Answers to qualifying questions | 10 | Owner, inspected since storm, anyone else looked, insurance cover, partner. Two wordings each |
| Damage noticed | 6 | Two lines for each of three variants |
| Reply to the pitch by trust band | 9 | Low, warming, open; three each |
| Warming and cooling cues | 10 | Shorter answers, "Look, I've got to go", a question back |
| Objections | 7 per objection | Raise (3), re-raise (2), accept the answer (2). Sceptic has three objections, so 21 |
| Clarify ("Sorry?") | 4 | |
| Interruptions | 10 | Two per persona; start (2), after an acknowledgement (1), talked over (2). Lines aimed at the kid or the phone are labelled "to the kid", "on the phone" |
| Booking | 18 | Agree in principle (3), ask for each missing element (2 each for 4), name per variant (3), number (2), confirm readback (2) |
| Counterfeit yes | 3 | "Yeah, maybe" |
| Refusal and door close | 8 | Refuse (3), firm refusal (2), close (3) |
| Leaving well | 3 | Takes the card, "come back when my partner's home" |
| Thinking beats | 4 | Used to cover latency |
| Persona-specific | 6 to 10 | Parent asides, talker tangents, renter's "I'm just renting" and agent details, sceptic's past-tradie story |
| **Total** | **about 155** | Sceptic about 170 |

About 780 lines across five personas. Long replies use sentence parts (recorded once, played in sequence with a short pause) to get variety without recording every combination. Five voices, Australian accents, picked by ear with James.

## 5. Strong-rep lines: source map

All from `RebuildRelief_FieldManual.md` (Field Rep Edition). Stored verbatim in `strong-lines.json`; the screen shows em dashes as commas. Each is `review: pending` for the field trainer.

| Coaching moment | Line (section) |
| --- | --- |
| Opener | "Hey, how are you going? [Name] here from Rebuild Relief. Look, I know you've probably had a few companies knock lately, so I'll keep it quick." (B6) |
| Opener, what not to say | Never open with "Don't worry, I won't take up much of your time." (B16) |
| Qualify ownership | "Are you the homeowner?" Decision maker filter. If no, you are done. (B3) |
| Renter | "If the answer to the first question is no, do not pitch a tenant. Exit cleanly and move on." (B3) |
| Company wording | "We're a licensed claims management company." (B6 compliance note) |
| Hidden damage | "most of it isn't visible from the ground, it's in the seams, under the ridge, spots you'd only find if you knew exactly where to look." (B6) |
| Not interested | "Completely understand. Just so I'm clear, is that because you've already had it properly assessed, or just not something you've thought about?" (B15) |
| Already checked | "Would it be unreasonable to get a second set of eyes, given it costs you nothing either way?" (B7) |
| Sceptic, trust | "Sounds like trust might be a bit of an issue right now." / "What would it look like for us to give you that confidence?" (B17) |
| On the fence | "Can I take 60 seconds to explain exactly what we do and how it works? If after that you're not interested, I'll shake your hand and leave. Fair enough?" (B12) |
| No-oriented ask | "Would you be against having a free inspection just to rule it out?" (B11) |
| Insurer will handle it | "That's completely your right and we'd always support you doing that. What we offer is..." (B19 compliance note, B23) |
| Asking | "Know which one you are asking for, ask it clearly, and do not fill the silence after you ask." (A19) / "What's the best way to lock that in?" (B6) |
| Counterfeit yes | "A Counterfeit Yes ('sure, whatever') is the most dangerous, it looks like compliance and produces nothing." (A11) |
| Leaving well | "No worries at all, I appreciate your time." Warm, genuine. Leave the door open. Do not burn it. (B18) |
| Clear no | "If a homeowner states clearly and more than once that they do not wish to proceed, acknowledge it, thank them, and leave." (B19 compliance note) |

**Gaps: no manual line exists.** These coaching moments need a line from James or the trainer. Until then the debrief names the moment and shows no quote.

- Handling an interruption (dog, kid, phone).
- Getting the owner's or agent's details from a renter.
- "I don't sign anything at the door." (The manual's close moves to paperwork, B5. The prototype stops at a booked inspection.)
- Respecting a busy parent's time beyond "I'll keep it quick" (B2).

**Held back: manual lines that break the brief's compliance list or quote figures.** These are not used as strong-rep lines until James decides. Several sit in the manual's own scripts, so they may also need a manual update.

| Section | Line | Problem |
| --- | --- | --- |
| B8 | "We use licensed assessors and drone equipment" | Describes the inspector as licensed |
| B8 | "if there was something up there that your insurer would cover, would you want to know about it?" | Implies an insurance outcome |
| B4 | "we're picking up the $600 gap" | Dollar figure, financial promise |
| B19 | "$192 million in approved claims recovered", "2,500+ families", the premium-increase rebuttal, "A new roof... adds resale value" | Figures and outcome claims the brief says never to state without client sign-off |
| B23 | "Their assessor's job is to find the minimum. Ours is to find everything." | The brief's insurer persona books only if the rep doesn't bag the insurer |
| B13, B14 | "by then it's a maintenance issue, not an insurance claim", "five to seven years", "costs ten times" | Implies a claim outcome; figures need confirming |
| B13 | "we're still finding damage on properties where two or three other companies said there was nothing" | Unverified claim |
| B1 | "We've just finished a roof up the street" | Fine only when true. In the sim it is a claim under the evidence rule unless the scenario says a job is nearby |
| B5 | "Three signatures and your policy number" | Paperwork at the door is out of scope; the prototype books an inspection |

The manual also names Jordan Belfort in several headings (A2, A3, A20, A21, B9). Citations shown to reps use section ids only.

## 6. Build order, mapped to the definition of done

Each phase ends deployed, tested and logged in `docs/build-status.md`.

| Phase | Work | Definition of done items it closes |
| --- | --- | --- |
| 1. Scaffold | Vite, React, TypeScript, Vitest, Playwright, Netlify config, password gate edge function, ping function, `docs/engine.md` and `docs/ai-layer.md` stubs | Deployed on Netlify (first part) |
| 2. Engine core | Types, condition language and its test, seeded start, reducer, replay, determinism tests, booking tier, compliance phrase rules, evidence rule, turning point, scoring | Engine decides warm, cool, object, book, close; same inputs, same result. Compliance breaches detected |
| 3. Rebuild Relief pack v1 and text play | All five personas, objections, compliance, rubric, strong lines, keyword matcher, captions, poses with placeholder art, mode picker, latency marks from this build | Five personas playable. Text-only fallback with no AI and no voice. One link on a phone, pick a mode, start. Latency measured and logged (text path) |
| 4. Debrief | Read first, timeline with hidden state, turning point with source line, stage bands, ratio and questions, replay and jump-back | Debrief complete |
| 5. Objection drill | `drillStart` for five objections, rotation, short debrief | Drill works for at least four objections |
| 6. AI classify | `/api/turn` with Haiku, allowed-id enum, guard, timeouts, `ai_usage` logs, scripted-mode banner, server tests against a stand-in API, benchmark of 20 rep lines | Engine stays in charge with AI in the loop |
| 7. Customer voice | Write all lines, `npm run prewarm-voices`, manifest, player with `after` marker, audio unlock, captions with "speaking", thinking beat, voices toggle | Customer replies with a voice and captions |
| 8. Rep voice | Scribe in `/api/turn`, browser fallback, auto-send, end-of-speech tuning, headset fix, mic check page, speculative upload | Rep can talk by voice or type. Voice latency measured and logged |
| 9. Ship | Presenter mode, review pack generator, e2e at four sizes against local and live, latency report, screenshots, independent code review | Deployed and tested on a phone-sized screen in a headless browser. `docs/build-status.md` up to date |

Phases 1 to 5 need no keys beyond the gate. Phase 6 needs `ANTHROPIC_API_KEY`. Phases 7 and 8 need `ELEVENLABS_API_KEY` and voice picks.

## 7. Keys and decisions waiting on James

Keys go into Netlify environment variables, never into chat or the repo.

| Item | Needed by |
| --- | --- |
| Netlify site for this repo; functions region set to Sydney if the plan allows | Phase 1 |
| `SITE_PASSWORD`, `GATE_SECRET` | Phase 1 |
| `ANTHROPIC_API_KEY` | Phase 6 |
| `ELEVENLABS_API_KEY`; five Australian voices picked by ear | Phase 7 |
| Framework section 17 additions | Any time; folded in when they arrive |
| Held-back manual lines (section 5): keep out, or rewrite in the manual | Phase 3 |
| Lines for the four gaps (section 5) | Phase 3, or the debrief shows the moment without a quote |
| Proposed compliance additions (section 1.5) | Phase 3, then the compliance team |
| Fictional phone number range for customers | Phase 7 |

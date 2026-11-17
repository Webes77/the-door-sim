# How the engine works

For developers and reviewers. Code: `src/engine/`. Content: `src/content/clients/gig/`.

The practice shift (The Intro and Broadbent Risk) has its own small engine in `src/engine/shift/`. Its actions, hidden state and scoring are in `docs/first-shift-plan.md`. The rest of this file describes the door engine.

## The split

- `reduce(state, action, pack)` is pure. It reads no clock, no random number and no network.
- `start(pack, personaId, seed)` draws everything random once: which donor variant, and which turn the interruption lands on.
- `replay(pack, personaId, seed, actions)` rebuilds a whole door. The debrief's "go back to this moment" uses it.
- The pack holds every word, number and rule. The engine knows only kinds, flags and counters (`src/engine/types.ts`).

## Actions into the engine

| Action | From | What it does |
| --- | --- | --- |
| `knock` | UI | Opens the door. The donor says her first line. |
| `rep_turn` | The matcher (later the AI classifier) | Carries the rep's words, the action ids they matched, and speech seconds if spoken. |
| `walk_away` | UI | Ends the door. A sign-up only counts if the details were complete. |

## Kinds of rep action

The pack lists the action ids. Each id has one kind. A test fails the build if a pack uses a kind the engine does not know.

`greet`, `introduce`, `compliment`, `question`, `problem`, `transition`, `solution`, `factor`, `checkin`, `close`, `acknowledge`, `understand`, `confirm`, `argue`, `ack_interruption`, `consolidate`, `leave`, `slip`.

## Hidden state

| Field | Meaning |
| --- | --- |
| `impulse` | 0 to 100. The donor's willingness to act. Never shown in play. |
| `attentionLine`, `buyingLine` | In the pack. Below the first for two turns running, the door closes. A close only lands above the second. |
| `stage` | Introduction, Problem, Solution, Close, Consolidation. |
| `secondsSinceQuestion` | Past the pack's limit (30 seconds) it is KILL. Text turns estimate seconds from word count. |
| `objectionQueue`, `openObjection` | Objections the donor will raise, and the one on the table with its deflect steps: acknowledged, confirmed, re-impulsed. |
| `closes` | Every ask, with its method and whether impulse was above the Buying Line. |
| `refusals`, `genuineNo` | Three asks that do not land and the donor gives a genuine no. Asking again is a critical error. |
| `agreed`, `details` | A sign-up needs agreement, a frequency and a name. A "maybe" is never a sign-up. |
| `reaction` | Which clip the donor plays. Set by the engine, never by the AI. |
| `turns` | Every turn with impulse before and after, the stage and what fired. The debrief reads this. |

## How a turn runs

1. No matched action: the donor says "Sorry?" and nothing changes.
2. Interruption follow-up: acknowledged or talked over.
3. KISS vs KILL check.
4. Each matched action applies its effect once. A compliment only counts if the thing is in the scene (evidence rule). Otherwise it is a fake compliment, a critical error.
5. If the open objection has all three deflect steps, it is handled.
6. A close is judged: genuine no already given, too early, objection still open, below the Buying Line, next objection, or agreement.
7. After agreement, details and the self-justification question.
8. The donor's line and reaction are picked. First match wins.
9. Low attention can close the door. The seeded interruption may fire.

## What would you say

`src/engine/guide.ts` is help, not rules. `nextMoment(state, pack)` finds the example line the pack would say next: the interruption, the consolidation, the objection steps, or the earliest pitch step not yet done (a step is done when its line was said or its `doneWhen` condition holds). `optionsFor(state, pack)` returns that strong line with up to two weak lines from `scenario.choices`, mixed in an order drawn from the seed and the turn number, so the same door always shows the same options. `weakLineFor(text, pack)` lets the debrief show the manual's words beside a weak line.

Two engine rules came with it:

- Kind `slip`: a weak habit the pack names (general talk, a list of programs, a tentative ask, celebrating early). It applies its `impulse` every time, records its `mark` as an event, and the donor answers with its `line`. The pack gives each mark its event text and coaching.
- On a KILL turn nothing lands. Greetings, questions, problem points, solution points, factors and check-ins in that turn are not counted and gain nothing, so the rep has to say them again properly.

Condition atoms now include `detail:name` and `detail:frequency`.

## Stage practice

`start(pack, personaId, seed, drill)` starts a practice of one stage. The pack's `drills` block names the lines to play first (the prelude), when the practice ends and which rubric stages it is judged on. The prelude runs through the same reducer as any other turn, with no interruption, so it lands the same way for every seed. Prelude turns are marked and left out of the practice result.

## Scoring

- Rubric in `scenario.json`: criteria per stage, one point each, written in the condition language (`src/engine/conditions.ts`): `always`, `not:x`, `a|b`, `count:n:a,b`, `did:<action>`, `flag:<flag>`, `min:<counter>:<n>`.
- Bands: strong at 80 per cent, getting there at 50 per cent. Thresholds in the pack.
- Two verdicts. A critical error always forces the performance verdict down.
- Turning point: a critical error first. On a sign-up, the last recovery. Otherwise the rep's biggest drop. A planned objection is never the turning point of a lost door.

## Tests

`npm test` covers the pack (kinds, conditions, donor lines, coaching lines) and the rules (determinism, sign-up, maybe, KILL, fake compliment, early close, arguing, genuine no, unclear input, no repeats). `npm run e2e` plays good and poor doors in a headless browser at four screen sizes.

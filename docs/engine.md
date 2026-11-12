# How the engine works

For developers and reviewers. Code: `src/engine/`. Content: `src/content/clients/gig/`.

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

`greet`, `introduce`, `compliment`, `question`, `problem`, `transition`, `solution`, `factor`, `checkin`, `close`, `acknowledge`, `understand`, `confirm`, `argue`, `ack_interruption`, `consolidate`, `leave`.

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

## Scoring

- Rubric in `scenario.json`: criteria per stage, one point each, written in the condition language (`src/engine/conditions.ts`): `always`, `not:x`, `a|b`, `count:n:a,b`, `did:<action>`, `flag:<flag>`, `min:<counter>:<n>`.
- Bands: strong at 80 per cent, getting there at 50 per cent. Thresholds in the pack.
- Two verdicts. A critical error always forces the performance verdict down.
- Turning point: a critical error first. On a sign-up, the last recovery. Otherwise the rep's biggest drop. A planned objection is never the turning point of a lost door.

## Tests

`npm test` covers the pack (kinds, conditions, donor lines, coaching lines) and the rules (determinism, sign-up, maybe, KILL, fake compliment, early close, arguing, genuine no, unclear input, no repeats). `npm run e2e` plays good and poor doors in a headless browser at four screen sizes.

# Build status

Updated at the end of every session.

## Done

1. 12 November 2026, James asked: wrote `CLAUDE.md` (golden rule, ownership, build rules, keys, writing rules, session discipline) from the brief and the framework.
2. 12 November 2026, James asked: wrote `docs/plan.md`: engine actions and hidden state, content pack layout, turn pipeline with a latency budget, recorded lines per persona, strong-rep line source map from the Rebuild Relief field manual, build order mapped to the definition of done.
3. 12 November 2026: read `RebuildRelief_FieldManual.md` from Drive (sections A, B and C headings; section B in full). Found manual lines that conflict with the brief's compliance list. Listed in `docs/plan.md` section 5, held back from the app.

4. 12 November 2026, James decided: GIG is the proof of concept. Rebuild Relief is paused. Read GIG's "First 4 Weeks Training Manual" (all 54 pages) and logo. Added the GIG direction to the top of `docs/plan.md` and updated `CLAUDE.md`.

5. 12 November 2026, James decided the art direction: stylised 3D game characters that move. Built a motion mock-up with one animated donor (six reactions), the debrief impulse curve and the reset beat. Details and Higgsfield job ids are in `docs/plan.md`.

6. 12 November 2026, James said keep going. Built the first playable version for GIG:
   - App shell: Vite, React, TypeScript. Phone first. GIG logo and colours.
   - Dashboard, Onboarding placeholder, Sales skills (eleven systems from the manual, each with Taught, Understood, Applied badges), campaign brief, the practice door, the debrief and the reset beat between doors.
   - Rules engine (`src/engine/`): impulse with the Attention Line and Buying Line, the five stages, KISS vs KILL, closes and closing methods, two objections with the five-step deflect, the genuine no, sign-up details, one seeded interruption, the evidence rule for compliments, critical errors, rubric, turning point.
   - GIG content pack (`src/content/clients/gig/`): placeholder charity, one donor with three variants, 38 rep actions with keyword lists, rubric with manual page references, 22 quotes from the manual for the debrief.
   - Donor: nine reactions as animation clips (`public/art/gig/donor1/`). The engine picks the reaction.
   - The rep can type, tap an example line, or speak (browser speech recognition, where the browser has it).
   - Tests: 17 engine and pack tests (`npm test`). Headless playthroughs of a good door and a poor door (`npm run e2e`).
   - `docs/engine.md` and `docs/ai-layer.md` written.

7. 15 November 2026, James said the door did not feel real: no walk to the door, no script, not enough of the manual. Changed:
   - The approach: a street view, a walk up the path, the closed door, "what you notice", a knock sound, then the door opens. New clips `walk.mp4` and `opening.mp4`.
   - Every system in the manual is now a lesson in the manual's own words (`lessons.json`, 18 lessons, p8 to p47): what it is, why it matters, weak and strong examples, what to avoid, focus points, remember, daily target, try this today, and the Taught, Understood, Applied sign-off. Obvious typos in the manual were corrected. The KPI page and the figures on the Impulse Curve are left out, as agreed.
   - Stage practice: each of the five stages can be practised on its own at the door. The engine plays the earlier stages first so the donor is in the right place. Introduction starts with the walk-up.
   - A "Keys" button at the door shows the daily target, strong example, what to avoid and the remember line for the stage the rep is in.
   - The pitch script: example lines for each stage for the placeholder charity.
   - Dashboard now leads with "Week 1: Learn the pitch before hitting the field" and the five stages.
   - Voice: six Australian-accent samples made for James to choose from (https://claude.ai/artifact/PSF9jKwZqwM5mUm9na1GaH). The app can play recorded donor lines from `public/voice/gig/donor1/manifest.json`. The manifest is empty until a voice is chosen.
   - Tests: 22 engine and pack tests. Headless playthroughs now include the walk-up, the Introduction practice, the Close practice and the lesson pages.

8. 15 November 2026, James asked for Australian voices and said Isla, Imogen and Nora all sound good. Done:
   - Donor 1 now speaks. All 109 of her lines are recorded in the Imogen voice (`public/voice/gig/donor1/`, 2.1 MB). Isla and Nora are kept for the next two donors.
   - Each recording was trimmed and levelled so the lines start promptly and sit at the same volume.
   - Playback was rebuilt for phones: sound is unlocked by the rep's own taps, the recordings are fetched when the door opens, and two lines in one turn play one after the other.
   - A "Voice on / off" chip at the door. Captions always show.
   - Tests: 24 engine and pack tests, including one that fails if any donor line has no recording. The headless playthrough now checks that the recorded voice plays.
   - Cost: about 34 Higgsfield credits for the 109 lines (0.23 or 0.46 a line). Account balance afterwards: 272.7 credits.

9. 15 November 2026, James said the door gave only one line to choose and needed bad choices ("What would you say?"). Done:
   - At every step of the pitch the rep is offered three lines in a mixed order: one strong, up to two weak. The donor reacts to whichever they pick.
   - 31 weak lines, built from the manual's own weak examples and "what to avoid" lists and reworded for the placeholder charity. Each is tied to the manual wording and page it shows.
   - The debrief shows the manual's words beside any weak line the rep tapped.
   - Engine: a `slip` kind for weak habits the pack names (general talk, a list of programs, a tentative ask, celebrating early). Nothing lands on a KILL turn. A too-early ask costs more (16, was 8). A rep who jumps ahead is brought back to the step they skipped.
   - Tests: 34 engine and pack tests. Every weak line is checked to cost what it should. Picking the strong line every time signs her up on 24 different doors.

10. 15 November 2026, James asked whether Magnum branding would be better. Done:
   - The app shell is now Magnum AI branded by default, in the Magnum AI house style, with the delivered mark from the design system. GIG is still named as the source of the training content.
   - The brand is one build setting. `VITE_BRAND=gig` brings the GIG Academy look back.
   - The house style checker flags one line in `src/brand-magnum.css`: the rule that removes rounded corners and shadows. That is a false positive.

## Known issues

- Not deployed to Netlify. There is no Netlify site or password yet. A private preview copy is at https://claude.ai/artifact/SkuRsSfABmQ8gBRVDdwqi1 (built with `VITE_BASE=./`). The microphone does not work inside that preview.
- No AI yet. The rep's words are matched by keyword lists, so wording outside the lists gets "Sorry?". The AI classifier comes with the Anthropic key. Tapped choices always work.
- The weak lines are drafts. James and GIG's trainer have not reviewed them.
- The Magnum heading style colours one word per heading. Where a heading comes from data, the last word is coloured.
- The donor's voice has not been heard by the builder, which cannot hear audio. Lengths and volume were checked by measurement. James needs to listen for any line that sounds like a different person, has the wrong accent, or says a name badly (Nguyen, Petrakis). Those lines can be re-recorded one at a time.
- The door-opening clip has a moment where the door hardware looks wrong mid-swing. Check it by eye.
- The lessons, the manual quotes and the page references are GIG's training manual word for word. Under any branding, that content can only be shown to GIG until it is swapped for content James owns or GIG agrees.
- The lesson examples are the manual's own (Children's Hospital, Humane Society). The campaign lines are drafts for the placeholder charity.
- Speech recognition is the browser's own and has only been wired up, not tested on real phones.
- The donor's mouth does not move when she speaks. Moving between two reactions always passes back through the open pose, which takes about four seconds.
- The charity is a placeholder and the conduct rules are placeholders. The only critical errors so far come from the sales manual: a fake compliment (p39) and asking again after a genuine no (p28).
- One coaching moment has no line in the manual: talking over an interruption.
- Reply latency is logged to the browser console only (`latency_ms` for the caption, `voice_latency_ms` for her first sound). With no AI in the loop it is the 650 ms caption beat plus a few milliseconds to start the recording.
- S.E.E.N., body language, tone and matching cannot be scored from words. They are read-only skill pages.
- Rebuild Relief items (paused): latency budget and four manual gaps, see `docs/plan.md` sections 3 and 5.

## Next

1. James plays it with the voice on and says what feels wrong: the weak choices, the Magnum look, and any voice line that needs re-recording.
1a. James decides what content a Magnum-branded demo teaches when it is shown to anyone other than GIG.
2. Deploy to Netlify behind the password gate.
3. AI classifier (`/api/turn`).
4. More donors (two more situations), and real conduct rules from the onboarding document.
5. Presenter mode and the review pack for GIG.

## Waiting on James

- GIG website (colours and fonts), onboarding document (rules of conduct), campaign brief or OK for a fictional placeholder charity.
- A Netlify site for this repo, with `SITE_PASSWORD` and `GATE_SECRET` set in its environment variables.
- Where the GIG manual should live for future sessions.

- Netlify site, with `SITE_PASSWORD` and `GATE_SECRET` set. Functions region Sydney if the plan allows. `[NEEDS CONFIRMING]`
- `ANTHROPIC_API_KEY` before phase 6. `ELEVENLABS_API_KEY` and voice picks before phase 7.
- Framework section 17 additions.
- Decision on held-back manual lines, and lines for the four gaps.
- Sign-off on proposed compliance additions: deadline language, fourth loop, right to manage own claim.
- Fictional phone number range for customers.

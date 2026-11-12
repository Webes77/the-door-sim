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

## Known issues

- Not deployed. There is no Netlify site or password yet, so the app runs locally only.
- No AI yet. The rep's words are matched by keyword lists, so wording outside the lists gets "Sorry?". The AI classifier comes with the Anthropic key.
- No donor voice yet. Her words are captions. Voice comes with the ElevenLabs key.
- Speech recognition is the browser's own and has only been wired up, not tested on real phones.
- The donor's mouth does not move when she speaks. Moving between two reactions always passes back through the open pose, which takes about four seconds.
- The charity is a placeholder and the conduct rules are placeholders. The only critical errors so far come from the sales manual: a fake compliment (p39) and asking again after a genuine no (p28).
- One coaching moment has no line in the manual: talking over an interruption.
- Reply latency is logged to the browser console only. With no AI or voice in the loop it is the 650 ms caption beat.
- S.E.E.N., body language, tone and matching cannot be scored from words. They are read-only skill pages.
- Rebuild Relief items (paused): latency budget and four manual gaps, see `docs/plan.md` sections 3 and 5.

## Next

1. James plays it and says what feels wrong.
2. Deploy to Netlify behind the password gate.
3. AI classifier (`/api/turn`), then recorded donor voice with Australian voices.
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

# Brief: AI sales practice simulator

Working title: The Door. Version 0.1, 12 November 2026. Owner: James Wheable, Magnum AI.

## 0. How to use this brief

This brief is for Claude Code. Read it fully before writing any code. It defines what to build, the rules the build must follow, and what counts as done for the first prototype. Where a decision is still open, section 16 lists the default to use. Do not stop to ask about those defaults. Build with them.

This is a new, separate product. Do not copy code, content or assets from any other repository, including the Home in 72 care simulation built for the Global Academy of Care. That work belongs to a different client. Build this from scratch.

## 1. What we are building and why

Sales reps get better by doing reps. New door-to-door and phone reps learn on real customers, and every bad door costs a lead. Managers and trainers don't have time to role-play with every rep, and role-play with a colleague never feels real.

We are building a practice simulator. A rep talks out loud to an AI customer at a virtual door. The customer behaves like a real person: busy, sceptical, distracted, sometimes friendly, sometimes not. The rep has to open, build rapport, qualify, present, handle objections and ask for the booking. The customer reacts to how the rep actually performs. At the end, a debrief shows what happened, where it turned, and what a strong rep would have done at that moment.

The first prototype proves three things:

1. The conversation feels real enough that a rep forgets it's a simulation within the first minute.
2. The customer's behaviour follows rules we control, so the same performance gets the same result and the scoring is fair.
3. The debrief teaches something specific and useful in under two minutes.

## 2. Who it's for

**Pilot client: Rebuild Relief.** Rebuild Relief is a Queensland storm damage insurance claims management company. Its door-to-door reps knock on doors after storms and book a free roof inspection. They don't inspect roofs themselves. An inspector follows up. Many reps are new to sales. They train mostly by phone, often from the car.

**Second client, after the pilot: GIG (Global Interactive Group).** GIG runs face-to-face sales and charity fundraising across Australia, New Zealand, Ireland and the UK. GIG would need its own scenario pack. The engine must support this without code changes.

**Primary user:** a rep practising alone on their phone, between doors, in the car or at home.

**Secondary user:** a trainer or manager who assigns scenarios and reviews results. The manager view is out of scope for the first prototype.

## 3. The golden rule

**AI plays the customer. The engine plays the rules.**

- The scenario engine owns the customer's hidden state, what they know and want, what will move them, what makes them close the door, the clock, compliance and the scoring. The same rep performance from the same starting state always gives the same result.
- The AI layer does two jobs only. It interprets what the rep said and classifies it into the actions the engine understands. It also speaks as the customer, expressing the state the engine gives it. The AI never decides on its own whether the customer books, never invents facts about the customer's house, insurance or storm damage, and never changes the rules.
- Every AI call has a scripted fallback. If AI, voice or the network fails, the session pauses and offers text mode. Technical failures are never scored against the rep.

## 4. The pilot scenario: the storm door

**Setting.** A suburban street in South East Queensland, a few days after a hailstorm. The rep knocks on a door. The aim is to book a free roof inspection with the homeowner.

**What the rep is offering (approved wording only).** A free roof inspection by an independent and professionally trained roof inspector. Rebuild Relief is a licensed claims management company. The rep must never promise an insurance outcome.

**The customer is drawn from a set of personas.** Each persona has a hidden state the engine tracks:

| Hidden state | Example values |
| --- | --- |
| Trust | low, warming, open |
| Time pressure | none, some, high |
| Decision maker | yes, needs partner, not the owner |
| Storm awareness | noticed damage, unsure, none |
| Insurance situation | insured, unsure, already claimed |
| Objection queue | the objections they'll raise, in order, until each is handled |
| Door threshold | how much friction they tolerate before closing the door |

**Starter personas for the prototype (five):**

1. **The busy parent.** Mid-dinner, kids in the background, high time pressure. Will book if the rep is quick, clear and respectful of time. Closes the door on a long pitch.
2. **The burnt sceptic.** Retired, has been stung by tradies before. Low trust. Objections: "What's the catch?", "Who are you with?", "I don't sign anything at the door." Books if the rep is calm, credible and doesn't push.
3. **The "insurer will handle it" owner.** Believes they'll just ring their insurer. Objection: "I'll sort it myself." Books if the rep explains the value of an independent inspection without bagging the insurer or promising outcomes.
4. **The renter.** Not the owner. The right move is to qualify early, stay friendly, and get the owner's or agent's details if appropriate. Pushing for a booking is a mistake.
5. **The friendly talker.** Warm, chatty, loves a yarn, never commits. Tests whether the rep can steer the conversation and actually ask for the booking.

Each playthrough picks one persona, and its details vary slightly (names, street, damage noticed) so reps can't memorise answers.

## 5. How it plays

**Core loop.** The rep knocks. The door opens. The rep speaks. The customer responds. The engine updates hidden state after every turn. The conversation ends when the rep books the inspection, the customer closes the door, or the rep walks away.

**Conversation stages the engine recognises:** opener, rapport, qualifying, presenting, objection handling, asking for the booking, confirming details, leaving well.

**Clues, not meters.** No trust bar, no score on screen during play. The rep reads the customer: shorter answers, glancing back inside, arms folded (shown in the art), a warmer tone, a question back. The rep has to notice and adjust.

**Interruptions.** The dog barks. A kid calls out. The customer's phone rings. Good reps acknowledge it and adjust. Bad reps talk over it.

**Talk out loud.** The rep speaks. Their words appear as a transcript. The customer speaks back with a real voice and captions. Text input is always available as a fallback.

**What counts as a booking.** The engine only records a booking when the customer has agreed to a time and the rep has confirmed the basics (name, the best number, the time). A "yeah, maybe" is not a booking.

**Leaving well.** Even a "no" can end well: thanks, a card left, a door left open for later. The engine scores this.

## 6. Compliance is part of the engine

Compliance rules live in a data file owned by the client, not in code. For Rebuild Relief the starting list is:

- Never promise or imply an insurance outcome ("your insurer will pay", "you'll get a new roof").
- Never say "no win, no fee".
- Never describe the inspector as "licensed". The approved wording is "independent and professionally trained roof inspector".
- The approved company wording is "licensed claims management company".
- Never pressure a non-owner to book.

When the rep breaks a compliance rule, the engine records a **critical error**. It never hides inside a high score. A booking won with a compliance breach is shown as a failed booking in the debrief. The client's compliance team must approve this list before the pilot.

## 7. Debrief and scoring

The debrief is the product. The conversation creates the experience. The debrief turns it into skill.

**Two separate verdicts.**

1. **Did you sell well?** How the rep performed, stage by stage.
2. **What happened at the door?** Booked, not booked, or left well.

A strong performance that didn't book is still a strong performance. A booking won by pressure or a non-compliant claim is still a failure.

**The debrief shows, in this order:**

1. **Your read first.** One question before any feedback: "Where did that door turn, and why?"
2. **The timeline.** Each turn of the conversation, what the customer's hidden state was at that moment (now revealed), and what changed.
3. **The turning point.** The single moment that most decided the outcome, with what a strong rep would have said instead. That guidance comes from the client's own training material, not invented sales theory.
4. **Scores by stage.** Opener, rapport, qualifying, presenting, objection handling, asking, compliance, leaving well. Simple bands (needs work, getting there, strong), not percentages.
5. **Talk-to-listen ratio** and how many questions the rep asked.
6. **Try it again.** Replay the same persona, or jump back to the turning point and try a different line.

**The scoring rubric is data, loaded per client.** For Rebuild Relief it is built from James's existing Rebuild Relief training material: the field manual and the onboarding steps. Keep the rubric in its own file so a trainer can change it without code changes.

## 8. Modes

| Mode | Prototype? | What it does |
| --- | --- | --- |
| Practice | Yes | A random persona, the full door, then the debrief. |
| Objection drill | Yes | One objection on repeat with different personas. Short and fast. |
| Challenge | Later | The hardest personas, stricter door thresholds. |
| Assigned | Later | A manager assigns a scenario to a rep and sees the result. |

## 9. Devices

Phone first, because that's where reps are. It must also work on a tablet or laptop. It needs a microphone, and headphones are recommended. One link, nothing to install.

## 10. Technical approach

- **App:** TypeScript, Vite, React. A mobile-first single-page app.
- **Hosting:** Netlify. Netlify Functions hold all API keys. No keys in the browser and none committed to the repo.
- **Customer dialogue and classifying the rep's words:** Claude API via a Netlify Function. Two steps per turn: classify the rep's words into engine actions, then voice the engine-approved customer response.
- **Speech to text (rep's voice):** start with the browser's built-in speech recognition for the prototype, behind an interface so a hosted speech-to-text service can replace it.
- **Text to speech (customer's voice):** ElevenLabs, with Australian voices. Browser speech as the fallback.
- **Latency target:** the customer starts replying within about two seconds of the rep finishing. Measure it from the first build. This is the hardest technical problem in the product. If it can't be met, show a natural "thinking" beat (a pause, a glance) instead of dead air.
- **Art:** illustrated 2D doorways and characters, with light animation on the customer (shifting weight, glancing back inside). Placeholder art is acceptable for the first build.
- **Scenario data:** personas, objections, compliance rules and rubric in JSON files, separate from code, with a clear schema.

## 11. Data and privacy

- All customers are fictional. No real customer or lead data anywhere.
- Rep audio is not stored. Transcripts are kept only in the browser for the session, unless a later version adds manager reporting with notice to reps.
- No client data is used to train any model.

## 12. Content we need, and where it comes from

| Content | Prototype source | Pilot source |
| --- | --- | --- |
| Personas and objections | Drafted from James's Rebuild Relief work | Checked with the Rebuild Relief field trainer and reps |
| What a strong rep would say | James's Rebuild Relief field manual and onboarding material | Same, reviewed by the trainer |
| Compliance list | Section 6 of this brief | Approved by Rebuild Relief's compliance team |
| Real numbers (conversion, deal value) | Not needed | Only if the client supplies them. Never invent figures. |

## 13. Rules for this build

- Data separate from code. Personas, objections, compliance and rubric are all data files.
- On-screen text: plain Australian English, short sentences, no em dashes, no American sales jargon.
- Never name Jordan Belfort in anything a rep sees.
- No invented statistics, conversion rates or outcomes.
- Customers are people, not stereotypes. Their behaviour comes from their situation, never from age, gender or background.
- Keep a `docs/build-status.md` file updated at the end of every session, with what's done, what's next and anything waiting on James.

## 14. Prototype definition of done

The prototype is done when all of these are true:

- [ ] A rep can open one link on a phone, pick Practice or Objection drill, and start.
- [ ] All five personas are playable in Practice mode, each with its own hidden state, objections and door threshold.
- [ ] The rep can talk by voice or type. The customer replies with a voice and captions.
- [ ] The engine, not the AI, decides when the customer warms, cools, objects, books or closes the door. The same inputs give the same result.
- [ ] Compliance breaches are detected and shown as critical errors.
- [ ] The debrief shows the rep's read first, the timeline with hidden state revealed, the turning point, stage scores, talk-to-listen ratio, and a replay option.
- [ ] Objection drill mode works for at least four objections.
- [ ] Text-only fallback works with no AI and no voice. Every persona is still playable with scripted responses.
- [ ] Customer reply latency is measured and logged.
- [ ] It's deployed on Netlify and tested on a phone-sized screen in a headless browser.
- [ ] `docs/build-status.md` is up to date.

Stop early only for: an API key James needs to supply, or a decision that changes the product's direction.

## 15. Out of scope for the prototype

Manager dashboards and logins. Multiple clients live at once (the engine must support it, but only Rebuild Relief content ships). Phone-sales scenarios. Tonality scoring from audio. Leaderboards. Payments.

## 16. Open decisions (defaults to use)

| Decision | Default |
| --- | --- |
| First client scenario | Rebuild Relief storm door. GIG second. |
| Voice or text first | Voice first, text always available. |
| Speech to text | Browser built-in for the prototype. |
| Customer voices | ElevenLabs, Australian accents. |
| Repo name | `the-door-sim`, private, under Webes77. |
| Product name | Working title only. Don't use it in on-screen branding yet. |

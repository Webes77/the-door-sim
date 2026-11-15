import { describe, expect, it } from "vitest";
import { lessons, pack } from "../src/content/pack";
import { validate } from "../src/engine/conditions";
import { reduce, replay, start } from "../src/engine/engine";
import { nextMoment, optionsFor } from "../src/engine/guide";
import { matchActions } from "../src/engine/match";
import { debrief } from "../src/engine/score";
import { KINDS, type Action, type State } from "../src/engine/types";
import voiceManifest from "../public/voice/gig/donor1/manifest.json";

const P = "home-afternoon";
const say = (text: string, seconds?: number): Action => ({ type: "rep_turn", text, ids: matchActions(text, pack.scenario.actions), seconds });
const S = pack.scenario.suggestions;

// A strong door, built from the pack's own example lines.
const good: Action[] = [
  { type: "knock" },
  say(S.introduction[0]),
  say(S.introduction[1]),
  say(S.problem[0]),
  say(S.interruption[0]),
  say(S.problem[1]),
  say(S.solution[0]),
  say(S.solution[1]),
  say(S.close[0]),
  say(S.objection[0]),
  say(S.objection[1]),
  say(S.objection[2]),
  say(S.objection[3]),
  say(S.consolidation[0]),
  say(S.consolidation[1]),
  say(S.consolidation[2]),
  say(S.consolidation[3]),
];
const CLOSE_AT = good.findIndex((a) => a.type === "rep_turn" && a.text === S.close[0]); // the first ask

function seedFor(variant: number): number {
  for (let seed = 1; seed < 500; seed++) if (start(pack, P, seed).variant === variant) return seed;
  throw new Error("no seed");
}

describe("content pack", () => {
  it("uses only kinds the engine knows", () => {
    for (const a of pack.scenario.actions) expect(KINDS, a.id).toContain(a.kind);
  });
  it("uses only conditions the engine understands", () => {
    const problems: string[] = pack.scenario.rubric.flatMap((r) => [
      ...(r.onlyIf ? validate(r.onlyIf, pack) : []),
      ...r.criteria.flatMap((c) => validate(c.when, pack)),
    ]);
    for (const d of Object.values(pack.scenario.drills)) problems.push(...validate(d.endWhen, pack), ...validate(d.preludeUntil, pack));
    expect(problems).toEqual([]);
  });
  it("has a donor line for every key the engine can ask for", () => {
    const keys = [
      "open_door", "sorry", "greeting", "fake_compliment", "listening", "interested", "keen", "buying_sign",
      "checkin_yes", "checkin_flat", "drift", "kill", "too_early", "not_yet", "refuse_again", "understand",
      "acknowledged", "confirm_yes", "argued", "agree", "agree_frequency", "agree_name", "give_name",
      "give_frequency", "give_reason", "reinforced", "genuine_no", "interruption", "interruption_thanks",
      "close_door", "close_door_firm", "goodbye_signed", "goodbye_warm", "goodbye_flat",
      ...pack.scenario.objections.map((o) => `objection:${o.id}`),
      ...pack.scenario.actions.filter((a) => a.kind === "question").map((a) => `topic:${a.topic}`),
    ];
    for (const p of pack.personas) for (const k of keys) expect(p.lines[k], `${p.id} ${k}`).toBeTruthy();
  });
  it("has coaching lines that exist", () => {
    const ids = new Set(pack.strongLines.map((l) => l.id));
    for (const c of Object.values(pack.scenario.coaching)) for (const l of c.lines) expect(ids.has(l), l).toBe(true);
  });
  it("puts no em dash in donor lines or rubric labels", () => {
    const text = JSON.stringify([pack.personas, pack.scenario.rubric, pack.scenario.suggestions, pack.scenario.eventText, pack.campaign, pack.scenario.drills]);
    expect(text.includes("—")).toBe(false);
  });
});

describe("recorded voice", () => {
  const manifest: Record<string, string> = voiceManifest;
  const files = Object.keys(import.meta.glob("../public/voice/gig/donor1/*.mp3")).map((p) => p.split("/").pop());

  it("has a recording for every line the donor can say, for every variant", () => {
    const persona = pack.personas[0];
    const missing: string[] = [];
    for (const v of persona.variants) {
      for (const list of Object.values(persona.lines)) {
        for (const raw of list) {
          if (raw.includes("{{dog}}") && !v.dog) continue;
          const text = raw.replaceAll("{{name}}", v.name).replaceAll("{{last}}", v.last).replaceAll("{{dog}}", v.dog);
          if (!manifest[text]) missing.push(text);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("points only at files that exist", () => {
    expect(files.length).toBeGreaterThan(0);
    expect(Object.values(manifest).filter((f) => !files.includes(f))).toEqual([]);
  });
});

describe("what would you say", () => {
  const { suggestions, choices, eventText, actions } = pack.scenario;
  const play = (s: State, text: string, seconds?: number) => reduce(s, { type: "rep_turn", text, ids: matchActions(text, actions), seconds }, pack);
  const allWeak = Object.values(choices).flatMap((list) => list.flatMap((b) => b.weak));

  it("has weak lines beside every example line", () => {
    for (const [key, list] of Object.entries(suggestions)) expect(choices[key]?.length, key).toBe(list.length);
    for (const list of Object.values(choices)) for (const b of list) expect(b.weak.length).toBeGreaterThan(0);
  });

  it("uses each line of text once only", () => {
    const texts = [...Object.values(suggestions).flat(), ...allWeak.map((w) => w.text)];
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("understands every 'no longer needed' condition", () => {
    const problems = Object.values(choices).flatMap((list) => list.flatMap((b) => (b.doneWhen ? validate(b.doneWhen, pack) : [])));
    expect(problems).toEqual([]);
  });

  it("explains every weak line in the manual's own words", () => {
    const manual = JSON.stringify(lessons) + JSON.stringify(pack.strongLines);
    expect(allWeak.filter((w) => !manual.includes(JSON.stringify(w.shows).slice(1, -1))).map((w) => w.shows)).toEqual([]);
    expect(allWeak.filter((w) => !/^p\d+$/.test(w.source)).map((w) => w.text)).toEqual([]);
  });

  it("names every slip in the debrief", () => {
    const marks = actions.filter((a) => a.kind === "slip").map((a) => a.mark ?? a.id);
    expect(marks.filter((m) => !eventText[m] || !pack.scenario.coaching[m])).toEqual([]);
  });

  it("offers the strong line and up to two weak ones, the same way for the same door", () => {
    const s = replay(pack, P, 5, [{ type: "knock" }]);
    const a = optionsFor(s, pack), b = optionsFor(s, pack);
    expect(a).toEqual(b);
    expect(a.length).toBe(3);
    expect(a.filter((o) => !o.weak).length).toBe(1);
  });

  it("signs her up when the rep picks the strong line every time", () => {
    for (let seed = 0; seed < 24; seed++) {
      let s = replay(pack, P, seed, [{ type: "knock" }]);
      for (let n = 0; n < 40 && s.outcome === "in_play"; n++) {
        const strong = optionsFor(s, pack).find((o) => !o.weak);
        expect(strong, `seed ${seed} turn ${n}`).toBeTruthy();
        s = play(s, strong!.text);
      }
      expect(s.outcome, `seed ${seed}`).toBe("signed_up");
      expect(debrief(s, pack).performance, `seed ${seed}`).toBe("strong");
    }
  });

  it("makes every weak line cost what the manual says it costs", () => {
    const seen = new Set<string>();
    const wrong: string[] = [];
    const probe = (s: State) => {
      const m = nextMoment(s, pack)!;
      for (const w of m.weak) {
        const t = play(s, w.text, w.seconds).turns.at(-1)!;
        seen.add(w.text);
        if (t.events.includes("unclear")) wrong.push(`not understood: ${w.text}`);
        if (w.expect && !t.events.includes(w.expect)) wrong.push(`${w.text} gave ${t.events.join(",")}, wanted ${w.expect}`);
        if (t.impulseAfter > t.impulseBefore) wrong.push(`${w.text} raised impulse`);
      }
      return m;
    };
    // Every moment on the strong path, for many doors.
    for (let seed = 0; seed < 24; seed++) {
      let s = replay(pack, P, seed, [{ type: "knock" }]);
      for (let n = 0; n < 40 && s.outcome === "in_play"; n++) s = play(s, probe(s).strong);
    }
    // The later closes only come up after an ask that did not land.
    const S2 = suggestions;
    let s = replay(pack, P, seedFor(0), [{ type: "knock" }]);
    for (const line of [...S2.introduction, S2.problem[0], S2.solution[0], "It's a really big problem.", "They do a lot of important work in the community.", S2.close[0], S2.problem[1], S2.solution[1]]) {
      if (s.interruptionActive) s = play(s, S2.interruption[0]);
      s = play(s, line);
    }
    if (s.interruptionActive) s = play(s, S2.interruption[0]);
    expect(probe(s).strong).toBe(S2.close[1]);
    s = play(s, S2.close[1]);
    s = play(s, "I hear you. Does the idea of what they are doing make sense to you?");
    s = play(s, "That is why most people start small.");
    expect(probe(s).strong).toBe(S2.close[2]);
    // After a genuine no, the only strong move is to leave well.
    let no = replay(pack, P, seedFor(0), [{ type: "knock" }]);
    for (const line of [...S2.introduction, S2.problem[0], S2.solution[0]]) {
      if (no.interruptionActive) no = play(no, S2.interruption[0]);
      no = play(no, line);
    }
    if (no.interruptionActive) no = play(no, S2.interruption[0]);
    no = play(no, "It's a really big problem.");
    no = play(no, "They do a lot of important work in the community.");
    for (const line of ["Would you like to help out today?", "Can I sign you up?", "So will you come on board?", "Can I get you started?"]) {
      if (!no.genuineNo) no = play(no, line);
    }
    expect(no.genuineNo).toBe(true);
    expect(probe(no).strong).toBe(S2.leave[0]);

    expect(wrong).toEqual([]);
    expect(allWeak.filter((w) => !seen.has(w.text)).map((w) => w.text)).toEqual([]);
  });

  it("brings a rep who jumps ahead back to what they skipped", () => {
    let s = replay(pack, P, 5, [{ type: "knock" }]);
    s = play(s, choices.introduction[1].weak[1].text); // name, charity and the ask in one breath
    expect(s.turns.at(-1)!.events).toContain("closed_early");
    expect(nextMoment(s, pack)!.strong).toBe(suggestions.problem[0]);
  });

  it("lands nothing on a KILL turn", () => {
    let s = replay(pack, P, 5, [{ type: "knock" }]);
    const w = choices.introduction[0].weak[0];
    s = play(s, w.text, w.seconds);
    expect(s.did).toEqual([]);
    expect(nextMoment(s, pack)!.strong).toBe(suggestions.introduction[0]);
  });
});

describe("stage practice", () => {
  const drills = pack.scenario.drills;
  it("names only rubric stages that exist", () => {
    const ids = pack.scenario.rubric.map((r) => r.id);
    for (const d of Object.values(drills)) for (const st of d.stages) expect(ids).toContain(st);
  });
  it("starts the Introduction practice before the knock", () => {
    const s = start(pack, P, 7, "introduction");
    expect(s.turns.length).toBe(0);
    expect(s.reaction).toBe("closed");
  });
  it("ends the Introduction practice once the rep has said who they are and asked a question", () => {
    const s = replay(pack, P, 7, [{ type: "knock" }, say(S.introduction[0]), say(S.introduction[1])], "introduction");
    expect(s.outcome).toBe("drill_done");
    expect(debrief(s, pack).stages.map((x) => [x.id, x.band])).toEqual([["introduction", "strong"]]);
  });
  it("plays the earlier stages for the rep, the same way for every seed", () => {
    for (const seed of [1, 2, 7]) {
      const p = start(pack, P, seed, "problem");
      expect(p.stage).toBe("introduction");
      expect(p.turns.every((t) => t.prelude)).toBe(true);
      expect(p.outcome).toBe("in_play");
      const sol = start(pack, P, seed, "solution");
      expect(sol.counters.problems).toBe(2);
      const c = start(pack, P, seed, "close");
      expect(c.impulse).toBeGreaterThanOrEqual(pack.scenario.meta.buyingLine);
      expect(c.flags).not.toContain("talked_over");
      const con = start(pack, P, seed, "consolidation");
      expect(con.agreed).toBe(true);
      expect(con.outcome).toBe("in_play");
    }
  });
  it("finishes each practice with a strong band on the pack's own lines", () => {
    const run = (drill: string, lines: string[]) => lines.reduce((s, l) => reduce(s, say(l), pack), start(pack, P, 7, drill));
    expect(debrief(run("problem", S.problem), pack).stages[0].band).toBe("strong");
    expect(debrief(run("solution", S.solution), pack).stages[0].band).toBe("strong");
    const close = run("close", [S.close[0], ...S.objection]);
    expect(close.outcome).toBe("drill_done");
    expect(debrief(close, pack).stages.map((x) => x.band)).toEqual(["strong", "strong"]);
    const con = run("consolidation", S.consolidation);
    expect(con.outcome).toBe("signed_up");
    expect(debrief(con, pack).stages[0].band).toBe("strong");
  });
});

describe("engine", () => {
  it("is deterministic: same seed and actions, same state", () => {
    expect(replay(pack, P, 7, good)).toEqual(replay(pack, P, 7, good));
  });

  it("signs up on a strong door, after two objections", () => {
    const s = replay(pack, P, seedFor(0), good);
    expect(s.outcome).toBe("signed_up");
    expect(s.criticalErrors).toEqual([]);
    expect(s.flags).toContain("objection_handled");
    expect(s.flags).toContain("reclose_different");
    const d = debrief(s, pack);
    expect(d.performance).toBe("strong");
    expect(d.turningPoint?.event).toBe("objection_handled");
  });

  it("does not count a sign-up if the rep leaves before the details are done", () => {
    const early = [...good.slice(0, CLOSE_AT + 6), good.at(-1)!]; // agreed, name given, then straight out
    const s = replay(pack, P, seedFor(0), early);
    expect(s.agreed).toBe(true);
    expect(s.outcome).toBe("left_well");
    expect(debrief(s, pack).turningPoint?.event).toBe("left_before_details");
  });

  it("does not sign up on a 'maybe'", () => {
    const s = replay(pack, P, seedFor(0), [...good.slice(0, CLOSE_AT + 1), { type: "walk_away" }]);
    expect(s.outcome).toBe("walked_away");
  });

  it("closes the door when the rep talks too long without a question", () => {
    const ramble = "So what we do is work with the rescue to raise funds and the programs have been running a long time and they are really successful and";
    let s: State = replay(pack, P, 3, [{ type: "knock" }]);
    for (let i = 0; i < 4 && s.outcome === "in_play"; i++) s = reduce(s, { type: "rep_turn", text: ramble, ids: ["say_name"], seconds: 40 }, pack);
    expect(s.flags).toContain("kill");
    expect(s.outcome).toBe("door_closed");
    expect(s.reaction).toBe("closed");
  });

  it("records a fake compliment as a critical error and forces the verdict down", () => {
    const s = replay(pack, P, seedFor(0), [{ type: "knock" }, say("Hey, how is your day going? I love that car, by the way.")]);
    expect(s.criticalErrors.map((c) => c.id)).toEqual(["fake_compliment"]);
    expect(s.reaction).toBe("sceptical");
    expect(debrief(s, pack).performance).toBe("needs_work");
  });

  it("only counts a compliment the scene supports", () => {
    const dog = "Is that your dog I can hear? Sounds like a great dog.";
    expect(replay(pack, P, seedFor(0), [{ type: "knock" }, say(dog)]).criticalErrors).toEqual([]);
    expect(replay(pack, P, seedFor(1), [{ type: "knock" }, say(dog)]).criticalErrors.length).toBe(1);
  });

  it("treats a close before the Problem and Solution as too early", () => {
    const s = replay(pack, P, 5, [{ type: "knock" }, say(S.introduction[0]), say(S.close[0])]);
    expect(s.flags).toContain("closed_early");
    expect(s.agreed).toBe(false);
  });

  it("drops impulse when the rep argues with an objection", () => {
    const upToObjection = good.slice(0, CLOSE_AT + 1);
    const before = replay(pack, P, seedFor(0), upToObjection);
    expect(before.openObjection?.id).toBe("cant_afford");
    const after = reduce(before, say("But it's only a small amount, less than a coffee."), pack);
    expect(after.impulse).toBeLessThan(before.impulse);
    expect(after.reaction).toBe("folded");
  });

  it("ends with a critical error if the rep asks again after a genuine no", () => {
    let s = replay(pack, P, seedFor(0), good.slice(0, CLOSE_AT + 1));
    for (let i = 0; i < 3; i++) s = reduce(s, say("Would you like to help out today?"), pack);
    expect(s.genuineNo).toBe(true);
    s = reduce(s, say("Would you like to help out today?"), pack);
    expect(s.outcome).toBe("door_closed");
    expect(s.criticalErrors.map((c) => c.id)).toContain("pushed_after_no");
  });

  it("does not change state on unclear input", () => {
    const a = replay(pack, P, 9, [{ type: "knock" }]);
    const b = reduce(a, { type: "rep_turn", text: "mumble mumble", ids: [] }, pack);
    expect(b.impulse).toBe(a.impulse);
    expect(b.turns.at(-1)?.donor[0].key).toBe("sorry");
  });

  it("never repeats a donor line twice running", () => {
    let s = replay(pack, P, 9, [{ type: "knock" }]);
    s = reduce(s, { type: "rep_turn", text: "x", ids: [] }, pack);
    s = reduce(s, { type: "rep_turn", text: "x", ids: [] }, pack);
    expect(s.turns.at(-1)?.donor[0].text).not.toBe(s.turns.at(-2)?.donor[0].text);
  });
});

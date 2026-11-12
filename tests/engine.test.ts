import { describe, expect, it } from "vitest";
import { pack } from "../src/content/pack";
import { validate } from "../src/engine/conditions";
import { reduce, replay, start } from "../src/engine/engine";
import { matchActions } from "../src/engine/match";
import { debrief } from "../src/engine/score";
import { KINDS, type Action, type State } from "../src/engine/types";

const P = "home-afternoon";
const say = (text: string, seconds?: number): Action => ({ type: "rep_turn", text, ids: matchActions(text, pack.scenario.actions), seconds });
const S = pack.scenario.suggestions;

// A strong door, built from the pack's own example lines.
const good: Action[] = [
  { type: "knock" },
  say(S.introduction[0]),
  say(S.problem[0]),
  say(S.problem[1]),
  say(S.interruption[0]),
  say(S.solution[0]),
  say(S.solution[1]),
  say(S.close[0]),
  say(S.objection[0]),
  say(S.objection[1]),
  say(S.objection[0]),
  say(S.objection[2]),
  say(S.consolidation[0]),
  say(S.consolidation[1]),
  say(S.consolidation[2]),
  say(S.consolidation[3]),
];

function seedFor(variant: number): number {
  for (let seed = 1; seed < 500; seed++) if (start(pack, P, seed).variant === variant) return seed;
  throw new Error("no seed");
}

describe("content pack", () => {
  it("uses only kinds the engine knows", () => {
    for (const a of pack.scenario.actions) expect(KINDS, a.id).toContain(a.kind);
  });
  it("uses only conditions the engine understands", () => {
    const problems = pack.scenario.rubric.flatMap((r) => [
      ...(r.onlyIf ? validate(r.onlyIf, pack) : []),
      ...r.criteria.flatMap((c) => validate(c.when, pack)),
    ]);
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
    const text = JSON.stringify([pack.personas, pack.scenario.rubric, pack.scenario.suggestions, pack.scenario.eventText, pack.campaign]);
    expect(text.includes("—")).toBe(false);
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
    const early = [...good.slice(0, 13), good[15]];
    const s = replay(pack, P, seedFor(0), early);
    expect(s.agreed).toBe(true);
    expect(s.outcome).toBe("left_well");
    expect(debrief(s, pack).turningPoint?.event).toBe("left_before_details");
  });

  it("does not sign up on a 'maybe'", () => {
    const s = replay(pack, P, seedFor(0), [...good.slice(0, 8), { type: "walk_away" }]);
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
    const upToObjection = good.slice(0, 8);
    const before = replay(pack, P, seedFor(0), upToObjection);
    expect(before.openObjection?.id).toBe("cant_afford");
    const after = reduce(before, say("But it's only a small amount, less than a coffee."), pack);
    expect(after.impulse).toBeLessThan(before.impulse);
    expect(after.reaction).toBe("folded");
  });

  it("ends with a critical error if the rep asks again after a genuine no", () => {
    let s = replay(pack, P, seedFor(0), good.slice(0, 8));
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

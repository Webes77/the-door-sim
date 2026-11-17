import { describe, expect, it } from "vitest";
import { shiftPack as pack } from "../src/content/shiftPack";
import { optionsFor, reduce, replay, start } from "../src/engine/shift/engine";
import { debrief } from "../src/engine/shift/score";
import type { Option, ShiftAction, ShiftState } from "../src/engine/shift/types";

const options = pack.calls.flatMap((c) => Object.values(c.nodes).flatMap((n) => n.options ?? []));
const right = (o: Option) => o.breaks.length === 0;

/** Play a whole shift. `pick` chooses the line at each point, `wrap` chooses the code for each call. */
function play(pick: (opts: Option[], s: ShiftState) => Option, wrap: (call: number) => string, seed = 7): ShiftState {
  let s = start(seed);
  for (let guard = 0; guard < 200 && s.phase !== "done"; guard++) {
    if (s.phase === "waiting") s = reduce(s, { type: "available" }, pack);
    else if (s.phase === "talking") s = reduce(s, { type: "say", ids: [pick(optionsFor(s, pack), s).id] }, pack);
    else s = reduce(s, { type: "disposition", id: wrap(s.call) }, pack);
  }
  return s;
}
const best = (opts: Option[]) => opts.find(right)!;
const worst = (opts: Option[]) => opts.find((o) => !right(o))!;
const correct = (call: number) => pack.calls[call].disposition.correct[0];

describe("practice shift pack", () => {
  const ruleIds = new Set(pack.rules.map((r) => r.id));
  const dispIds = new Set(pack.dispositions.map((d) => d.id));

  it("cites a document and a section for every rule", () => {
    expect(pack.rules.filter((r) => !r.quote || !r.doc || !r.section).map((r) => r.id)).toEqual([]);
  });

  it("ties every option to rules that exist", () => {
    const used = options.flatMap((o) => [...o.keeps, ...o.breaks]);
    expect(used.filter((id) => !ruleIds.has(id))).toEqual([]);
    expect(options.filter((o) => !o.keeps.length && !o.breaks.length).map((o) => o.id)).toEqual([]);
  });

  it("gives every choice exactly one line that breaks no rule, and three lines in all", () => {
    for (const c of pack.calls) for (const [id, n] of Object.entries(c.nodes)) {
      if (!n.options) continue;
      expect(n.options.length, `${c.id} ${id}`).toBe(3);
      expect(n.options.filter(right).length, `${c.id} ${id}`).toBe(1);
      expect(n.moment, `${c.id} ${id}`).toBeTruthy();
    }
  });

  it("points every option and every call at things that exist", () => {
    for (const c of pack.calls) {
      expect(c.nodes[c.start]).toBeTruthy();
      for (const n of Object.values(c.nodes)) for (const o of n.options ?? []) expect(c.nodes[o.next], `${c.id} ${o.id}`).toBeTruthy();
      expect(c.disposition.correct.filter((id) => !dispIds.has(id))).toEqual([]);
      expect(ruleIds.has(c.disposition.rule)).toBe(true);
    }
    expect(new Set(options.map((o) => o.id)).size).toBe(options.length);
  });

  it("does not give the right line away by its length", () => {
    const nodes = pack.calls.flatMap((c) => Object.values(c.nodes).filter((n) => n.options));
    const longest = nodes.filter((n) => n.options!.every((o) => right(o) || o.text.length < n.options!.find(right)!.text.length)).length;
    const shortest = nodes.filter((n) => n.options!.every((o) => right(o) || o.text.length > n.options!.find(right)!.text.length)).length;
    expect(longest).toBeLessThanOrEqual(Math.ceil(nodes.length / 2));
    expect(shortest).toBeLessThanOrEqual(Math.ceil(nodes.length / 2));
    for (const n of nodes) {
      const lens = n.options!.map((o) => o.text.length);
      expect(Math.max(...lens) / Math.min(...lens), n.moment).toBeLessThan(1.8);
    }
  });

  it("marks everything for review and fills in every name", () => {
    const text = JSON.stringify(pack);
    expect(text).not.toContain("{{");
    const items = [pack.client, ...pack.rules, ...pack.dispositions, ...pack.calls, ...options];
    expect(items.filter((x) => x.review !== "pending").length).toBe(0);
  });

  it("keeps money, phone numbers and staff contact details out of the pack", () => {
    const text = JSON.stringify(pack);
    expect(text).not.toMatch(/\$\s?\d/);
    expect(text).not.toMatch(/\+\d{2}\s?\d/);
    expect(text).not.toMatch(/@[a-z]+\.[a-z]/i);
  });
});

describe("practice shift engine", () => {
  it("is deterministic: same seed and actions, same state", () => {
    expect(play(best, correct, 3)).toEqual(play(best, correct, 3));
    const s = play(best, correct, 3);
    const actions: ShiftAction[] = [];
    let t = start(3);
    while (t.phase !== "done") {
      const a: ShiftAction = t.phase === "waiting" ? { type: "available" } : t.phase === "talking" ? { type: "say", ids: [best(optionsFor(t, pack)).id] } : { type: "disposition", id: correct(t.call) };
      actions.push(a); t = reduce(t, a, pack);
    }
    expect(replay(pack, 3, actions)).toEqual(s);
  });

  it("scores a clean shift strong, with no critical errors", () => {
    const d = debrief(play(best, correct), pack);
    expect(d.band).toBe("strong");
    expect(d.criticalErrors).toEqual([]);
    expect(d.calls.map((c) => c.band)).toEqual(pack.calls.map(() => "strong"));
    expect(d.moments.every((m) => m.kept && m.rules.length > 0)).toBe(true);
  });

  it("never lets a missed DNC hide inside a good score", () => {
    const dnc = pack.calls.findIndex((c) => c.disposition.correct.includes("dnc"));
    const d = debrief(play(best, (call) => (call === dnc ? "not_interested" : correct(call))), pack);
    expect(d.criticalErrors.map((e) => e.rule.id)).toEqual(["dnc_code"]);
    expect(d.calls[dnc].band).toBe("needs_work");
    expect(d.band).toBe("needs_work");
  });

  it("scores a wrong wrap code even when every line was right", () => {
    const d = debrief(play(best, (call) => (call === 0 ? "email_requested" : correct(call))), pack);
    expect(d.calls[0].disposition.right).toBe(false);
    expect(d.calls[0].right).toBe(d.calls[0].total - 1);
  });

  it("lists a broken critical rule on its own and forces the result down", () => {
    const d = debrief(play((opts) => opts.find((o) => o.breaks.includes("no_advice")) ?? best(opts), correct), pack);
    expect(d.criticalErrors.map((e) => e.rule.id)).toContain("no_advice");
    expect(d.band).toBe("needs_work");
  });

  it("scores a weak shift as needs work", () => {
    expect(debrief(play(worst, () => "busy"), pack).band).toBe("needs_work");
  });

  it("does not change the call on unclear input", () => {
    const a = reduce(start(5), { type: "available" }, pack);
    const b = reduce(a, { type: "say", ids: ["not_an_option"] }, pack);
    expect(b.node).toBe(a.node);
    expect(b.decisions).toEqual([]);
    expect(b.log.at(-1)).toMatchObject({ who: "prospect", unclear: true });
  });

  it("ignores actions that do not fit the moment", () => {
    const s = start(5);
    expect(reduce(s, { type: "say", ids: ["c1_open_ok"] }, pack)).toBe(s);
    expect(reduce(s, { type: "disposition", id: "dnc" }, pack)).toBe(s);
    const talking = reduce(s, { type: "available" }, pack);
    expect(reduce(talking, { type: "available" }, pack)).toBe(talking);
  });

  it("shows the same three lines in the same order for the same shift, and moves the right line around", () => {
    const a = reduce(start(11), { type: "available" }, pack);
    expect(optionsFor(a, pack)).toEqual(optionsFor(a, pack));
    const places = new Set<number>();
    for (let seed = 1; seed <= 12; seed++) places.add(optionsFor(reduce(start(seed), { type: "available" }, pack), pack).findIndex(right));
    expect(places.size).toBeGreaterThan(1);
  });
});

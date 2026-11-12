import { COUNTERS, FLAGS, type Counter, type Flag, type Pack, type State } from "./types";

// Condition language used by the rubric.
//   always | not:<cond> | <cond>|<cond> | count:<n>:<atom>,<atom>,...
//   atoms: did:<actionId> | flag:<flag> | min:<counter>:<n>

export function evaluate(cond: string, s: State): boolean {
  const c = cond.trim();
  if (c === "always") return true;
  if (c.includes("|")) return c.split("|").some((p) => evaluate(p, s));
  if (c.startsWith("not:")) return !evaluate(c.slice(4), s);
  if (c.startsWith("count:")) {
    const [, n, rest] = c.match(/^count:(\d+):(.*)$/) ?? [];
    return rest.split(",").filter((p) => evaluate(p, s)).length >= Number(n);
  }
  if (c.startsWith("did:")) return s.did.includes(c.slice(4));
  if (c.startsWith("flag:")) return s.flags.includes(c.slice(5) as Flag);
  if (c.startsWith("min:")) {
    const [, name, n] = c.split(":");
    return (s.counters[name as Counter] ?? 0) >= Number(n);
  }
  return false;
}

/** Returns a list of problems. An empty list means the condition is understood. */
export function validate(cond: string, pack: Pack): string[] {
  const c = cond.trim();
  if (c === "always") return [];
  if (c.includes("|")) return c.split("|").flatMap((p) => validate(p, pack));
  if (c.startsWith("not:")) return validate(c.slice(4), pack);
  if (c.startsWith("count:")) {
    const m = c.match(/^count:(\d+):(.+)$/);
    if (!m) return [`bad count: ${c}`];
    return m[2].split(",").flatMap((p) => validate(p, pack));
  }
  if (c.startsWith("did:")) {
    return pack.scenario.actions.some((a) => a.id === c.slice(4)) ? [] : [`unknown action: ${c}`];
  }
  if (c.startsWith("flag:")) {
    return (FLAGS as readonly string[]).includes(c.slice(5)) ? [] : [`unknown flag: ${c}`];
  }
  if (c.startsWith("min:")) {
    const [, name, n] = c.split(":");
    return (COUNTERS as readonly string[]).includes(name) && /^\d+$/.test(n ?? "") ? [] : [`bad min: ${c}`];
  }
  return [`not understood: ${c}`];
}

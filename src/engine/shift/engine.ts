import { mulberry32 } from "../rng";
import type { CallDef, Option, ShiftAction, ShiftPack, ShiftState } from "./types";

// Pure engine for the practice shift. reduce(state, action, pack) reads no clock, no random number and no network.
// The engine decides what the prospect says next, which rules were kept or broken, and whether the wrap code is right.

export function start(seed: number): ShiftState {
  return { seed, call: 0, phase: "waiting", node: null, log: [], decisions: [], results: [] };
}

export function replay(pack: ShiftPack, seed: number, actions: ShiftAction[]): ShiftState {
  return actions.reduce((s, a) => reduce(s, a, pack), start(seed));
}

export function callOf(pack: ShiftPack, s: ShiftState): CallDef | null {
  return pack.calls[s.call] ?? null;
}

/** Play a point's lines. Stop at a choice or at the end of the call. Otherwise carry on to the next point. */
function enter(s: ShiftState, def: CallDef, id: string): void {
  for (let guard = 0; guard < 50; guard++) {
    const node = def.nodes[id];
    if (!node) throw new Error(`unknown point ${id} in ${def.id}`);
    for (const l of node.lines) s.log.push({ call: s.call, who: l.who, text: l.text, node: id });
    if (node.options?.length) { s.node = id; return; }
    if (node.end || !node.next) { s.node = null; s.phase = "wrap"; return; }
    id = node.next;
  }
  throw new Error(`call ${def.id} never reaches a choice or an end`);
}

export function reduce(state: ShiftState, action: ShiftAction, pack: ShiftPack): ShiftState {
  const def = callOf(pack, state);
  if (!def || state.phase === "done") return state;
  const s: ShiftState = structuredClone(state);

  if (action.type === "available") {
    if (s.phase !== "waiting") return state;
    s.phase = "talking";
    enter(s, def, def.start);
    return s;
  }

  if (action.type === "say") {
    if (s.phase !== "talking" || !s.node) return state;
    const node = def.nodes[s.node];
    const picked = node.options?.find((o) => action.ids.includes(o.id));
    // Unclear input: the prospect asks again and nothing else changes. Never scored against the learner.
    if (!picked) {
      s.log.push({ call: s.call, who: "prospect", text: pack.client.sorry, node: s.node, unclear: true });
      return s;
    }
    s.log.push({ call: s.call, who: "you", text: picked.text, node: s.node, optionId: picked.id });
    s.decisions.push({ call: s.call, node: s.node, moment: node.moment ?? "", optionId: picked.id, text: picked.text, keeps: picked.keeps, breaks: picked.breaks });
    enter(s, def, picked.next);
    return s;
  }

  // Wrap the call with a code from the real list.
  if (s.phase !== "wrap" || !pack.dispositions.some((d) => d.id === action.id)) return state;
  const right = def.disposition.correct.includes(action.id);
  const broken = s.decisions.filter((d) => d.call === s.call).flatMap((d) => d.breaks);
  const critical = [...new Set(broken.filter((id) => pack.rules.find((r) => r.id === id)?.critical))];
  if (!right && def.disposition.missIsCritical && !critical.includes(def.disposition.rule)) critical.push(def.disposition.rule);
  s.results.push({ call: s.call, disposition: action.id, right, critical });
  s.call += 1;
  s.phase = s.call >= pack.calls.length ? "done" : "waiting";
  return s;
}

/** The lines the learner can say now, mixed by the shift's seed so the right one has no fixed place. Help only. */
export function optionsFor(s: ShiftState, pack: ShiftPack): Option[] {
  const def = callOf(pack, s);
  if (!def || s.phase !== "talking" || !s.node) return [];
  const list = [...(def.nodes[s.node].options ?? [])];
  const turn = s.decisions.filter((d) => d.call === s.call).length;
  const rand = mulberry32((s.seed + 1) * 7919 + s.call * 104729 + turn * 1299709);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

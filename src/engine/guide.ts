import { evaluate } from "./conditions";
import { suggestionKey, variantOf } from "./engine";
import { mulberry32 } from "./rng";
import { STAGES, type Pack, type State, type WeakLine } from "./types";

// "What would you say?" Help only. It reads the state and the pack and never changes the rules.
// At each moment the rep is offered the pack's strong line and up to two weak ones, in a mixed order.

export interface Moment { key: string; index: number; strong: string; weak: WeakLine[] }
export interface Option { text: string; seconds?: number; weak: WeakLine | null }

const MAX_WEAK = 2;

function said(s: State): Set<string> {
  return new Set(s.turns.map((t) => t.rep?.text).filter((t): t is string => !!t));
}

/** The line the pack would say next, with the weak lines that belong beside it. */
export function nextMoment(s: State, pack: Pack): Moment | null {
  if (s.outcome !== "in_play" || !s.turns.length) return null;
  const { suggestions, choices } = pack.scenario;
  const used = said(s);
  const at = (key: string, index: number): Moment | null => {
    const strong = suggestions[key]?.[index];
    return strong ? { key, index, strong, weak: choices[key]?.[index]?.weak ?? [] } : null;
  };
  const open = (key: string, index: number): boolean => {
    const strong = suggestions[key]?.[index];
    if (!strong || used.has(strong)) return false;
    const done = choices[key]?.[index]?.doneWhen;
    return !(done && evaluate(done, s));
  };
  const firstOpen = (key: string): Moment | null => {
    const i = (suggestions[key] ?? []).findIndex((_, k) => open(key, k));
    return i >= 0 ? at(key, i) : null;
  };

  const key = suggestionKey(s);
  if (key === "interruption" || key === "leave") return at(key, 0);
  if (key === "consolidation") return firstOpen(key);
  if (key === "objection") {
    // The lines come in pairs, one pair for each objection she raises:
    // acknowledge and confirm, then re-impulse and re-close a different way.
    const o = s.openObjection;
    const lines = suggestions[key] ?? [];
    const raised = variantOf(pack, s).objections.length - s.objectionQueue.length;
    const pair = Math.min(Math.max(raised - 1, 0), Math.max(Math.ceil(lines.length / 2) - 1, 0)) * 2;
    return at(key, !o || !o.ack || !o.confirm ? pair : Math.min(pair + 1, lines.length - 1));
  }

  // A pitch stage. Go back to the earliest thing not yet done, so a rep who jumps ahead is brought back.
  const now = STAGES.indexOf(key as never);
  const drillAt = s.drill ? STAGES.indexOf(s.drill as never) : -1;
  const from = drillAt >= 0 ? drillAt : 0;
  const to = drillAt >= 0 ? Math.max(drillAt, Math.min(now, 3)) : Math.min(now + 1, 3);
  for (let i = from; i <= to; i++) {
    const m = firstOpen(STAGES[i]);
    if (m) return m;
  }
  return at("leave", 0);
}

/** The options shown to the rep: the strong line and up to two weak ones, mixed by the door's seed. */
export function optionsFor(s: State, pack: Pack): Option[] {
  const m = nextMoment(s, pack);
  if (!m) return [];
  const used = said(s);
  const rand = mulberry32((s.seed + 1) * 7919 + s.turns.length * 104729);
  const mix = <T,>(list: T[]): T[] => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const weak = mix(m.weak.filter((w) => !used.has(w.text))).slice(0, MAX_WEAK);
  return mix<Option>([{ text: m.strong, weak: null }, ...weak.map((w) => ({ text: w.text, seconds: w.seconds, weak: w }))]);
}

/** The weak line a rep's words came from, if they tapped one. Used by the debrief. */
export function weakLineFor(text: string, pack: Pack): WeakLine | null {
  for (const list of Object.values(pack.scenario.choices)) {
    for (const beat of list) {
      const hit = beat.weak.find((w) => w.text === text);
      if (hit) return hit;
    }
  }
  return null;
}

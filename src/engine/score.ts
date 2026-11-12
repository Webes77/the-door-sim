import { evaluate } from "./conditions";
import type { Pack, State, Turn } from "./types";

export type Band = "strong" | "getting_there" | "needs_work" | "not_tested";

export interface StageResult {
  id: string;
  label: string;
  band: Band;
  criteria: { id: string; label: string; met: boolean; source: string }[];
}

export interface Debrief {
  stages: StageResult[];
  performance: Band;
  criticalErrors: { id: string; label: string; source: string; turn: number }[];
  turningPoint: { turn: number; event: string; title: string; lines: { quote: string; source: string }[] } | null;
  repWords: number;
  donorWords: number;
  talkShare: number;
  questions: number;
  closes: number;
}

const ORDER = [
  "fake_compliment", "pushed_after_no", "lost_attention", "genuine_no", "kill", "argued", "closed_early",
  "left_before_details", "reclose_unhandled", "close_below_line", "said_understand", "reclose_same",
  "talked_over", "drift", "walked_away", "left_well",
];

function words(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function debrief(s: State, pack: Pack): Debrief {
  const { bands } = pack.scenario.meta;
  const stages: StageResult[] = pack.scenario.rubric.map((r) => {
    const criteria = r.criteria.map((c) => ({ id: c.id, label: c.label, met: evaluate(c.when, s), source: c.source }));
    if (r.onlyIf && !evaluate(r.onlyIf, s)) return { id: r.id, label: r.label, band: "not_tested", criteria };
    const share = criteria.filter((c) => c.met).length / criteria.length;
    const band: Band = share >= bands.strong ? "strong" : share >= bands.partly ? "getting_there" : "needs_work";
    return { id: r.id, label: r.label, band, criteria };
  });

  const criticalErrors = s.criticalErrors.map((c) => ({
    id: c.id, turn: c.turn,
    label: pack.scenario.critical[c.id]?.label ?? c.id,
    source: pack.scenario.critical[c.id]?.source ?? "",
  }));

  // Performance verdict. A critical error always forces it down.
  const tested = stages.filter((x) => x.band !== "not_tested");
  const points = tested.reduce((n, x) => n + (x.band === "strong" ? 2 : x.band === "getting_there" ? 1 : 0), 0);
  const share = tested.length ? points / (tested.length * 2) : 0;
  let performance: Band = share >= bands.strong ? "strong" : share >= bands.partly ? "getting_there" : "needs_work";
  if (criticalErrors.length) performance = "needs_work";

  // Turning point: a critical error first. Then, on a sign-up, the last recovery. Otherwise the biggest drop.
  let tp: Turn | null = null;
  let event = "";
  if (s.criticalErrors.length) {
    tp = s.turns[s.criticalErrors[0].turn] ?? null;
    event = s.criticalErrors[0].id;
  } else if (s.outcome === "signed_up") {
    const handled = s.turns.filter((t) => t.events.includes("objection_handled"));
    const buying = s.turns.filter((t) => t.events.includes("buying_sign"));
    const agreed = s.turns.filter((t) => t.events.includes("agreed"));
    tp = handled.at(-1) ?? buying.at(-1) ?? agreed.at(-1) ?? null;
    event = handled.length ? "objection_handled" : buying.length ? "buying_sign" : "agreed";
  } else {
    // A planned objection is not the rep's mistake, so it is never the turning point of a lost door.
    const own = s.turns.filter((t) => !t.events.includes("objection"));
    tp = own.find((t) => t.events.includes("left_before_details")) ?? null;
    if (!tp) {
      let worst = 0;
      for (const t of own) {
        const d = t.impulseAfter - t.impulseBefore;
        if (d < worst) { worst = d; tp = t; }
      }
    }
    if (!tp) tp = s.turns.at(-1) ?? null;
    event = tp ? ORDER.find((e) => tp!.events.includes(e)) ?? tp.events[0] ?? "" : "";
  }
  const coach = pack.scenario.coaching[event];
  const turningPoint = tp
    ? {
        turn: tp.n, event,
        title: coach?.title ?? pack.scenario.eventText[event] ?? "",
        lines: (coach?.lines ?? [])
          .map((id) => pack.strongLines.find((l) => l.id === id))
          .filter((l) => !!l)
          .map((l) => ({ quote: l!.quote, source: l!.source })),
      }
    : null;

  const repWords = s.turns.reduce((n, t) => n + (t.rep?.words ?? 0), 0);
  const donorWords = s.turns.reduce((n, t) => n + t.donor.reduce((k, d) => k + words(d.text), 0), 0);

  return {
    stages, performance, criticalErrors, turningPoint,
    repWords, donorWords,
    talkShare: repWords + donorWords ? repWords / (repWords + donorWords) : 0,
    questions: s.counters.questions,
    closes: s.counters.closes,
  };
}

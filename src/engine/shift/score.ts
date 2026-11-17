import type { Decision, Rule, ShiftPack, ShiftState } from "./types";

export type Band = "strong" | "getting_there" | "needs_work";

export interface MomentResult { call: number; prospect: string; moment: string; said: string; kept: boolean; rules: { rule: Rule; kept: boolean }[] }
export interface CallScore {
  call: number; id: string; prospect: string; band: Band; right: number; total: number;
  disposition: { picked: string; right: boolean; correct: string[]; rule: Rule | null };
  critical: Rule[];
}
export interface ShiftDebrief { calls: CallScore[]; band: Band; criticalErrors: { call: number; prospect: string; rule: Rule }[]; moments: MomentResult[] }

/** Everything in the debrief comes from engine facts. Nothing here is judged by AI. */
export function debrief(s: ShiftState, pack: ShiftPack): ShiftDebrief {
  const { strong, partly } = pack.meta.bands;
  const rule = (id: string) => pack.rules.find((r) => r.id === id) ?? null;
  const name = (id: string) => pack.dispositions.find((d) => d.id === id)?.name ?? id;
  const band = (share: number, critical: boolean): Band => (critical ? "needs_work" : share >= strong ? "strong" : share >= partly ? "getting_there" : "needs_work");

  const calls: CallScore[] = s.results.map((r) => {
    const def = pack.calls[r.call];
    const mine = s.decisions.filter((d) => d.call === r.call);
    const right = mine.filter((d) => !d.breaks.length).length + (r.right ? 1 : 0);
    const total = mine.length + 1;
    const critical = r.critical.map(rule).filter((x): x is Rule => !!x);
    return {
      call: r.call, id: def.id, prospect: def.prospect.name, band: band(right / total, critical.length > 0), right, total,
      disposition: { picked: name(r.disposition), right: r.right, correct: def.disposition.correct.map(name), rule: rule(def.disposition.rule) },
      critical,
    };
  });

  const criticalErrors = calls.flatMap((c) => c.critical.map((r) => ({ call: c.call, prospect: c.prospect, rule: r })));
  const right = calls.reduce((n, c) => n + c.right, 0), total = calls.reduce((n, c) => n + c.total, 0);

  const moments: MomentResult[] = s.decisions.map((d: Decision) => ({
    call: d.call, prospect: pack.calls[d.call].prospect.name, moment: d.moment, said: d.text, kept: !d.breaks.length,
    rules: [...d.breaks.map((id) => ({ id, kept: false })), ...d.keeps.map((id) => ({ id, kept: true }))]
      .map((x) => ({ rule: rule(x.id), kept: x.kept }))
      .filter((x): x is { rule: Rule; kept: boolean } => !!x.rule),
  }));

  return { calls, band: band(total ? right / total : 0, criticalErrors.length > 0), criticalErrors, moments };
}

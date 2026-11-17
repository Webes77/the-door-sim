// The practice shift: a caller's shift of short phone calls, each ending in a wrap code.
// The engine knows calls, points in a call, options, rules and wrap codes. The pack supplies all wording.

export interface Rule { id: string; title: string; quote: string; doc: string; section: string; critical: boolean; review: string }
export interface Disposition { id: string; name: string; when: string; review: string }

export type Who = "prospect" | "you" | "note";
export interface Line { who: Who; text: string }
export interface Option { id: string; text: string; keeps: string[]; breaks: string[]; next: string; review: string }

/** A point in a call: lines that play, then either a choice for the learner, the next point, or the end. */
export interface CallNode { moment?: string; lines: Line[]; options?: Option[]; next?: string; end?: boolean }

export interface CallDef {
  id: string;
  prospect: { name: string; first: string };
  brief: string;
  start: string;
  nodes: Record<string, CallNode>;
  disposition: { correct: string[]; rule: string; missIsCritical: boolean };
  review: string;
}

export interface ShiftClient {
  id: string; employer: string; client: string; clientShort: string; caller: string;
  campaign: string; title: string; draftLabel: string; footer: string; sorry: string; reviewers: string; review: string;
}

export interface ShiftPack {
  client: ShiftClient;
  meta: { bands: { strong: number; partly: number }; plannedCalls: number };
  rules: Rule[];
  dispositions: Disposition[];
  calls: CallDef[];
}

export interface Entry { call: number; who: Who; text: string; node: string; optionId?: string; unclear?: boolean }
export interface Decision { call: number; node: string; moment: string; optionId: string; text: string; keeps: string[]; breaks: string[] }
export interface CallResult { call: number; disposition: string; right: boolean; critical: string[] }

export type Phase = "waiting" | "talking" | "wrap" | "done";

export interface ShiftState {
  seed: number;
  call: number;
  phase: Phase;
  node: string | null;
  log: Entry[];
  decisions: Decision[];
  results: CallResult[];
}

export type ShiftAction =
  | { type: "available" }
  | { type: "say"; ids: string[] }
  | { type: "disposition"; id: string };

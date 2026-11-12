// Engine types. The engine knows kinds, flags and counters. Packs supply the ids and all wording.

export const STAGES = ["introduction", "problem", "solution", "close", "consolidation"] as const;
export type Stage = (typeof STAGES)[number];

export type Reaction =
  | "open" | "folded" | "glance" | "hesitate" | "lean" | "laugh" | "sceptical" | "happy" | "closed";

export type Outcome = "in_play" | "signed_up" | "door_closed" | "left_well" | "walked_away";

export const KINDS = [
  "greet", "introduce", "compliment", "question", "problem", "transition", "solution", "factor",
  "checkin", "close", "acknowledge", "understand", "confirm", "argue", "ack_interruption",
  "consolidate", "leave",
] as const;
export type Kind = (typeof KINDS)[number];

export const FLAGS = [
  "question_first_turn", "kill", "fake_compliment", "said_understand", "argued", "talked_over",
  "interruption_acked", "closed_early", "close_above_line", "objection_raised", "obj_acknowledged",
  "obj_confirmed", "obj_reimpulsed", "objection_handled", "reclose_different", "pushed_after_no",
  "agreed", "details_complete", "self_justified", "problem_question", "skipped_stage",
] as const;
export type Flag = (typeof FLAGS)[number];

export const COUNTERS = ["questions", "closes", "methods", "factors", "problems", "rapport", "kills", "refusals"] as const;
export type Counter = (typeof COUNTERS)[number];

export interface ActionDef {
  id: string;
  kind: Kind;
  stage?: Stage;
  describe: string;
  keywords: string[];
  impulse?: number;
  asks?: boolean;
  needsVisible?: string;
  topic?: string;
  rapport?: boolean;
  factor?: string;
  method?: string;
  sub?: "reinforce" | "frequency" | "name" | "self_justify";
  review: string;
}

export interface ObjectionDef { id: string; label: string; drop: number; gap: number; review: string }

export interface Criterion { id: string; label: string; when: string; source: string }
export interface RubricStage { id: string; label: string; onlyIf?: string; criteria: Criterion[] }

export interface Meta {
  attentionLine: number;
  buyingLine: number;
  wordsPerSecond: number;
  killSeconds: number;
  killPenalty: number;
  fakePenalty: number;
  understandPenalty: number;
  arguePenalty: number;
  driftPenalty: number;
  earlyClosePenalty: number;
  refusePenalty: number;
  notYetPenalty: number;
  sameMethodPenalty: number;
  ackGain: number;
  confirmGain: number;
  ackInterruptionGain: number;
  talkedOverPenalty: number;
  maxRefusals: number;
  lowStreakLimit: number;
  floor: number;
  interruptionTurns: [number, number];
  bands: { strong: number; partly: number };
}

export interface Scenario {
  meta: Meta;
  actions: ActionDef[];
  objections: ObjectionDef[];
  rubric: RubricStage[];
  coaching: Record<string, { title: string; lines: string[] }>;
  eventText: Record<string, string>;
  suggestions: Record<string, string[]>;
  critical: Record<string, { label: string; source: string }>;
}

export interface Variant { name: string; last: string; dog: string; visible: string[]; notice: string; objections: string[] }

export interface Persona {
  id: string;
  title: string;
  situation: string;
  startImpulse: number;
  variants: Variant[];
  lines: Record<string, string[]>;
  review: string;
}

export interface StrongLine { id: string; quote: string; source: string; review: string }

export interface Pack {
  client: { id: string; name: string; logo: string; reviewer: string; reviewDate: string };
  campaign: { charity: string; placeholder: boolean; cause: string; problems: string[]; impact: string; progress: string; ask: string; review: string };
  scenario: Scenario;
  personas: Persona[];
  strongLines: StrongLine[];
}

export interface CloseAttempt { turn: number; method: string; impulse: number; above: boolean; result: string }

export interface DonorLine { key: string; text: string }

export interface Turn {
  n: number;
  rep: { text: string; ids: string[]; words: number; seconds: number } | null;
  donor: DonorLine[];
  reaction: Reaction;
  impulseBefore: number;
  impulseAfter: number;
  stage: Stage;
  events: string[];
}

export interface OpenObjection { id: string; method: string; ack: boolean; confirm: boolean; reimpulse: boolean }

export interface State {
  seed: number;
  personaId: string;
  variant: number;
  interruptAt: number;
  objectionQueue: string[];
  stage: Stage;
  impulse: number;
  lowStreak: number;
  secondsSinceQuestion: number;
  repTurns: number;
  did: string[];
  gained: string[];
  flags: Flag[];
  counters: Record<Counter, number>;
  methodsUsed: string[];
  factorsUsed: string[];
  problemsUsed: string[];
  closes: CloseAttempt[];
  openObjection: OpenObjection | null;
  recloseMethod: string | null;
  refusals: number;
  genuineNo: boolean;
  agreed: boolean;
  details: { frequency: boolean; name: boolean };
  interruptionActive: boolean;
  interruptionDone: boolean;
  cursors: Record<string, number>;
  reaction: Reaction;
  outcome: Outcome;
  criticalErrors: { id: string; turn: number }[];
  turns: Turn[];
}

export type Action =
  | { type: "knock" }
  | { type: "rep_turn"; ids: string[]; text: string; seconds?: number }
  | { type: "walk_away" };

import { mulberry32 } from "./rng";
import { countWords } from "./match";
import {
  STAGES, type Action, type ActionDef, type Counter, type DonorLine, type Flag, type Pack,
  type Persona, type Reaction, type Stage, type State, type Turn, type Variant,
} from "./types";

// Pure engine. reduce(state, action, pack) never reads a clock, a random number or the network.
// Everything random is drawn once in start() from the seed.

export function personaOf(pack: Pack, s: State): Persona {
  const p = pack.personas.find((x) => x.id === s.personaId);
  if (!p) throw new Error(`unknown persona ${s.personaId}`);
  return p;
}

export function variantOf(pack: Pack, s: State): Variant {
  return personaOf(pack, s).variants[s.variant];
}

export function start(pack: Pack, personaId: string, seed: number): State {
  const persona = pack.personas.find((p) => p.id === personaId);
  if (!persona) throw new Error(`unknown persona ${personaId}`);
  const rand = mulberry32(seed);
  const variant = Math.floor(rand() * persona.variants.length);
  const [lo, hi] = pack.scenario.meta.interruptionTurns;
  const interruptAt = lo + Math.floor(rand() * (hi - lo + 1));
  return {
    seed, personaId, variant, interruptAt,
    objectionQueue: [...persona.variants[variant].objections],
    stage: "introduction",
    impulse: persona.startImpulse,
    lowStreak: 0,
    secondsSinceQuestion: 0,
    repTurns: 0,
    did: [], gained: [], flags: [],
    counters: { questions: 0, closes: 0, methods: 0, factors: 0, problems: 0, rapport: 0, kills: 0, refusals: 0 },
    methodsUsed: [], factorsUsed: [], problemsUsed: [],
    closes: [],
    openObjection: null,
    recloseMethod: null,
    refusals: 0,
    genuineNo: false,
    agreed: false,
    details: { frequency: false, name: false },
    interruptionActive: false,
    interruptionDone: false,
    cursors: {},
    reaction: "closed",
    outcome: "in_play",
    criticalErrors: [],
    turns: [],
  };
}

export function replay(pack: Pack, personaId: string, seed: number, actions: Action[]): State {
  return actions.reduce((s, a) => reduce(s, a, pack), start(pack, personaId, seed));
}

function fill(text: string, pack: Pack, v: Variant): string {
  return text
    .replaceAll("{{name}}", v.name)
    .replaceAll("{{last}}", v.last)
    .replaceAll("{{dog}}", v.dog)
    .replaceAll("{{charity}}", pack.campaign.charity);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function reduce(state: State, action: Action, pack: Pack): State {
  if (state.outcome !== "in_play") return state;
  const s: State = structuredClone(state);
  const persona = personaOf(pack, s);
  const v = persona.variants[s.variant];
  const m = pack.scenario.meta;

  // Each topic holds several lines, used in order, so the donor does not repeat herself.
  const say = (key: string): DonorLine => {
    const list = persona.lines[key] ?? persona.lines["listening"];
    const i = s.cursors[key] ?? 0;
    s.cursors[key] = i + 1;
    return { key, text: fill(list[i % list.length], pack, v) };
  };
  const flag = (f: Flag) => { if (!s.flags.includes(f)) s.flags.push(f); };
  const bump = (c: Counter, by = 1) => { s.counters[c] += by; };
  const push = (t: Omit<Turn, "n">) => { s.turns.push({ n: s.turns.length, ...t }); };

  if (action.type === "knock") {
    if (s.turns.length) return state;
    s.reaction = "open";
    push({ rep: null, donor: [say("open_door")], reaction: "open", impulseBefore: s.impulse, impulseAfter: s.impulse, stage: s.stage, events: ["knock"] });
    return s;
  }

  if (action.type === "walk_away") {
    const signed = s.agreed && s.details.frequency && s.details.name;
    s.outcome = signed ? "signed_up" : "walked_away";
    push({ rep: null, donor: [], reaction: s.reaction, impulseBefore: s.impulse, impulseAfter: s.impulse, stage: s.stage, events: [signed ? "left_signed" : "walked_away"] });
    return s;
  }

  if (!s.turns.length) return state; // must knock first

  const defs = new Map(pack.scenario.actions.map((a) => [a.id, a]));
  const acts = action.ids.map((id) => defs.get(id)).filter((a): a is ActionDef => !!a);
  const words = countWords(action.text);
  const seconds = action.seconds ?? words / m.wordsPerSecond;
  const before = s.impulse;
  const events: string[] = [];
  const repRecord = { text: action.text, ids: acts.map((a) => a.id), words, seconds };

  // Unclear input: the donor asks again and nothing changes. Never scored against the rep.
  if (!acts.length) {
    push({ rep: repRecord, donor: [say("sorry")], reaction: s.reaction, impulseBefore: before, impulseAfter: before, stage: s.stage, events: ["unclear"] });
    return s;
  }

  let delta = 0;
  const kinds = new Set(acts.map((a) => a.kind));
  const hasQuestion = action.text.includes("?") || acts.some((a) => a.asks);
  if (s.repTurns === 0 && hasQuestion) flag("question_first_turn");
  s.repTurns += 1;
  if (hasQuestion) bump("questions");

  // Interruption follow-up.
  let ackedInterruption = false;
  if (s.interruptionActive) {
    if (kinds.has("ack_interruption")) {
      delta += m.ackInterruptionGain; flag("interruption_acked"); events.push("interruption_acked"); ackedInterruption = true;
    } else {
      delta -= m.talkedOverPenalty; flag("talked_over"); events.push("talked_over");
    }
    s.interruptionActive = false;
  }

  // KISS vs KILL: too long without a question.
  let kill = false;
  s.secondsSinceQuestion += seconds;
  if (s.secondsSinceQuestion > m.killSeconds) {
    kill = true; flag("kill"); bump("kills"); delta -= m.killPenalty; events.push("kill");
    s.secondsSinceQuestion = 0;
  } else if (hasQuestion) {
    s.secondsSinceQuestion = 0;
  }

  const gain = (a: ActionDef): number => {
    if (!a.impulse || s.gained.includes(a.id)) return 0;
    s.gained.push(a.id);
    return a.impulse;
  };

  let fake = false, argued = false, understood = false, confirmed = false, acknowledged = false;
  let goodCompliment: ActionDef | null = null, topic: ActionDef | null = null, noTopic: ActionDef | null = null;
  let closeAct: ActionDef | null = null, leaving = false, gainedSomething = false;
  const subs: string[] = [];

  for (const a of acts) {
    if (!s.did.includes(a.id)) s.did.push(a.id);
    if (a.stage && !s.agreed) {
      const now = STAGES.indexOf(s.stage), next = STAGES.indexOf(a.stage);
      if (next > now + 1) flag("skipped_stage");
      if (next > now) s.stage = a.stage as Stage;
    }
    switch (a.kind) {
      case "compliment":
        if (a.needsVisible && v.visible.includes(a.needsVisible)) {
          const g = gain(a); delta += g; if (g) { bump("rapport"); gainedSomething = true; }
          goodCompliment = a; events.push("rapport");
        } else {
          fake = true; flag("fake_compliment"); delta -= m.fakePenalty; events.push("fake_compliment");
          if (!s.criticalErrors.some((c) => c.id === "fake_compliment")) s.criticalErrors.push({ id: "fake_compliment", turn: s.turns.length });
        }
        break;
      case "question":
        if (a.needsVisible && !v.visible.includes(a.needsVisible)) { noTopic = a; break; }
        { const g = gain(a); delta += g; if (g) { gainedSomething = true; if (a.rapport) bump("rapport"); } }
        topic = a;
        break;
      case "problem":
        { const g = gain(a); delta += g; if (g) gainedSomething = true; }
        if (!s.problemsUsed.includes(a.id)) { s.problemsUsed.push(a.id); s.counters.problems = s.problemsUsed.length; }
        if (hasQuestion) flag("problem_question");
        if (s.openObjection && gainedSomething) { s.openObjection.reimpulse = true; flag("obj_reimpulsed"); }
        break;
      case "solution":
      case "factor": {
        const g = gain(a); delta += g;
        if (g) { gainedSomething = true; if (s.openObjection) { s.openObjection.reimpulse = true; flag("obj_reimpulsed"); } }
        if (a.kind === "factor" && a.factor && !s.factorsUsed.includes(a.factor)) {
          s.factorsUsed.push(a.factor); s.counters.factors = s.factorsUsed.length;
        }
        break;
      }
      case "greet":
      case "introduce":
      case "transition":
        { const g = gain(a); delta += g; if (g) gainedSomething = true; }
        break;
      case "checkin":
        { const g = gain(a); delta += g; if (g) gainedSomething = true; }
        bump("closes");
        if (!s.methodsUsed.includes("trial")) { s.methodsUsed.push("trial"); s.counters.methods = s.methodsUsed.length; }
        s.closes.push({ turn: s.turns.length, method: "trial", impulse: before, above: before >= m.buyingLine, result: "trial" });
        break;
      case "acknowledge":
        if (s.openObjection && !s.openObjection.ack) { s.openObjection.ack = true; delta += m.ackGain; flag("obj_acknowledged"); acknowledged = true; }
        break;
      case "understand":
        understood = true; flag("said_understand"); delta -= m.understandPenalty; events.push("said_understand");
        break;
      case "confirm":
        if (s.openObjection && !s.openObjection.confirm) { s.openObjection.confirm = true; delta += m.confirmGain; flag("obj_confirmed"); confirmed = true; }
        break;
      case "argue":
        argued = true; flag("argued"); delta -= m.arguePenalty; events.push("argued");
        break;
      case "close":
        if (s.agreed) { if (a.sub) subs.push(a.sub); } else if (!closeAct) closeAct = a;
        break;
      case "consolidate":
        if (a.sub) subs.push(a.sub);
        break;
      case "leave":
        leaving = true;
        break;
      case "ack_interruption":
        break;
    }
  }

  // Talking without moving anything forward loses a little attention.
  const drift = !gainedSomething && !hasQuestion && !s.agreed && !kill && !acknowledged && !confirmed && !leaving && !ackedInterruption;
  if (drift) { delta -= m.driftPenalty; events.push("drift"); }

  s.impulse = clamp(before + delta);

  // Deflection complete: acknowledged, confirmed and re-impulsed.
  if (s.openObjection && s.openObjection.ack && s.openObjection.confirm && s.openObjection.reimpulse) {
    flag("objection_handled"); events.push("objection_handled");
    s.openObjection = null;
  }

  let key = "";
  let reaction: Reaction = "open";
  let closeResult = "";

  if (closeAct) {
    const method = closeAct.method ?? "direct";
    bump("closes");
    if (!s.methodsUsed.includes(method)) { s.methodsUsed.push(method); s.counters.methods = s.methodsUsed.length; }
    const above = s.impulse >= m.buyingLine;
    const sameAsTrigger = s.recloseMethod !== null && s.recloseMethod === method;
    if (s.recloseMethod !== null) {
      if (sameAsTrigger) { events.push("reclose_same"); s.impulse = clamp(s.impulse - m.sameMethodPenalty); }
      else flag("reclose_different");
      s.recloseMethod = null;
    }
    if (s.genuineNo) {
      flag("pushed_after_no"); events.push("pushed_after_no");
      s.criticalErrors.push({ id: "pushed_after_no", turn: s.turns.length });
      s.outcome = "door_closed"; closeResult = "pushed"; key = "close_door_firm"; reaction = "closed";
    } else if (!s.problemsUsed.length || !s.did.some((id) => defs.get(id)?.kind === "solution")) {
      flag("closed_early"); events.push("closed_early");
      s.impulse = clamp(s.impulse - m.earlyClosePenalty);
      closeResult = "too_early"; key = "too_early"; reaction = "sceptical";
    } else if (s.openObjection) {
      s.refusals += 1; bump("refusals"); events.push("reclose_unhandled");
      s.impulse = clamp(s.impulse - m.refusePenalty);
      closeResult = "refused"; key = "refuse_again"; reaction = "folded";
    } else if (!above) {
      s.refusals += 1; bump("refusals"); events.push("close_below_line");
      s.impulse = clamp(s.impulse - m.notYetPenalty);
      closeResult = "not_yet"; key = "not_yet"; reaction = "hesitate";
    } else {
      flag("close_above_line");
      const nextId = s.objectionQueue.shift();
      const obj = pack.scenario.objections.find((o) => o.id === nextId);
      if (obj) {
        s.openObjection = { id: obj.id, method, ack: false, confirm: false, reimpulse: false };
        s.recloseMethod = method;
        flag("objection_raised"); events.push("objection");
        s.impulse = clamp(Math.min(s.impulse - obj.drop, m.buyingLine - obj.gap));
        closeResult = "objection"; key = `objection:${obj.id}`; reaction = "hesitate";
      } else {
        s.agreed = true; flag("agreed"); events.push("agreed");
        s.stage = "consolidation";
        if (closeAct.sub === "frequency") { s.details.frequency = true; key = "agree_frequency"; }
        else if (closeAct.sub === "name") { s.details.name = true; key = "agree_name"; }
        else key = "agree";
        closeResult = "agreed"; reaction = "happy";
      }
    }
    s.closes.push({ turn: s.turns.length, method, impulse: above ? Math.max(s.impulse, m.buyingLine) : s.impulse, above, result: closeResult });
    if (!s.agreed && s.outcome === "in_play" && !s.genuineNo && s.refusals >= m.maxRefusals) {
      s.genuineNo = true; events.push("genuine_no"); key = "genuine_no"; reaction = "folded";
    }
  }

  // Consolidation: details and the self-justification question.
  let subKey = "";
  if (s.agreed && closeResult !== "agreed") {
    for (const sub of subs) {
      if (sub === "reinforce") { if (!subKey) subKey = "reinforced"; }
      if (sub === "frequency" && !s.details.frequency) { s.details.frequency = true; subKey = "give_frequency"; }
      if (sub === "name" && !s.details.name) { s.details.name = true; subKey = "give_name"; }
      if (sub === "self_justify") { flag("self_justified"); subKey = "give_reason"; }
    }
  }
  if (s.agreed && s.details.frequency && s.details.name) flag("details_complete");

  const crossedBuying = before < m.buyingLine && s.impulse >= m.buyingLine && !closeAct;
  if (crossedBuying) events.push("buying_sign");

  // Pick the donor's line and reaction. First match wins.
  if (!key) {
    if (leaving) {
      const signed = s.agreed && s.details.frequency && s.details.name;
      s.outcome = signed ? "signed_up" : "left_well";
      if (s.agreed && !signed) events.push("left_before_details");
      events.push(signed ? "left_signed" : "left_well");
      key = signed ? "goodbye_signed" : s.impulse >= m.attentionLine ? "goodbye_warm" : "goodbye_flat";
      reaction = signed ? "happy" : "open";
    } else if (kill) { key = "kill"; reaction = "folded"; }
    else if (fake) { key = "fake_compliment"; reaction = "sceptical"; }
    else if (argued) { key = "argued"; reaction = "folded"; }
    else if (subKey) { key = subKey; reaction = "happy"; }
    else if (understood) { key = "understand"; reaction = "sceptical"; }
    else if (confirmed) { key = "confirm_yes"; reaction = "open"; }
    else if (acknowledged) { key = "acknowledged"; reaction = "open"; }
    else if (ackedInterruption) { key = "interruption_thanks"; reaction = "open"; }
    else if (goodCompliment) { key = `compliment:${goodCompliment.needsVisible}`; reaction = "laugh"; }
    else if (crossedBuying) { key = "buying_sign"; reaction = "lean"; }
    else if (topic) { key = `topic:${topic.topic}`; reaction = topic.rapport ? "laugh" : "open"; }
    else if (noTopic) { key = `no_topic:${noTopic.topic}`; reaction = "open"; }
    else if (kinds.has("checkin")) { key = s.impulse >= 50 ? "checkin_yes" : "checkin_flat"; }
    else if (kinds.has("problem") || kinds.has("solution") || kinds.has("factor") || kinds.has("transition")) {
      key = s.impulse >= m.buyingLine ? "keen" : s.impulse >= 50 ? "interested" : "listening";
    } else if (kinds.has("greet") || kinds.has("introduce")) { key = "greeting"; }
    else if (drift) { key = "drift"; }
    else { key = s.agreed ? "reinforced" : "listening"; }
  }

  // Losing attention closes the door.
  if (s.outcome === "in_play" && !s.agreed) {
    if (s.impulse < m.attentionLine && s.repTurns >= 2) s.lowStreak += 1; else s.lowStreak = 0;
    if (s.lowStreak >= m.lowStreakLimit || s.impulse <= m.floor) {
      s.outcome = "door_closed"; events.push("lost_attention"); key = "close_door"; reaction = "closed";
    }
  }

  // Standing clues: keen above the Buying Line, drifting below the Attention Line.
  if (reaction === "open" && s.outcome === "in_play") {
    if (s.agreed) reaction = "happy";
    else if (s.impulse >= m.buyingLine) reaction = "lean";
    else if (s.impulse < m.attentionLine && s.repTurns >= 2) reaction = "glance";
  }

  const donor: DonorLine[] = [say(key)];

  // The one scheduled interruption, set by the seed.
  if (s.outcome === "in_play" && !s.agreed && !s.interruptionDone && s.repTurns === s.interruptAt && !s.openObjection && !closeAct) {
    s.interruptionDone = true; s.interruptionActive = true;
    donor.push(say("interruption")); events.push("interruption"); reaction = "glance";
  }

  s.reaction = reaction;
  push({ rep: repRecord, donor, reaction, impulseBefore: before, impulseAfter: s.impulse, stage: s.stage, events });
  return s;
}

/** Which group of example lines fits this moment. Help only: it never changes the rules. */
export function suggestionKey(s: State): string {
  if (s.interruptionActive) return "interruption";
  if (s.agreed) return "consolidation";
  if (s.openObjection) return "objection";
  if (s.genuineNo) return "leave";
  return s.stage;
}

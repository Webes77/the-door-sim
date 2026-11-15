import { useMemo, useState } from "react";
import { clean, lessons, pack } from "../content/pack";
import { weakLineFor } from "../engine/guide";
import { debrief, type Band } from "../engine/score";
import type { State } from "../engine/types";
import { Curve } from "./Curve";
import { Header, Keys, STAGE_LESSONS } from "./Screens";

const BAND: Record<Band, string> = { strong: "Strong", getting_there: "Getting there", needs_work: "Needs work", not_tested: "Not tested" };
const OUTCOME: Record<string, string> = {
  signed_up: "Signed up.",
  door_closed: "She closed the door.",
  left_well: "No sign-up. You left on good terms.",
  walked_away: "You walked away without a sign-up.",
  drill_done: "Practice finished.",
};

/** When the rep tapped a weak line, show what the manual says about it. */
function ManualNote({ text }: { text: string }) {
  const w = weakLineFor(text, pack);
  return w ? <p className="manual">Manual {w.source}: "{clean(w.shows)}"</p> : null;
}

export function Debrief({ state, onAgain, onJump, onNext, onHome, go }: { state: State; onAgain: () => void; onJump: (turn: number) => void; onNext: () => void; onHome: () => void; go: (v: string) => void }) {
  const [read, setRead] = useState("");
  const [open, setOpen] = useState(false);
  const d = useMemo(() => debrief(state, pack), [state]);
  const m = pack.scenario.meta;

  // One stage practised on its own: a short result against that stage's keys.
  if (state.drill) {
    const drill = pack.scenario.drills[state.drill];
    const lesson = lessons.find((l) => l.id === state.drill) ?? lessons.find((l) => l.drill === state.drill)!;
    const i = STAGE_LESSONS.findIndex((l) => l.id === lesson.id);
    const next = i >= 0 ? STAGE_LESSONS[i + 1] : null;
    const live = state.turns.filter((t) => !t.prelude);
    const tp = d.turningPoint;
    return (
      <main className="page">
        <Header onHome={onHome} />
        <p className="eyebrow">{drill.label}</p>
        <h1>{d.performance === "strong" ? "Strong." : d.performance === "getting_there" ? "Getting there." : "Needs work."}</h1>

        {d.criticalErrors.length > 0 && (
          <div className="critical">
            <h3>Critical errors</h3>
            <ul className="bullets">{d.criticalErrors.map((c, k) => <li key={k}>{c.label} <span className="cite">{c.source && `Manual ${c.source}`}</span></li>)}</ul>
          </div>
        )}

        {d.stages.map((s) => (
          <section key={s.id} className="turning">
            <p className="eyebrow">{s.label} <span className={`band ${s.band}`}>{BAND[s.band]}</span></p>
            <ul className="ticks">
              {s.criteria.map((c) => (
                <li key={c.id} className={s.band === "not_tested" ? "na" : c.met ? "met" : "miss"}>{c.label}{c.source && <span className="cite"> {c.source}</span>}</li>
              ))}
            </ul>
          </section>
        ))}

        {tp && tp.title && state.outcome !== "signed_up" && d.performance !== "strong" && (
          <section className="turning">
            <p className="eyebrow">Where it slipped</p>
            <h2>{tp.title}</h2>
            {tp.lines.map((l) => (
              <blockquote key={l.quote}>{clean(l.quote)}<cite>GIG First 4 Weeks Training Manual, {l.source}</cite></blockquote>
            ))}
          </section>
        )}

        <h2>What you said</h2>
        <ol className="timeline">
          {live.map((t) => (
            <li key={t.n}>
              {t.rep && <p className="you">You: {t.rep.text}</p>}
              {t.rep && <ManualNote text={t.rep.text} />}
              {t.donor.length > 0 && <p className="her">Her: {t.donor.map((x) => x.text).join(" ")}</p>}
              <p className="state">{t.events.map((e) => pack.scenario.eventText[e]).filter(Boolean).join(" ")}</p>
            </li>
          ))}
        </ol>

        <h2>The keys to {lesson.title}</h2>
        <Keys lesson={lesson} />
        <p className="cite">GIG First 4 Weeks Training Manual, from {lesson.source}</p>

        <div className="stack">
          {d.performance === "strong" && next && <button className="btn primary" onClick={() => go(`lesson:${next.id}`)}>Next stage: {next.title}</button>}
          {d.performance === "strong" && !next && <button className="btn primary" onClick={() => go("brief")}>Now run the full pitch</button>}
          <button className={d.performance === "strong" ? "btn" : "btn primary"} onClick={onAgain}>Try it again</button>
          <button className="btn" onClick={() => go(`lesson:${lesson.id}`)}>Back to the lesson</button>
          <button className="btn ghost" onClick={onHome}>Home</button>
        </div>
        <p className="foot">Draft content. Not yet reviewed by GIG. The charity is a placeholder.</p>
      </main>
    );
  }

  if (!open) {
    return (
      <main className="page">
        <Header onHome={onHome} />
        <p className="eyebrow">Your read first</p>
        <h1>Where did that door turn, and why?</h1>
        <textarea id="read" value={read} onChange={(e) => setRead(e.target.value)} rows={4} placeholder="One or two sentences. Your own words." />
        <button className="btn primary" onClick={() => setOpen(true)}>Show me</button>
      </main>
    );
  }

  const tp = d.turningPoint;
  const tpTurn = tp ? state.turns[tp.turn] : null;
  const share = Math.round(d.talkShare * 100);

  return (
    <main className="page">
      <Header onHome={onHome} />
      <p className="eyebrow">Debrief</p>
      <h1>{OUTCOME[state.outcome]}</h1>

      <div className="verdicts">
        <div><span>What happened at the door?</span><strong>{OUTCOME[state.outcome]}</strong></div>
        <div><span>Did you sell well?</span><strong className={`band ${d.performance}`}>{BAND[d.performance]}</strong></div>
      </div>

      {d.criticalErrors.length > 0 && (
        <div className="critical">
          <h3>Critical errors</h3>
          <ul className="bullets">{d.criticalErrors.map((c, i) => <li key={i}>{c.label} <span className="cite">{c.source && `Manual ${c.source}`}</span></li>)}</ul>
        </div>
      )}

      {read.trim() && <p className="yourread"><span>Your read</span>{read}</p>}

      <h2>Her impulse, through your conversation</h2>
      <Curve state={state} pack={pack} mark={tp ? tp.turn : null} />

      {tp && (
        <section className="turning">
          <p className="eyebrow">The turning point</p>
          <h2>{tp.title}</h2>
          {tpTurn?.rep && <p className="you">You said: {tpTurn.rep.text}</p>}
          {tpTurn?.rep && <ManualNote text={tpTurn.rep.text} />}
          {tpTurn && tpTurn.donor.length > 0 && <p className="her">She said: {tpTurn.donor.map((x) => x.text).join(" ")}</p>}
          {tp.lines.length > 0 ? (
            <>
              <h3>From your manual</h3>
              {tp.lines.map((l) => (
                <blockquote key={l.quote}>{clean(l.quote)}<cite>GIG First 4 Weeks Training Manual, {l.source}</cite></blockquote>
              ))}
            </>
          ) : (
            <p className="note">Your manual has no line for this moment yet. Ask your trainer what they would say.</p>
          )}
          {state.outcome !== "signed_up" && tp.turn > 0 && (
            <button className="btn" onClick={() => onJump(tp.turn)}>Go back to this moment and try a different line</button>
          )}
        </section>
      )}

      <h2>Stage by stage</h2>
      <ul className="stages">
        {d.stages.map((s) => (
          <li key={s.id}>
            <details>
              <summary><strong>{s.label}</strong><span className={`band ${s.band}`}>{BAND[s.band]}</span></summary>
              <ul className="ticks">
                {s.criteria.map((c) => (
                  <li key={c.id} className={s.band === "not_tested" ? "na" : c.met ? "met" : "miss"}>{c.label}{c.source && <span className="cite"> {c.source}</span>}</li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>

      <h2>KISS check</h2>
      <div className="stats">
        <div><strong>{share}%</strong><span>of the words were yours</span></div>
        <div><strong>{d.questions}</strong><span>questions asked</span></div>
        <div><strong>{d.closes}</strong><span>closes, trial closes included</span></div>
      </div>

      <h2>The conversation, with what she was feeling</h2>
      <ol className="timeline">
        {state.turns.map((t) => (
          <li key={t.n} className={tp?.turn === t.n ? "tp" : ""}>
            {t.rep && <p className="you">You: {t.rep.text}</p>}
            {t.rep && <ManualNote text={t.rep.text} />}
            {t.donor.length > 0 && <p className="her">Her: {t.donor.map((x) => x.text).join(" ")}</p>}
            <p className="state">
              Impulse {t.impulseBefore} to {t.impulseAfter}
              {t.impulseAfter >= m.buyingLine ? ", above the Buying Line" : t.impulseAfter < m.attentionLine ? ", below the Attention Line" : ""}.
              {" "}{t.events.map((e) => pack.scenario.eventText[e]).filter(Boolean).join(" ")}
            </p>
          </li>
        ))}
      </ol>

      <div className="stack">
        <button className="btn primary" onClick={onNext}>Next door</button>
        <button className="btn" onClick={onAgain}>Try the same door again</button>
        <button className="btn ghost" onClick={onHome}>Home</button>
      </div>
      <p className="foot">Draft content. Not yet reviewed by GIG. The charity is a placeholder.</p>
    </main>
  );
}

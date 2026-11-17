import { useEffect, useMemo, useRef, useState } from "react";
import { brand, brandLogo } from "../../content/brand";
import { clean } from "../../content/text";
import { shiftPack as pack } from "../../content/shiftPack";
import { callOf, optionsFor, reduce, start } from "../../engine/shift/engine";
import { debrief, type Band } from "../../engine/shift/score";
import type { Entry, Rule, ShiftAction, ShiftState } from "../../engine/shift/types";
import { Hd } from "../Hd";
import { beep, unlock } from "../sound";

const BAND: Record<Band, string> = { strong: "Strong", getting_there: "Getting there", needs_work: "Needs work" };
const LINE_MS = 1100; // the beat between one caption and the next

function seedFromUrl(): number | null {
  const n = Number(new URLSearchParams(location.search).get("seed"));
  return Number.isInteger(n) && n > 0 ? n : null;
}
const newSeed = () => seedFromUrl() ?? Math.floor(Math.random() * 1e9) + 1;

function Header({ onHome }: { onHome?: () => void }) {
  return (
    <header className="bar">
      <button className="logo" onClick={onHome} aria-label="Home" disabled={!onHome}>
        <img src={brandLogo} alt={brand.name} />
      </button>
      <span className="bar-tag">{pack.client.employer} · {pack.client.title}</span>
    </header>
  );
}

function Source({ rule }: { rule: Rule }) {
  return (
    <blockquote>
      {clean(rule.quote)}
      <cite>{rule.doc}, {clean(rule.section)}</cite>
    </blockquote>
  );
}

export function ShiftApp() {
  const [view, setView] = useState<"home" | "shift" | "read" | "debrief">("home");
  const [state, setState] = useState<ShiftState>(() => start(newSeed()));
  const [read, setRead] = useState("");

  useEffect(() => { document.title = `${pack.client.title} · ${pack.client.employer}`; }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  const dispatch = (a: ShiftAction) => setState((s) => reduce(s, a, pack));
  const begin = () => { setState(start(newSeed())); setRead(""); setView("shift"); };

  if (view === "shift") return <Shift state={state} dispatch={dispatch} onDone={() => setView("read")} onQuit={() => setView("home")} />;

  if (view === "read") {
    return (
      <main className="page">
        <Header />
        <p className="eyebrow">Your read first</p>
        <h1><Hd on="worried">Which call worried you most, and why?</Hd></h1>
        <textarea id="read" value={read} onChange={(e) => setRead(e.target.value)} rows={4} placeholder="One or two sentences. Your own words." />
        <button className="btn primary" onClick={() => setView("debrief")}>Show me</button>
      </main>
    );
  }

  if (view === "debrief") return <Debrief state={state} read={read} onAgain={begin} onHome={() => setView("home")} />;

  return (
    <main className="page">
      <Header />
      <p className="eyebrow">{pack.client.campaign}</p>
      <h1><Hd on="first shift">Your first shift</Hd></h1>
      <p className="draft">{pack.client.draftLabel}</p>
      <p className="callout">You book the call. The broker does the rest.</p>
      <section className="card dark">
        <span className="card-k">Practice shift · {pack.calls.length} calls</span>
        <strong>How it works</strong>
        <ol className="steps-list">
          <li>Go Available. The dialler connects you to a prospect.</li>
          <li>Read what they say. Tap the line you would say.</li>
          <li>When the call ends, wrap it with the right code.</li>
          <li>After the last call, see how the shift went.</li>
        </ol>
        <button className="btn primary" onClick={() => { unlock(); begin(); }}>Start the shift</button>
      </section>
      <p className="note">
        This is a simulation. Every prospect is fictional. {pack.calls.length} of {pack.meta.plannedCalls} calls are ready.
      </p>
      <p className="foot">{pack.client.footer}</p>
    </main>
  );
}

function Shift({ state, dispatch, onDone, onQuit }: { state: ShiftState; dispatch: (a: ShiftAction) => void; onDone: () => void; onQuit: () => void }) {
  // The wrap screen and the next "Available" screen still belong to the call that just ended.
  const def = callOf(pack, state);
  const lines = useMemo(() => state.log.filter((e) => e.call === state.call), [state.log, state.call]);
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState("");
  const end = useRef<HTMLDivElement | null>(null);

  // Captions arrive one at a time, at speaking pace.
  useEffect(() => {
    if (shown >= lines.length) return;
    const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 500 : LINE_MS);
    return () => window.clearTimeout(t);
  }, [shown, lines.length]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [shown, state.phase]);
  useEffect(() => { setShown(0); setPicked(""); }, [state.call]);
  useEffect(() => { if (state.phase === "done") onDone(); }, [state.phase]); // eslint-disable-line

  if (!def) return null;
  const caught = shown >= lines.length;
  const opts = caught ? optionsFor(state, pack) : [];
  // The learner's own line shows at once. The prospect's reply follows at speaking pace.
  const say = (id: string) => { unlock(); dispatch({ type: "say", ids: [id] }); setShown((n) => n + 1); };

  return (
    <main className="call">
      <div className="call-top">
        <button className="chip" onClick={onQuit}>End shift</button>
        <span className="chip on">Call {state.call + 1} of {pack.calls.length}</span>
        <span className="chip">{state.phase === "waiting" ? "Not available" : state.phase === "wrap" && caught ? "Wrap" : "On call"}</span>
      </div>

      {state.phase === "waiting" ? (
        <div className="call-wait">
          <p className="eyebrow light">{pack.client.draftLabel}</p>
          <h2><Hd on="Available">Go Available when you are ready</Hd></h2>
          <p className="small">The dialler connects the moment you go Available. When a live person connects you hear a beep. Start your script.</p>
          <button className="btn primary" onClick={() => { unlock(); beep(); dispatch({ type: "available" }); }}>Available</button>
        </div>
      ) : (
        <>
          <div className="who">
            <strong>{def.prospect.name}</strong>
            <span>Fictional prospect · {def.brief}</span>
          </div>
          <div className="lines" aria-live="polite">
            {lines.slice(0, shown).map((e, i) => <Bubble key={i} e={e} />)}
            {!caught && <p className="dots" aria-hidden="true">…</p>}
            <div ref={end} />
          </div>

          {state.phase === "talking" && caught && (
            <div className="sheet in-call">
              <p className="ask">What do you say?</p>
              <div className="tips">
                {opts.map((o) => <button key={o.id} onClick={() => say(o.id)}>{o.text}</button>)}
              </div>
            </div>
          )}

          {state.phase === "wrap" && caught && (
            <div className="sheet in-call">
              <p className="ask">Wrap the call. Pick the code.</p>
              <div className="codes" role="radiogroup" aria-label="Disposition">
                {pack.dispositions.map((d) => (
                  <button key={d.id} role="radio" aria-checked={picked === d.id} className={picked === d.id ? "on" : ""} onClick={() => setPicked(d.id)}>{clean(d.name)}</button>
                ))}
              </div>
              <button className="btn primary" disabled={!picked} onClick={() => dispatch({ type: "disposition", id: picked })}>
                {state.call + 1 < pack.calls.length ? "Wrap and take the next call" : "Wrap and finish the shift"}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Bubble({ e }: { e: Entry }) {
  if (e.who === "note") return <p className="stage">{e.text}</p>;
  return (
    <p className={`bubble ${e.who === "you" ? "mine" : "theirs"}`}>
      <span>{e.who === "you" ? "You" : "Prospect"}</span>
      {e.text}
    </p>
  );
}

function Debrief({ state, read, onAgain, onHome }: { state: ShiftState; read: string; onAgain: () => void; onHome: () => void }) {
  const d = useMemo(() => debrief(state, pack), [state]);
  return (
    <main className="page">
      <Header onHome={onHome} />
      <p className="eyebrow">Shift debrief</p>
      <h1><Hd>{BAND[d.band]}.</Hd></h1>
      <p className="draft">{pack.client.draftLabel}</p>

      {read.trim() && <p className="yourread"><span>Your read</span>{read}</p>}

      <h2><Hd on="call by call">The shift, call by call</Hd></h2>
      {d.calls.map((c) => (
        <details key={c.id} className="callbox">
          <summary><strong>Call {c.call + 1}: {c.prospect}</strong><span className={`band ${c.band}`}>{BAND[c.band]}</span></summary>
          <ol className="timeline">
            {state.log.filter((e) => e.call === c.call).map((e, i) => (
              <li key={i}>
                <p className={e.who === "you" ? "you" : e.who === "prospect" ? "her" : "state"}>
                  {e.who === "you" ? "You: " : e.who === "prospect" ? `${pack.calls[c.call].prospect.first}: ` : ""}{e.text}
                </p>
              </li>
            ))}
            <li><p className="state">You wrapped the call as {c.disposition.picked}.</p></li>
          </ol>
        </details>
      ))}

      {d.criticalErrors.length > 0 && (
        <div className="critical">
          <h3><Hd>Critical errors</Hd></h3>
          <p className="note">A critical error is never hidden by a good score.</p>
          {d.criticalErrors.map((e, i) => (
            <div key={i} className="crit">
              <p><strong>Call {e.call + 1}, {e.prospect}.</strong> {e.rule.title}.</p>
              <Source rule={e.rule} />
            </div>
          ))}
        </div>
      )}

      <h2><Hd>Results</Hd></h2>
      <div className="verdicts">
        <div><span>The shift</span><strong className={`band ${d.band}`}>{BAND[d.band]}</strong></div>
        {d.calls.map((c) => (
          <div key={c.id}><span>Call {c.call + 1} · {c.right} of {c.total} right</span><strong className={`band ${c.band}`}>{BAND[c.band]}</strong></div>
        ))}
      </div>

      <h2><Hd on="rule">Each moment, and the rule</Hd></h2>
      {d.moments.map((m, i) => (
        <section key={i} className="turning">
          <p className="eyebrow">Call {m.call + 1} · {clean(m.moment)} <span className={`band ${m.kept ? "strong" : "needs_work"}`}>{m.kept ? "Kept" : "Broken"}</span></p>
          <p className="you">You said: {m.said}</p>
          {m.rules.map((r) => (
            <div key={r.rule.id} className="ruleline">
              <p className={r.kept ? "tick met" : "tick miss"}>{r.rule.title}</p>
              <Source rule={r.rule} />
            </div>
          ))}
        </section>
      ))}

      <h2><Hd on="codes">The wrap codes</Hd></h2>
      {d.calls.map((c) => (
        <section key={c.id} className="turning">
          <p className="eyebrow">Call {c.call + 1} · {c.prospect} <span className={`band ${c.disposition.right ? "strong" : "needs_work"}`}>{c.disposition.right ? "Right code" : "Wrong code"}</span></p>
          <p className="you">You picked: {clean(c.disposition.picked)}{c.disposition.right ? "" : `. The code for this call: ${c.disposition.correct.map(clean).join(" or ")}`}</p>
          {c.disposition.rule && <Source rule={c.disposition.rule} />}
        </section>
      ))}

      <div className="stack">
        <button className="btn primary" onClick={onAgain}>Run the shift again</button>
        <button className="btn ghost" onClick={onHome}>Home</button>
      </div>
      <p className="foot">{pack.client.footer}</p>
    </main>
  );
}

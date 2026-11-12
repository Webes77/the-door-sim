import { useEffect, useRef, useState } from "react";
import { asset, pack } from "../content/pack";
import { suggestionKey, variantOf } from "../engine/engine";
import { matchActions } from "../engine/match";
import { STAGES, type Action, type State } from "../engine/types";
import { Donor } from "./Donor";

type Recognition = { start: () => void; stop: () => void; abort: () => void; lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: ((e: any) => void) | null };

function makeRecognition(): Recognition | null {
  const w = window as any;
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!C) return null;
  try { return new C() as Recognition; } catch { return null; }
}

export function Door({ state, dispatch, onDebrief, onQuit }: { state: State; dispatch: (a: Action) => void; onDebrief: () => void; onQuit: () => void }) {
  const [text, setText] = useState("");
  const [guided, setGuided] = useState(true);
  const [caption, setCaption] = useState("");
  const [shownTurn, setShownTurn] = useState(-1);
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState("");
  const rec = useRef<Recognition | null>(null);
  const speechStart = useRef(0);
  const sentAt = useRef(0);
  const canListen = useRef(!!makeRecognition()).current;

  const knocked = state.turns.length > 0;
  const over = state.outcome !== "in_play";
  const last = state.turns.at(-1);
  const v = variantOf(pack, state);

  // The donor's words follow her movement by a beat, so the two arrive together.
  useEffect(() => {
    if (!last || last.n === shownTurn) return;
    const wait = last.rep ? 650 : 1500;
    const t = window.setTimeout(() => {
      setCaption(last.donor.map((d) => d.text).join(" "));
      setShownTurn(last.n);
      if (sentAt.current) {
        // Reply latency: end of the rep's turn to the donor's reply showing.
        console.info("latency_ms", Math.round(performance.now() - sentAt.current), "turn", last.n);
        sentAt.current = 0;
      }
    }, wait);
    return () => window.clearTimeout(t);
  }, [last?.n]); // eslint-disable-line

  const send = (line: string, seconds?: number) => {
    const t = line.trim();
    if (!t || over || !knocked) return;
    sentAt.current = performance.now();
    dispatch({ type: "rep_turn", text: t, ids: matchActions(t, pack.scenario.actions), seconds });
    setText("");
  };

  const toggleMic = () => {
    if (listening) { rec.current?.stop(); return; }
    const r = makeRecognition();
    if (!r) return;
    rec.current = r;
    r.lang = "en-AU"; r.interimResults = true; r.continuous = false;
    let finalText = "";
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
      }
      setText(finalText + interim);
    };
    r.onerror = (e: any) => { setMicNote(e?.error === "not-allowed" ? "The microphone is blocked. Type instead." : "Nothing heard. Try again, or type."); };
    r.onend = () => {
      setListening(false);
      const seconds = (performance.now() - speechStart.current) / 1000;
      // Speech sends itself at the end. A mishearing shows as "Sorry?" and is never scored.
      if (finalText.trim()) send(finalText, seconds);
    };
    speechStart.current = performance.now();
    setMicNote(""); setListening(true);
    try { r.start(); } catch { setListening(false); }
  };

  const key = suggestionKey(state);
  const tips = (() => {
    const s = pack.scenario.suggestions;
    const list = [...(s[key] ?? [])];
    const i = STAGES.indexOf(key as never);
    if (i >= 0 && i < 3) list.push(...(s[STAGES[i + 1]] ?? []));
    const fresh = i >= 0 || key === "consolidation" ? list.filter((t) => !state.turns.some((x) => x.rep?.text === t)) : list;
    return fresh.slice(0, 3);
  })();

  return (
    <main className="door">
      <Donor reaction={state.reaction} base={asset("art/gig/donor1")} />
      <div className="door-top">
        <button className="chip" onClick={onQuit}>Quit</button>
        <button className={`chip ${guided ? "on" : ""}`} aria-pressed={guided} onClick={() => setGuided(!guided)}>Example lines {guided ? "on" : "off"}</button>
        {knocked && !over && <button className="chip" onClick={() => dispatch({ type: "walk_away" })}>Walk away</button>}
      </div>

      {!knocked && (
        <div className="sheet knock">
          <p className="eyebrow light">Before you knock</p>
          <h2>What you notice</h2>
          <p>{v.notice}</p>
          <p className="small">{pack.personas.find((p) => p.id === state.personaId)?.situation}</p>
          <button className="btn primary" onClick={() => dispatch({ type: "knock" })}>Knock</button>
        </div>
      )}

      {knocked && (
        <div className="sheet">
          <p className="caption" aria-live="polite">{shownTurn === last?.n ? caption : "…"}</p>
          {last?.rep && <p className="you">You: {last.rep.text}</p>}
          {over ? (
            <button className="btn primary" onClick={onDebrief}>See what happened</button>
          ) : (
            <>
              {guided && tips.length > 0 && (
                <div className="tips">
                  {tips.map((t) => <button key={t} onClick={() => send(t)}>{t}</button>)}
                </div>
              )}
              <form className="say" onSubmit={(e) => { e.preventDefault(); send(text); }}>
                {canListen && (
                  <button type="button" className={`mic ${listening ? "live" : ""}`} onClick={toggleMic} aria-label={listening ? "Stop listening" : "Speak"}>
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1A7 7 0 0 0 19 12h-2Z" fill="currentColor" /></svg>
                  </button>
                )}
                <input id="say" value={text} onChange={(e) => setText(e.target.value)} placeholder={listening ? "Listening…" : "Say it, or type it"} autoComplete="off" enterKeyHint="send" />
                <button type="submit" className="send" disabled={!text.trim()}>Send</button>
              </form>
              {micNote && <p className="small">{micNote}</p>}
            </>
          )}
        </div>
      )}
    </main>
  );
}

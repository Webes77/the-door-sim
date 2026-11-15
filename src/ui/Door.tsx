import { useEffect, useRef, useState } from "react";
import { asset, clean, lessons, pack } from "../content/pack";
import { suggestionKey, variantOf } from "../engine/engine";
import { optionsFor } from "../engine/guide";
import { matchActions } from "../engine/match";
import { STAGES, type Action, type State } from "../engine/types";
import { Donor, type Approach } from "./Donor";
import { Keys } from "./Screens";
import { hasVoice, hush, knock, speak, unlock, warm } from "./sound";
import { Hd } from "./Hd";

type Recognition = { start: () => void; stop: () => void; lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: ((e: any) => void) | null };

function makeRecognition(): Recognition | null {
  const w = window as any;
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!C) return null;
  try { return new C() as Recognition; } catch { return null; }
}

export function Door({ state, dispatch, onDebrief, onQuit }: { state: State; dispatch: (a: Action) => void; onDebrief: () => void; onQuit: () => void }) {
  const drill = state.drill ? pack.scenario.drills[state.drill] : null;
  const startedMidway = useRef(state.turns.length > 0).current;
  const [approach, setApproach] = useState<Approach>(startedMidway ? null : "street");
  const [ready, setReady] = useState(!(startedMidway && drill));
  const [text, setText] = useState("");
  const [guided, setGuided] = useState(true);
  const [keysOpen, setKeysOpen] = useState(false);
  const [caption, setCaption] = useState(startedMidway ? state.turns.at(-1)?.donor.map((d) => d.text).join(" ") ?? "" : "");
  const [shownTurn, setShownTurn] = useState(startedMidway ? state.turns.length - 1 : -1);
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [voiceReady, setVoiceReady] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const speechStart = useRef(0);
  const sentAt = useRef(0);
  const canListen = useRef(!!makeRecognition()).current;

  const knocked = state.turns.length > 0;
  const over = state.outcome !== "in_play";
  const last = state.turns.at(-1);
  const v = variantOf(pack, state);

  useEffect(() => { void hasVoice().then((ok) => { setVoiceReady(ok); if (ok) void warm(); }); return hush; }, []);

  // The donor's words follow her movement by a beat, so the two arrive together.
  useEffect(() => {
    if (!last || last.n === shownTurn) return;
    const wait = last.rep ? 650 : 2600; // after the knock, wait for the door to open
    const t = window.setTimeout(() => {
      const line = last.donor.map((d) => d.text).join(" ");
      setCaption(line);
      setShownTurn(last.n);
      // Reply latency: end of the rep's turn to the donor's reply showing, then to her first sound.
      const sent = sentAt.current;
      sentAt.current = 0;
      if (sent) console.info("latency_ms", Math.round(performance.now() - sent), "turn", last.n);
      if (voiceOn) {
        void speak(last.donor.map((d) => d.text)).then((ms) => {
          if (ms !== null && sent) console.info("voice_latency_ms", Math.round(performance.now() - sent), "turn", last.n);
        });
      }
    }, wait);
    return () => window.clearTimeout(t);
  }, [last?.n]); // eslint-disable-line

  const send = (line: string, seconds?: number) => {
    const t = line.trim();
    if (!t || over || !knocked) return;
    unlock();
    sentAt.current = performance.now();
    dispatch({ type: "rep_turn", text: t, ids: matchActions(t, pack.scenario.actions), seconds });
    setText("");
  };

  const doKnock = () => {
    knock();
    setApproach("arrived");
    window.setTimeout(() => { setApproach(null); dispatch({ type: "knock" }); }, 900);
  };

  const toggleMic = () => {
    if (listening) { rec.current?.stop(); return; }
    unlock();
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

  // In a stage practice the earlier stages are already done, so help starts at the practised stage.
  const key = (() => {
    const k = suggestionKey(state);
    const at = STAGES.indexOf(k as never), want = STAGES.indexOf(state.drill as never);
    return drill && at >= 0 && want > at ? (state.drill as string) : k;
  })();
  // "What would you say?" The strong line and up to two weak ones, in a mixed order.
  const opts = optionsFor(state, pack);

  // The keys shown mid-conversation belong to the moment the rep is in.
  const keyLesson =
    lessons.find((l) => l.id === (state.agreed ? "consolidation" : state.openObjection ? "objections" : drill && !knocked ? state.drill : key === "leave" || key === "interruption" ? state.stage : key)) ??
    lessons.find((l) => l.id === state.stage)!;

  return (
    <main className="door">
      <Donor reaction={state.reaction} approach={approach} onArrive={() => setApproach("arrived")} base={asset("art/gig/donor1")} />
      <div className="door-top">
        <button className="chip" onClick={onQuit}>Quit</button>
        <button className="chip" onClick={() => setKeysOpen(true)}>Keys</button>
        <button className={`chip ${guided ? "on" : ""}`} aria-pressed={guided} onClick={() => setGuided(!guided)}>Choices {guided ? "on" : "off"}</button>
        {voiceReady && <button className={`chip ${voiceOn ? "on" : ""}`} aria-pressed={voiceOn} onClick={() => { if (voiceOn) hush(); else unlock(); setVoiceOn(!voiceOn); }}>Voice {voiceOn ? "on" : "off"}</button>}
        {knocked && !over && ready && <button className="chip" onClick={() => dispatch({ type: "walk_away" })}>Walk away</button>}
      </div>

      {keysOpen && (
        <div className="keys" role="dialog" aria-label="Keys">
          <div className="keys-in">
            <p className="eyebrow">{keyLesson.stageNo ? `Stage ${keyLesson.stageNo} of 5` : keyLesson.group}</p>
            <h2><Hd>{keyLesson.title}</Hd></h2>
            <Keys lesson={keyLesson} compact />
            <p className="cite">GIG First 4 Weeks Training Manual, from {keyLesson.source}</p>
            <button className="btn primary" onClick={() => setKeysOpen(false)}>Back to the door</button>
          </div>
        </div>
      )}

      {approach === "street" && (
        <div className="sheet knock">
          <p className="eyebrow light">{drill ? drill.label : "The full pitch"}</p>
          <h2><Hd on="Walk up">Walk up to the door</Hd></h2>
          {drill && <p>{drill.brief}</p>}
          <p className="small">S.E.E.N. starts now. Smile on the approach. Look for one thing you could genuinely compliment.</p>
          <button className="btn primary" onClick={() => { unlock(); setApproach("walking"); }}>Walk up</button>
        </div>
      )}

      {approach === "arrived" && !knocked && (
        <div className="sheet knock">
          <p className="eyebrow light">Before you knock</p>
          <h2><Hd on="notice">What you notice</Hd></h2>
          <ul className="notice">{v.notice.map((n) => <li key={n}>{n}</li>)}</ul>
          <p className="small">{clean("Open with the compliment if you have one, otherwise open with a question.")}</p>
          <button className="btn primary" onClick={doKnock}>Knock</button>
        </div>
      )}

      {knocked && !ready && drill && (
        <div className="sheet knock">
          <p className="eyebrow light">{drill.label}</p>
          <h2><Hd on="Where">Where you are</Hd></h2>
          <p>{drill.brief}</p>
          <p className="small">She just said: "{caption}"</p>
          <button className="btn primary" onClick={() => { unlock(); setReady(true); }}>Start</button>
        </div>
      )}

      {knocked && ready && !approach && (
        <div className="sheet">
          <p className="caption" aria-live="polite">{shownTurn === last?.n ? caption : "…"}</p>
          {last?.rep && !last.prelude && <p className="you">You: {last.rep.text}</p>}
          {over ? (
            <button className="btn primary" onClick={onDebrief}>{state.outcome === "drill_done" ? "See how you went" : "See what happened"}</button>
          ) : (
            <>
              {guided && opts.length > 0 && shownTurn === last?.n && (
                <>
                  <p className="ask">What would you say?</p>
                  <div className="tips">
                    {opts.map((o) => (
                      <button key={o.text} onClick={() => send(o.text, o.seconds)}>
                        {o.text}
                        {o.seconds && <span className="long">You keep going. About {o.seconds} seconds.</span>}
                      </button>
                    ))}
                  </div>
                </>
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

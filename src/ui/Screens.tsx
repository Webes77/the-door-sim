import { useEffect, useState } from "react";
import { brand, brandLogo } from "../content/brand";
import { clean, lessons, onboarding, pack, type Block, type Lesson } from "../content/pack";
import type { Progress } from "./store";
import { Hd } from "./Hd";

const MANUAL = "GIG First 4 Weeks Training Manual";
export const STAGE_LESSONS = lessons.filter((l) => l.stageNo).sort((a, b) => a.stageNo! - b.stageNo!);
const SCRIPT_ORDER: [string, string][] = [
  ["introduction", "1. Introduction"], ["problem", "2. Problem"], ["solution", "3. Solution"],
  ["close", "4. Close"], ["objection", "When she objects"], ["consolidation", "5. Consolidation"],
];

export function Header({ onHome }: { onHome?: () => void }) {
  return (
    <header className="bar">
      <button className="logo" onClick={onHome} aria-label="Home" disabled={!onHome}>
        <img src={brandLogo} alt={brand.name} />
      </button>
      <span className="bar-tag">{brand.id === "magnum" ? `${brand.name} · ${brand.tag}` : brand.tag}</span>
    </header>
  );
}

type P3 = { taught?: boolean; understood?: boolean; applied?: boolean } | undefined;

function Badges({ p }: { p: P3 }) {
  return (
    <span className="badges" aria-label="Progress">
      <i className={p?.taught ? "on" : ""}>Taught</i>
      <i className={p?.understood ? "on" : ""}>Understood</i>
      <i className={p?.applied ? "on" : ""}>Applied</i>
    </span>
  );
}

export function Dashboard({ progress, go }: { progress: Progress; go: (v: string) => void }) {
  const next = STAGE_LESSONS.find((l) => !progress.skills[l.id]?.applied) ?? null;
  return (
    <main className="page">
      <Header />
      <p className="eyebrow">Fundraiser development</p>
      <h1><Hd on="four weeks">Your first four weeks</Hd></h1>
      <p className="callout">Master the basics. Everything is built on them.</p>

      <section className="card dark">
        <span className="card-k">Week 1 · Learn and execute</span>
        <strong>Learn the pitch before hitting the field</strong>
        <ol className="stepper">
          {STAGE_LESSONS.map((l) => {
            const p = progress.skills[l.id];
            return (
              <li key={l.id}>
                <button onClick={() => go(`lesson:${l.id}`)} className={p?.applied ? "done" : p?.taught ? "seen" : ""}>
                  <b>{l.stageNo}</b>
                  <span>{l.title}</span>
                  <em>{p?.applied ? "Applied" : p?.understood ? "Understood" : p?.taught ? "Taught" : ""}</em>
                </button>
              </li>
            );
          })}
        </ol>
        <button className="btn primary" onClick={() => go(next ? `lesson:${next.id}` : "brief")}>
          {next ? `${progress.skills[next.id]?.taught ? "Continue" : "Start"}: ${next.title}` : "Run the full pitch"}
        </button>
      </section>

      <button className="card" onClick={() => go("brief")}>
        <span className="card-k">Practise</span>
        <strong>The full pitch at a door</strong>
        <span>All five stages with a donor, start to finish. Then see where it turned.</span>
        <span className="card-meta">{progress.doors} doors practised · {progress.signUps} sign-ups</span>
      </button>

      <button className="card" onClick={() => go("script")}>
        <span className="card-k">Your campaign</span>
        <strong>The pitch script</strong>
        <span>What to say at each stage for {pack.campaign.charity}.</span>
      </button>

      <button className="card" onClick={() => go("skills")}>
        <span className="card-k">Sales skills</span>
        <strong>Every system in the manual</strong>
        <span>{lessons.length} systems, in the manual's own words.</span>
      </button>

      <button className="card" onClick={() => go("onboarding")}>
        <span className="card-k">Onboarding</span>
        <strong>Rules of conduct</strong>
        <span className="card-meta draft">Placeholder</span>
      </button>

      <p className="foot">Draft content. Not yet reviewed by GIG.</p>
    </main>
  );
}

export function Onboarding({ go }: { go: (v: string) => void }) {
  return (
    <main className="page">
      <Header onHome={() => go("home")} />
      <p className="eyebrow">Onboarding</p>
      <h1><Hd>Rules of conduct</Hd></h1>
      <p>{onboarding.note}</p>
      <ul className="list">
        {onboarding.sections.map((s) => (
          <li key={s.title}>
            <strong>{s.title}</strong>
            <span className="draft">{s.status}</span>
          </li>
        ))}
      </ul>
      <button className="btn ghost" onClick={() => go("home")}>Back</button>
    </main>
  );
}

export function Skills({ progress, go }: { progress: Progress; go: (v: string) => void }) {
  const groups = Array.from(new Set(lessons.map((s) => s.group)));
  return (
    <main className="page">
      <Header onHome={() => go("home")} />
      <p className="eyebrow">Sales skills</p>
      <h1><Hd>Your core systems</Hd></h1>
      <p>Each one gives you a specific tool for the doors. Read it, then apply it with a donor.</p>
      {groups.map((g) => (
        <section key={g}>
          <h2><Hd>{g}</Hd></h2>
          <ul className="list">
            {lessons.filter((s) => s.group === g).map((s) => (
              <li key={s.id}>
                <button className="row" onClick={() => go(`lesson:${s.id}`)}>
                  <strong>{s.stageNo ? `${s.stageNo}. ` : ""}{s.title}</strong>
                  <Badges p={progress.skills[s.id]} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <button className="btn ghost" onClick={() => go("home")}>Back</button>
    </main>
  );
}

function BlockView({ b }: { b: Block }) {
  if (b.type === "list") {
    return (
      <section>
        {b.title && <h3><Hd>{b.title}</Hd></h3>}
        {b.intro && <p>{clean(b.intro)}</p>}
        <ul className="ticklist">{b.items.map((i) => <li key={i}>{clean(i)}</li>)}</ul>
        {b.outro && <p>{clean(b.outro)}</p>}
      </section>
    );
  }
  if (b.type === "table") {
    return (
      <section>
        {b.title && <h3><Hd>{b.title}</Hd></h3>}
        <div className="mtable">
          {b.rows.map((r) => (
            <div key={r[0]} className="mrow">
              <strong>{clean(r[0])}</strong>
              {r.slice(1).map((c, i) => <p key={i}><span>{b.cols[i + 1]}</span>{clean(c)}</p>)}
            </div>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section>
      {b.title && <h3><Hd>{b.title}</Hd></h3>}
      {b.paras.map((p) => <p key={p}>{clean(p)}</p>)}
    </section>
  );
}

/** The keys for one system, in the order the manual teaches them. */
export function Keys({ lesson, compact }: { lesson: Lesson; compact?: boolean }) {
  return (
    <>
      <div className="target">
        <h4>Daily target</h4>
        <p>{clean(lesson.target)}</p>
      </div>
      {lesson.strong.length > 0 && (
        <div className="sounds">
          {!compact && lesson.weak.length > 0 && (
            <div className="ex weak"><b>Weak</b><p>{clean(lesson.weak[0])}</p><p className="why">{clean(lesson.weak[1])}</p></div>
          )}
          <div className="ex strong"><b>Strong</b><p>{clean(lesson.strong[0])}</p><p className="why">{clean(lesson.strong[1])}</p></div>
        </div>
      )}
      <h3><Hd>What to avoid</Hd></h3>
      <ul className="bullets">{lesson.avoid.map((a) => <li key={a}>{clean(a)}</li>)}</ul>
      {lesson.focus.length > 0 && (
        <>
          <h3><Hd on="Focus">Focus on these two things</Hd></h3>
          <ul className="bullets">{lesson.focus.map((a) => <li key={a}>{clean(a)}</li>)}</ul>
        </>
      )}
      <h3><Hd>Remember</Hd></h3>
      <p>{clean(lesson.remember)}</p>
    </>
  );
}

export function LessonPage({ lesson, progress, mark, go }: { lesson: Lesson; progress: Progress; mark: (id: string, k: "taught" | "understood") => void; go: (v: string) => void }) {
  useEffect(() => { mark(lesson.id, "taught"); }, [lesson.id]); // eslint-disable-line
  const p = progress.skills[lesson.id];
  const script = lesson.stageNo ? pack.scenario.suggestions[lesson.id] ?? [] : lesson.id === "objections" ? pack.scenario.suggestions.objection : [];
  const drill = lesson.drill ? pack.scenario.drills[lesson.drill] : null;
  const i = STAGE_LESSONS.findIndex((l) => l.id === lesson.id);
  const nextStage = i >= 0 ? STAGE_LESSONS[i + 1] : null;
  return (
    <main className="page lesson">
      <Header onHome={() => go("home")} />
      <p className="eyebrow">{lesson.stageNo ? `Stage ${lesson.stageNo} of 5` : lesson.group}</p>
      <h1><Hd>{lesson.title}</Hd></h1>

      <h3><Hd on="What">What it is</Hd></h3>
      {lesson.what.map((w) => <p key={w}>{clean(w)}</p>)}

      <h3><Hd on="Why">Why it matters</Hd></h3>
      <p className="callout">{clean(lesson.why.callout)}</p>
      <p>{clean(lesson.why.text)}</p>

      {lesson.blocks.map((b, k) => <BlockView key={k} b={b} />)}

      {lesson.strong.length > 0 && (
        <>
          <h3><Hd on="sounds">What it sounds like</Hd></h3>
          <p>{clean(lesson.sounds)}</p>
          <div className="sounds">
            <div className="ex weak"><b>Weak</b><p>{clean(lesson.weak[0])}</p><p className="why">{clean(lesson.weak[1])}</p></div>
            <div className="ex strong"><b>Strong</b><p>{clean(lesson.strong[0])}</p><p className="why">{clean(lesson.strong[1])}</p></div>
          </div>
        </>
      )}

      <h3><Hd>What to avoid</Hd></h3>
      <ul className="bullets">{lesson.avoid.map((a) => <li key={a}>{clean(a)}</li>)}</ul>

      {lesson.focus.length > 0 && (
        <>
          <h3><Hd on="Focus">Focus on these two things</Hd></h3>
          <ul className="bullets">{lesson.focus.map((a) => <li key={a}>{clean(a)}</li>)}</ul>
        </>
      )}

      <h3><Hd>Remember</Hd></h3>
      <p>{clean(lesson.remember)}</p>

      <div className="target">
        <h4>Daily target</h4>
        <p>{clean(lesson.target)}</p>
      </div>

      <div className="try">
        <h4>Try this today</h4>
        <ul className="ticklist">{lesson.tryToday.map((t) => <li key={t}>{clean(t)}</li>)}</ul>
      </div>
      <p className="cite">{MANUAL}, from {lesson.source}</p>

      {script.length > 0 && (
        <section className="scriptbox">
          <h3><Hd>Your lines for {pack.campaign.charity}</Hd></h3>
          <p className="draft">Draft. Built on the manual's strong examples.</p>
          {script.map((s) => <p key={s} className="line">{s}</p>)}
        </section>
      )}

      <div className="signoff" aria-label="Sign-off">
        <div className={p?.taught ? "on" : ""}><span>Taught</span><b>{p?.taught ? "✓" : ""}</b></div>
        <div className={p?.understood ? "on" : ""}><span>Understood</span><b>{p?.understood ? "✓" : ""}</b></div>
        <div className={p?.applied ? "on" : ""}><span>Applied</span><b>{p?.applied ? "✓" : ""}</b></div>
      </div>

      {!lesson.practice && (
        <p className="note">This one is about how you carry yourself and how you sound. The practice door can't score it yet. Watch how the donor's body changes, and ask your trainer for a note.</p>
      )}
      <div className="stack">
        {!p?.understood && <button className="btn" onClick={() => mark(lesson.id, "understood")}>I understand this</button>}
        {drill && <button className="btn primary" onClick={() => go(`drill:${lesson.drill}`)}>{drill.label}</button>}
        {!drill && lesson.practice && <button className="btn primary" onClick={() => go("brief")}>Apply it in a full pitch</button>}
        {nextStage && <button className="btn" onClick={() => go(`lesson:${nextStage.id}`)}>Next stage: {nextStage.title}</button>}
        <button className="btn ghost" onClick={() => go("skills")}>All systems</button>
      </div>
    </main>
  );
}

export function Script({ go }: { go: (v: string) => void }) {
  const s = pack.scenario.suggestions;
  return (
    <main className="page">
      <Header onHome={() => go("home")} />
      <p className="eyebrow">Your campaign</p>
      <h1><Hd>The pitch script</Hd></h1>
      <p className="draft pill">Draft for a placeholder charity</p>
      <p>The five stages are not a script. They are the shape your conversation needs to take. These lines show the shape for this campaign. Make them yours.</p>
      {SCRIPT_ORDER.map(([key, label]) => {
        const l = lessons.find((x) => x.id === (key === "objection" ? "objections" : key));
        return (
          <section key={key} className="scriptbox">
            <h3><Hd>{label}</Hd></h3>
            {l && <p className="small ink">{clean(l.target)}</p>}
            {(s[key] ?? []).map((line) => <p key={line} className="line">{line}</p>)}
            {l && <button className="btn ghost left" onClick={() => go(`lesson:${l.id}`)}>The keys to this stage</button>}
          </section>
        );
      })}
      <div className="stack">
        <button className="btn primary" onClick={() => go("door")}>Run the full pitch at a door</button>
        <button className="btn ghost" onClick={() => go("home")}>Back</button>
      </div>
    </main>
  );
}

export function Brief({ go }: { go: (v: string) => void }) {
  const c = pack.campaign;
  return (
    <main className="page">
      <Header onHome={() => go("home")} />
      <p className="eyebrow">Campaign brief</p>
      <h1><Hd>{c.charity}</Hd></h1>
      {c.placeholder && <p className="draft pill">Placeholder charity. Not real.</p>}
      <h3><Hd>Two problem points</Hd></h3>
      <ul className="bullets">{c.problems.map((p) => <li key={p}>{p}</li>)}</ul>
      <h3><Hd>The impact</Hd></h3>
      <p>{c.impact}</p>
      <h3><Hd>Long-term progress</Hd></h3>
      <p>{c.progress}</p>
      <h3><Hd>The ask</Hd></h3>
      <p>{c.ask}</p>
      <div className="target">
        <h4>Daily target</h4>
        <p>Run all five stages, in order, in every full pitch. Ask a question every two to three sentences. Close confidently at least three times.</p>
      </div>
      <div className="stack">
        <button className="btn primary" onClick={() => go("door")}>Head to the door</button>
        <button className="btn" onClick={() => go("script")}>Read the pitch script first</button>
        <button className="btn ghost" onClick={() => go("home")}>Back</button>
      </div>
    </main>
  );
}

const STEPS = ["Breathe", "Reset", "Move", "Next door"];

export function ResetBeat({ done }: { done: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const times = [1700, 1700, 900, 900];
    const t = window.setTimeout(() => (i < STEPS.length - 1 ? setI(i + 1) : done()), times[i]);
    return () => window.clearTimeout(t);
  }, [i]); // eslint-disable-line
  return (
    <main className="reset" onClick={done}>
      <div className={`ring ${i === 0 ? "in" : ""}`}><span>{STEPS[i]}</span></div>
      <p className="callout light">The next door deserves a fresh version of you.</p>
      <div className="steps">{STEPS.map((s, k) => <span key={s} className={k <= i ? "on" : ""}>{s}</span>)}</div>
    </main>
  );
}

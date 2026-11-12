import { useEffect, useState } from "react";
import { clean, onboarding, pack, skills, type Skill } from "../content/pack";
import type { Progress } from "./store";

export function Header({ onHome, right }: { onHome?: () => void; right?: React.ReactNode }) {
  return (
    <header className="bar">
      <button className="logo" onClick={onHome} aria-label="Home" disabled={!onHome}>
        <img src={pack.client.logo} alt={pack.client.name} />
      </button>
      <span className="bar-tag">The GIG Academy</span>
      <span className="bar-right">{right}</span>
    </header>
  );
}

function Badges({ p }: { p?: { taught?: boolean; understood?: boolean; applied?: boolean } }) {
  return (
    <span className="badges" aria-label="Progress">
      <i className={p?.taught ? "on" : ""}>Taught</i>
      <i className={p?.understood ? "on" : ""}>Understood</i>
      <i className={p?.applied ? "on" : ""}>Applied</i>
    </span>
  );
}

export function Dashboard({ progress, go }: { progress: Progress; go: (v: string) => void }) {
  const applied = skills.filter((s) => progress.skills[s.id]?.applied).length;
  return (
    <main className="page">
      <Header />
      <p className="eyebrow">Fundraiser development</p>
      <h1>Your first four weeks</h1>
      <p className="callout">Master the basics. Everything is built on them.</p>

      <button className="card dark" onClick={() => go("brief")}>
        <span className="card-k">Practise</span>
        <strong>Knock on a door</strong>
        <span>Talk to a donor. Read her. Ask for the sign-up. Then see where it turned.</span>
        <span className="card-meta">{progress.doors} doors practised · {progress.signUps} sign-ups</span>
      </button>

      <button className="card" onClick={() => go("skills")}>
        <span className="card-k">Section 2</span>
        <strong>Sales skills</strong>
        <span>The systems from your training manual, one at a time.</span>
        <span className="card-meta">{applied} of {skills.filter((s) => s.practice).length} applied at the door</span>
      </button>

      <button className="card" onClick={() => go("onboarding")}>
        <span className="card-k">Section 1</span>
        <strong>Onboarding</strong>
        <span>Rules of conduct for fundraisers.</span>
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
      <p className="eyebrow">Section 1</p>
      <h1>Onboarding</h1>
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
  const parts = Array.from(new Set(skills.map((s) => s.part)));
  return (
    <main className="page">
      <Header onHome={() => go("home")} />
      <p className="eyebrow">Section 2</p>
      <h1>Sales skills</h1>
      <p>Each one gives you a tool for the doors. Read it, then apply it with a donor.</p>
      {parts.map((part) => (
        <section key={part}>
          <h2>{part}</h2>
          <ul className="list">
            {skills.filter((s) => s.part === part).map((s) => (
              <li key={s.id}>
                <button className="row" onClick={() => go(`skill:${s.id}`)}>
                  <strong>{s.title}</strong>
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

export function SkillPage({ skill, progress, mark, go }: { skill: Skill; progress: Progress; mark: (id: string, k: "taught" | "understood") => void; go: (v: string) => void }) {
  useEffect(() => { mark(skill.id, "taught"); }, [skill.id]); // eslint-disable-line
  const p = progress.skills[skill.id];
  return (
    <main className="page">
      <Header onHome={() => go("home")} />
      <p className="eyebrow">{skill.part}</p>
      <h1>{skill.title}</h1>
      <h3>What it is</h3>
      <p>{clean(skill.what)}</p>
      <p className="callout">{clean(skill.remember)}</p>
      <p className="cite">GIG First 4 Weeks Training Manual, {skill.source}</p>
      <Badges p={p} />
      {!skill.practice && (
        <p className="note">This one is about how you carry yourself and how you sound. The practice door can't score it yet. Watch how the donor's body changes, and ask your trainer for a note.</p>
      )}
      <div className="stack">
        {!p?.understood && <button className="btn" onClick={() => mark(skill.id, "understood")}>I understand this</button>}
        <button className="btn primary" onClick={() => go("brief")}>Apply it at a door</button>
        <button className="btn ghost" onClick={() => go("skills")}>Back</button>
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
      <h1>{c.charity}</h1>
      {c.placeholder && <p className="draft pill">Placeholder charity. Not real.</p>}
      <h3>Two problem points</h3>
      <ul className="bullets">{c.problems.map((p) => <li key={p}>{p}</li>)}</ul>
      <h3>The impact</h3>
      <p>{c.impact}</p>
      <h3>Long-term progress</h3>
      <p>{c.progress}</p>
      <h3>The ask</h3>
      <p>{c.ask}</p>
      <div className="target">
        <h4>Daily target</h4>
        <p>Run all five stages, in order. Ask a question every two to three sentences. Close at least three times.</p>
      </div>
      <div className="stack">
        <button className="btn primary" onClick={() => go("door")}>Walk up to the door</button>
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

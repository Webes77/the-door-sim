import { useEffect, useState } from "react";
import { pack, skills } from "./content/pack";
import { reduce, replay, start } from "./engine/engine";
import { debrief } from "./engine/score";
import type { Action, State } from "./engine/types";
import { Debrief } from "./ui/Debrief";
import { Door } from "./ui/Door";
import { Brief, Dashboard, Onboarding, ResetBeat, SkillPage, Skills } from "./ui/Screens";
import { loadProgress, saveProgress, type Progress } from "./ui/store";

const PERSONA = pack.personas[0].id;

function seedFromUrl(): number | null {
  const n = Number(new URLSearchParams(location.search).get("seed"));
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function App() {
  const [view, setView] = useState("home");
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [seed, setSeed] = useState(() => seedFromUrl() ?? Math.floor(Math.random() * 1e9) + 1);
  const [actions, setActions] = useState<Action[]>([]);
  const [state, setState] = useState<State>(() => start(pack, PERSONA, seed));

  useEffect(() => { saveProgress(progress); }, [progress]);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  const begin = (s: number, prior: Action[] = []) => {
    setSeed(s); setActions(prior); setState(replay(pack, PERSONA, s, prior)); setView("door");
  };
  const dispatch = (a: Action) => {
    setActions((x) => [...x, a]);
    setState((s) => reduce(s, a, pack));
  };
  const go = (v: string) => {
    if (v === "door") begin(seedFromUrl() ?? Math.floor(Math.random() * 1e9) + 1);
    else setView(v);
  };
  const mark = (id: string, k: "taught" | "understood") =>
    setProgress((p) => (p.skills[id]?.[k] ? p : { ...p, skills: { ...p.skills, [id]: { ...p.skills[id], [k]: true } } }));

  const finish = () => {
    const d = debrief(state, pack);
    setProgress((p) => {
      const next = { ...p, doors: p.doors + 1, signUps: p.signUps + (state.outcome === "signed_up" ? 1 : 0), skills: { ...p.skills } };
      for (const s of skills) {
        if (s.appliedBy && d.stages.find((x) => x.id === s.appliedBy)?.band === "strong") next.skills[s.id] = { ...next.skills[s.id], applied: true };
      }
      return next;
    });
    setView("debrief");
  };

  if (view === "door") return <Door state={state} dispatch={dispatch} onDebrief={finish} onQuit={() => setView("home")} />;
  if (view === "debrief")
    return (
      <Debrief
        state={state}
        onAgain={() => begin(seed)}
        onJump={(turn) => begin(seed, actions.slice(0, turn))}
        onNext={() => setView("reset")}
        onHome={() => setView("home")}
      />
    );
  if (view === "reset") return <ResetBeat done={() => setView("brief")} />;
  if (view === "onboarding") return <Onboarding go={go} />;
  if (view === "skills") return <Skills progress={progress} go={go} />;
  if (view === "brief") return <Brief go={go} />;
  if (view.startsWith("skill:")) {
    const skill = skills.find((s) => s.id === view.slice(6));
    if (skill) return <SkillPage skill={skill} progress={progress} mark={mark} go={go} />;
  }
  return <Dashboard progress={progress} go={go} />;
}

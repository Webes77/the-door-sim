import { useEffect, useRef } from "react";
import type { Reaction } from "../engine/types";

// The scene is a set of short clips. "walk" goes from the street to the closed door and "opening"
// from the closed door to the donor's open pose. Each reaction clip starts on the open pose and
// ends on the reaction pose. The "_out" clip is the same clip reversed, so she always passes back
// through open.
const CLIPS = ["folded", "glance", "hesitate", "lean", "laugh", "sceptical", "happy", "closed"] as const;
export type Approach = "street" | "walking" | "arrived" | null;
type Where = "street" | "door" | Reaction;

export function Donor({ reaction, approach, onArrive, base }: { reaction: Reaction; approach: Approach; onArrive?: () => void; base: string }) {
  const box = useRef<HTMLDivElement>(null);
  const cur = useRef<Where | null>(null);
  const seq = useRef(0);
  const arrive = useRef(onArrive);
  arrive.current = onArrive;
  const want: Where = approach === "street" ? "street" : approach ? "door" : reaction;

  useEffect(() => {
    const root = box.current;
    if (!root) return;
    const all = Array.from(root.querySelectorAll<HTMLVideoElement>("video"));
    const get = (name: string) => root.querySelector<HTMLVideoElement>(`[data-clip="${name}"]`)!;
    const show = (v: HTMLVideoElement) => all.forEach((x) => x.classList.toggle("on", x === v));
    const hold = (v: HTMLVideoElement) => { v.pause(); try { v.currentTime = 0; } catch { /* not ready */ } show(v); };

    const run = (v: HTMLVideoElement, loop: boolean, rate: number, my: number, done?: () => void) => {
      v.loop = loop;
      v.playbackRate = rate;
      try { v.currentTime = 0; } catch { /* not ready yet */ }
      let shown = false, finished = false;
      const reveal = () => {
        if (shown || my !== seq.current) return;
        shown = true;
        show(v);
        all.forEach((x) => { if (x !== v) x.pause(); });
      };
      const finish = () => { if (finished || my !== seq.current) return; finished = true; done?.(); };
      v.onplaying = reveal;
      v.onended = finish;
      const p = v.play();
      if (p) p.catch(() => { reveal(); if (!loop) window.setTimeout(finish, 500); });
      window.setTimeout(reveal, 400);
      // If a clip never reports its end, carry on anyway.
      if (!loop) window.setTimeout(finish, ((v.duration || 5) / rate) * 1000 + 1500);
    };

    const from = cur.current;
    if (from === want) return;
    cur.current = want;
    const my = ++seq.current;

    const settle = () => {
      if (my !== seq.current) return;
      if (want === "open") run(get("idle"), true, 1, my);
      else if (want !== "street" && want !== "door") run(get(`${want}_in`), false, 1.15, my);
    };

    if (want === "street") { hold(get("walk")); return; }
    if (want === "door") {
      if (from === "street") run(get("walk"), false, 1, my, () => arrive.current?.());
      else hold(get("opening"));
      return;
    }
    if (from === null) { settle(); return; }
    if (from === "door" || from === "street") { run(get("opening"), false, 1, my, settle); return; }
    if (from === "open") { settle(); return; }
    run(get(`${from}_out`), false, from === "closed" ? 1.1 : 2, my, settle);
  }, [want]);

  return (
    <div className="donor" ref={box} aria-hidden="true">
      <video data-clip="idle" className={approach ? "" : "on"} muted playsInline preload="auto" poster={`${base}/poster.jpg`} src={`${base}/idle.mp4`} />
      <video data-clip="walk" className={approach ? "on" : ""} muted playsInline preload="auto" poster={`${base}/street.jpg`} src={`${base}/walk.mp4`} />
      <video data-clip="opening" muted playsInline preload="auto" src={`${base}/opening.mp4`} />
      {CLIPS.flatMap((c) => [
        <video key={`${c}_in`} data-clip={`${c}_in`} muted playsInline preload="auto" src={`${base}/${c}_in.mp4`} />,
        <video key={`${c}_out`} data-clip={`${c}_out`} muted playsInline preload="auto" src={`${base}/${c}_out.mp4`} />,
      ])}
    </div>
  );
}

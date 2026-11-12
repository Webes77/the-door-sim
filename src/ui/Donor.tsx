import { useEffect, useRef } from "react";
import type { Reaction } from "../engine/types";

// The donor is a set of short clips. Each reaction clip starts on the open pose and ends on the
// reaction pose. The "_out" clip is the same clip reversed, so she always passes back through open.
const CLIPS = ["folded", "glance", "hesitate", "lean", "laugh", "sceptical", "happy", "closed"] as const;

export function Donor({ reaction, base }: { reaction: Reaction; base: string }) {
  const box = useRef<HTMLDivElement>(null);
  const cur = useRef<Reaction | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const root = box.current;
    if (!root) return;
    const all = Array.from(root.querySelectorAll<HTMLVideoElement>("video"));
    const get = (name: string) => root.querySelector<HTMLVideoElement>(`[data-clip="${name}"]`)!;
    const show = (v: HTMLVideoElement) => all.forEach((x) => x.classList.toggle("on", x === v));

    const run = (v: HTMLVideoElement, loop: boolean, rate: number, my: number, done?: () => void) => {
      v.loop = loop;
      v.playbackRate = rate;
      try { v.currentTime = 0; } catch { /* not ready yet */ }
      let shown = false;
      const reveal = () => {
        if (shown || my !== seq.current) return;
        shown = true;
        show(v);
        all.forEach((x) => { if (x !== v) x.pause(); });
      };
      v.onplaying = reveal;
      v.onended = () => { if (my === seq.current && done) done(); };
      const p = v.play();
      if (p) p.catch(() => { reveal(); if (!loop && my === seq.current && done) window.setTimeout(done, 500); });
      window.setTimeout(reveal, 400);
    };

    const from = cur.current;
    if (from === reaction) return;
    cur.current = reaction;
    const my = ++seq.current;

    if (from === null) {
      // First paint. A closed door waits on the first frame of the opening clip.
      if (reaction === "closed") { const v = get("closed_out"); v.pause(); try { v.currentTime = 0; } catch { /* */ } show(v); }
      else if (reaction === "open") run(get("idle"), true, 1, my);
      else { const v = get(`${reaction}_in`); run(v, false, 1.15, my); }
      return;
    }
    const arrive = () => {
      if (my !== seq.current) return;
      if (reaction === "open") run(get("idle"), true, 1, my);
      else run(get(`${reaction}_in`), false, 1.15, my);
    };
    if (from === "open") arrive();
    else run(get(`${from}_out`), false, from === "closed" ? 1.1 : 2, my, arrive);
  }, [reaction]);

  return (
    <div className="donor" ref={box} aria-hidden="true">
      <video data-clip="idle" className="on" muted playsInline preload="auto" poster={`${base}/poster.jpg`} src={`${base}/idle.mp4`} />
      {CLIPS.flatMap((c) => [
        <video key={`${c}_in`} data-clip={`${c}_in`} muted playsInline preload="auto" src={`${base}/${c}_in.mp4`} />,
        <video key={`${c}_out`} data-clip={`${c}_out`} muted playsInline preload="auto" src={`${base}/${c}_out.mp4`} />,
      ])}
    </div>
  );
}

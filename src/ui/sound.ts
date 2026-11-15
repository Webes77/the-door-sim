import { asset } from "../content/pack";

// Sound is always extra. Captions carry the conversation if any of this fails.
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    const C = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!C) return null;
    ctx ??= new C();
    if (ctx!.state === "suspended") void ctx!.resume();
    return ctx;
  } catch { return null; }
}

/** Three knocks on a timber door, made in the browser. Call it from a tap. */
export function knock(): void {
  const a = audio();
  if (!a) return;
  [0, 0.19, 0.38].forEach((at, i) => {
    const t = a.currentTime + 0.05 + at;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(190 - i * 8, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + 0.16);
  });
}

// Recorded donor lines, looked up by their exact text. An empty manifest means captions only.
let manifest: Record<string, string> | null = null;
let loading: Promise<void> | null = null;
let playing: HTMLAudioElement | null = null;

function load(): Promise<void> {
  loading ??= fetch(asset("voice/gig/donor1/manifest.json"))
    .then((r) => (r.ok ? r.json() : {}))
    .then((m) => { manifest = m; })
    .catch(() => { manifest = {}; });
  return loading;
}

export function hasVoice(): Promise<boolean> {
  return load().then(() => Object.keys(manifest ?? {}).length > 0);
}

export async function speak(text: string): Promise<void> {
  await load();
  const file = manifest?.[text];
  if (!file) return;
  try {
    playing?.pause();
    playing = new Audio(asset(`voice/gig/donor1/${file}`));
    await playing.play();
  } catch { /* blocked or missing: captions carry on */ }
}

export function hush(): void {
  playing?.pause();
}

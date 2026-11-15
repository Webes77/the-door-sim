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

/**
 * Phones only allow sound that starts from a tap. Call this from every tap that leads to the
 * donor speaking (walk up, knock, start, send, microphone), so her reply can play a beat later.
 */
export function unlock(): void {
  audio();
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
const DIR = "voice/gig/donor1";
const GAP = 0.25; // seconds between two lines in the same turn
let manifest: Record<string, string> | null = null;
let loading: Promise<void> | null = null;
const bytes = new Map<string, Promise<ArrayBuffer | null>>();
let sources: AudioBufferSourceNode[] = [];
let run = 0; // a newer call to speak() or hush() cancels an older one

function load(): Promise<void> {
  loading ??= fetch(asset(`${DIR}/manifest.json`))
    .then((r) => (r.ok ? r.json() : {}))
    .then((m) => { manifest = m; })
    .catch(() => { manifest = {}; });
  return loading;
}

function fetchBytes(file: string): Promise<ArrayBuffer | null> {
  let p = bytes.get(file);
  if (!p) {
    p = fetch(asset(`${DIR}/${file}`)).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
    bytes.set(file, p);
  }
  return p;
}

export function hasVoice(): Promise<boolean> {
  return load().then(() => Object.keys(manifest ?? {}).length > 0);
}

/** Fetch the recordings ahead of time so a reply starts without a network wait. */
export async function warm(texts?: string[]): Promise<void> {
  await load();
  const files = texts ? texts.map((t) => manifest?.[t]).filter((f): f is string => !!f) : Object.values(manifest ?? {});
  for (const f of files) void fetchBytes(f);
}

/**
 * Say the donor's lines for one turn, one after another.
 * Resolves with the milliseconds it took to start the first sound, or null if nothing played.
 */
export async function speak(texts: string[]): Promise<number | null> {
  const asked = performance.now();
  const mine = ++run;
  stop();
  await load();
  const a = audio();
  if (!a) return null;
  const files = texts.map((t) => manifest?.[t]).filter((f): f is string => !!f);
  if (!files.length) return null;
  try {
    const buffers: AudioBuffer[] = [];
    for (const f of files) {
      const raw = await fetchBytes(f);
      if (!raw) continue;
      // decodeAudioData empties the buffer it is given, so hand it a copy.
      buffers.push(await a.decodeAudioData(raw.slice(0)));
    }
    if (mine !== run || !buffers.length) return null;
    let at = a.currentTime + 0.02;
    for (const b of buffers) {
      const s = a.createBufferSource();
      s.buffer = b;
      s.connect(a.destination);
      s.start(at);
      sources.push(s);
      at += b.duration + GAP;
    }
    return Math.round(performance.now() - asked);
  } catch { return null; /* blocked or broken: captions carry on */ }
}

function stop(): void {
  for (const s of sources) { try { s.stop(); } catch { /* already ended */ } }
  sources = [];
}

export function hush(): void {
  run++;
  stop();
}

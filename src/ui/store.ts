// Per-device progress. Kept in the browser only. The app works without it.
export interface Progress {
  skills: Record<string, { taught?: boolean; understood?: boolean; applied?: boolean }>;
  doors: number;
  signUps: number;
}

const KEY = "gig-academy-progress-v1";

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { skills: {}, doors: 0, signUps: 0, ...JSON.parse(raw) };
  } catch { /* storage can be blocked */ }
  return { skills: {}, doors: 0, signUps: 0 };
}

export function saveProgress(p: Progress): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

import type { ActionDef } from "./types";

// The no-AI matcher. Keyword lists live in the pack. A trailing * matches a word prefix.

export function normalise(text: string): string {
  return text.toLowerCase().replace(/[’'`]/g, "").replace(/[^a-z0-9?]+/g, " ").replace(/\s+/g, " ").trim();
}

export function countWords(text: string): number {
  const t = normalise(text).replace(/\?/g, " ").trim();
  return t ? t.split(/\s+/).length : 0;
}

function toRegex(keyword: string): RegExp {
  const star = keyword.endsWith("*");
  const body = normalise(star ? keyword.slice(0, -1) : keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${body}${star ? "[a-z0-9]*" : ""}($|[^a-z0-9])`);
}

const cache = new Map<string, RegExp>();

export function matchActions(text: string, actions: ActionDef[]): string[] {
  const t = normalise(text);
  const ids: string[] = [];
  for (const a of actions) {
    for (const k of a.keywords) {
      let re = cache.get(k);
      if (!re) { re = toRegex(k); cache.set(k, re); }
      if (re.test(t)) { ids.push(a.id); break; }
    }
  }
  return ids;
}

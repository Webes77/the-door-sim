import type { CallDef, Disposition, Rule, ShiftClient, ShiftPack } from "../engine/shift/types";
import client from "./clients/the-intro-broadbent/client.json";
import rules from "./clients/the-intro-broadbent/rules.json";
import dispositions from "./clients/the-intro-broadbent/dispositions.json";
import shift from "./clients/the-intro-broadbent/shift.json";

// The practice shift pack. Names come from client.json, so a version with the names swapped is a settings change.

const names: Record<string, string> = { employer: client.employer, client: client.client, clientShort: client.clientShort, caller: client.caller };

function fill<T>(value: T): T {
  if (typeof value === "string") return value.replace(/\{\{(\w+)\}\}/g, (m, k: string) => names[k] ?? m) as T;
  if (Array.isArray(value)) return value.map(fill) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v)])) as T;
  return value;
}

export const shiftPack: ShiftPack = fill({
  client: client as ShiftClient,
  meta: shift.meta,
  rules: rules as Rule[],
  dispositions: dispositions as Disposition[],
  calls: shift.calls as unknown as CallDef[],
});

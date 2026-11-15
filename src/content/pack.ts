import type { Pack, Persona, Scenario, StrongLine } from "../engine/types";
import client from "./clients/gig/client.json";
import campaign from "./clients/gig/campaign.json";
import scenario from "./clients/gig/scenario.json";
import persona from "./clients/gig/persona.home-afternoon.json";
import strongLines from "./clients/gig/strong-lines.json";
import lessonsJson from "./clients/gig/lessons.json";
import onboardingJson from "./clients/gig/onboarding.json";

// One client pack is loaded. Adding a client is a new folder and a line here, never an engine change.
/** Site assets resolve against the build's base path. */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

export const pack: Pack = {
  client: { ...client, logo: asset(client.logo) },
  campaign,
  scenario: scenario as unknown as Scenario,
  personas: [persona as unknown as Persona],
  strongLines: strongLines as StrongLine[],
};

export type Block =
  | { type: "list"; title: string; intro?: string; items: string[]; outro?: string }
  | { type: "table"; title: string; cols: string[]; rows: string[][] }
  | { type: "text"; title: string; paras: string[] };

/** One system from the client's training manual, in the manual's own words. */
export interface Lesson {
  id: string; group: string; title: string; stageNo?: number; source: string;
  practice: boolean; drill: string; appliedBy: string;
  what: string[]; why: { callout: string; text: string };
  blocks: Block[];
  sounds: string; weak: string[]; strong: string[];
  avoid: string[]; focus: string[]; remember: string; target: string; tryToday: string[];
  review: string;
}
export const lessons = lessonsJson as unknown as Lesson[];
export const onboarding = onboardingJson;

/** On-screen text never shows an em dash, whatever the source text holds. */
export function clean(text: string): string {
  return text.replace(/\s*—\s*/g, ", ").replace(/–/g, "-");
}

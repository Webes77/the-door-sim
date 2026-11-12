import type { Pack, Persona, Scenario, StrongLine } from "../engine/types";
import client from "./clients/gig/client.json";
import campaign from "./clients/gig/campaign.json";
import scenario from "./clients/gig/scenario.json";
import persona from "./clients/gig/persona.home-afternoon.json";
import strongLines from "./clients/gig/strong-lines.json";
import skillsJson from "./clients/gig/skills.json";
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

export interface Skill { id: string; part: string; title: string; what: string; remember: string; source: string; practice: boolean; appliedBy: string; review: string }
export const skills = skillsJson as Skill[];
export const onboarding = onboardingJson;

/** On-screen text never shows an em dash, whatever the source text holds. */
export function clean(text: string): string {
  return text.replace(/\s*—\s*/g, ", ").replace(/–/g, "-");
}

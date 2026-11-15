// Headless playthroughs at phone and tablet sizes. Run with: npm run build && npm run e2e
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const BASE = process.env.SITE_URL ?? "http://localhost:4173";
const SIZES = [[390, 844], [820, 1180], [1024, 768], [1180, 820]];
const SEED = 7; // the variant with two objections
mkdirSync("tests/shots", { recursive: true });

let server;
if (!process.env.SITE_URL) {
  server = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { stdio: "ignore" });
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
}

const fail = (m) => { console.error("FAIL", m); process.exitCode = 1; };
const browser = await chromium.launch();

async function open(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`${BASE}/?seed=${SEED}`);
  return { page, errors };
}

async function toDoor(page) {
  await page.getByRole("button", { name: "Walk up", exact: true }).click();
  await page.getByRole("button", { name: "Knock", exact: true }).click({ timeout: 15000 });
  await page.waitForFunction(() => { const c = document.querySelector(".caption"); return c && c.textContent !== "…" && c.textContent !== ""; }, null, { timeout: 15000 });
}

async function sayTip(page, starts) {
  const tip = page.locator(".tips button", { hasText: starts }).first();
  await tip.waitFor({ timeout: 8000 });
  const turnsBefore = await page.locator(".you").first().textContent().catch(() => "");
  await tip.click();
  await page.waitForFunction((b) => document.querySelector(".caption")?.textContent !== "…" && document.querySelector(".you")?.textContent !== b, turnsBefore, { timeout: 8000 });
  await page.waitForTimeout(350);
}

async function type(page, text) {
  if (!(await page.locator("#say").count())) return; // the door has already closed
  await page.fill("#say", text);
  await page.click(".send");
  await page.waitForTimeout(1300);
}

// ---- Good path, at every size ----
for (const [w, h] of process.env.QUICK ? [] : SIZES) {
  const { page, errors } = await open(w, h);
  await page.getByRole("button", { name: /The full pitch at a door/ }).click();
  await page.getByRole("button", { name: "Head to the door" }).click();
  if (w === 390) await page.screenshot({ path: "tests/shots/street-390.png" });
  await toDoor(page);
  if (w === 390) await page.screenshot({ path: "tests/shots/door-open-390.png" });
  for (const line of ["Hey, how is your day", "Honestly, the part", "And the shelters", "No worries, take", "The rescued animals", "A lot of your neighbours", "So that's the reason", "I hear you", "Exactly, and that", "I hear you", "You'd be directly", "Brilliant, you are", "And what works best", "Out of curiosity", "Thanks so much"]) {
    const has = await page.locator(".tips button", { hasText: line }).count();
    if (!has && line.startsWith("No worries")) continue; // the interruption turn depends on the seed
    await sayTip(page, line);
    if (w === 390 && line.startsWith("So that's")) { await page.waitForTimeout(2500); await page.screenshot({ path: "tests/shots/door-objection-390.png" }); }
  }
  await page.getByRole("button", { name: "See what happened" }).click();
  await page.fill("#read", "It turned when I deflected the money objection.");
  await page.getByRole("button", { name: "Show me" }).click();
  const title = await page.locator("h1").textContent();
  if (title !== "Signed up.") fail(`${w}x${h} good path ended with: ${title}`);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail(`${w}x${h} debrief scrolls sideways`);
  await page.waitForTimeout(2900);
  await page.screenshot({ path: `tests/shots/debrief-good-${w}.png`, fullPage: true });
  if (errors.length) fail(`${w}x${h} errors: ${errors.join(" | ")}`);
  console.log("ok good path", `${w}x${h}`);
  await page.close();
}

// ---- Poor path: fake compliment, rambling, early close ----
{
  const { page, errors } = await open(390, 844);
  await page.getByRole("button", { name: /The full pitch at a door/ }).click();
  await page.getByRole("button", { name: "Head to the door" }).click();
  await toDoor(page);
  await type(page, "Hi, I love that car. I'm Alex from the animal rescue and we do a lot of work in the community and it is really important and we have been going a long time and there are many programs and they are all really successful and we need funding for outreach and community support and education and emergency response and so much more that I could tell you about all day long because there is such a lot going on and it never stops and that is why we are out today talking to everyone on this street");
  await type(page, "So can you help out today?");
  await type(page, "But it's only a small amount, less than a coffee, and the programs are really good and they need the money and everyone can afford it");
  await type(page, "Come on, surely you can sign up");
  const done = await page.getByRole("button", { name: "See what happened" }).count();
  if (!done) fail("poor path did not end");
  await page.screenshot({ path: "tests/shots/door-closed-390.png" });
  await page.getByRole("button", { name: "See what happened" }).click();
  await page.getByRole("button", { name: "Show me" }).click();
  const title = await page.locator("h1").textContent();
  if (title !== "She closed the door.") fail(`poor path ended with: ${title}`);
  if (!(await page.locator(".critical").count())) fail("poor path shows no critical error");
  await page.waitForTimeout(2900);
  await page.screenshot({ path: "tests/shots/debrief-poor-390.png", fullPage: true });
  if (errors.length) fail(`poor path errors: ${errors.join(" | ")}`);
  console.log("ok poor path 390x844");
  await page.close();
}

// ---- Stage practice: Introduction with the walk-up, then Close from midway ----
{
  const { page, errors } = await open(390, 844);
  await page.getByRole("button", { name: /Start: Introduction/ }).click();
  if (!(await page.getByText("Create a two-way conversation within the first ten seconds of every approach.").count())) fail("Introduction lesson is missing its daily target");
  await page.screenshot({ path: "tests/shots/lesson-390.png", fullPage: true });
  await page.getByRole("button", { name: "Practise the Introduction" }).click();
  await page.getByRole("button", { name: "Walk up", exact: true }).click();
  await page.getByRole("button", { name: "Knock", exact: true }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: "tests/shots/at-door-390.png" });
  await page.getByRole("button", { name: "Knock", exact: true }).click();
  await page.waitForFunction(() => { const c = document.querySelector(".caption"); return c && c.textContent !== "…" && c.textContent !== ""; }, null, { timeout: 15000 });
  await page.getByRole("button", { name: "Keys", exact: true }).click();
  await page.screenshot({ path: "tests/shots/keys-390.png" });
  await page.getByRole("button", { name: "Back to the door" }).click();
  await sayTip(page, "Hey, how is your day");
  await page.getByRole("button", { name: "See how you went" }).click();
  if ((await page.locator("h1").textContent()) !== "Strong.") fail("Introduction practice did not score strong");
  await page.screenshot({ path: "tests/shots/drill-intro-390.png", fullPage: true });
  await page.getByRole("button", { name: /Next stage: Problem/ }).click();
  await page.getByRole("button", { name: /Next stage: Solution/ }).click();
  await page.getByRole("button", { name: /Next stage: Close/ }).click();
  await page.getByRole("button", { name: "Practise the Close and the deflect" }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  for (const line of ["So that's the reason", "I hear you", "Exactly, and that", "I hear you", "You'd be directly"]) await sayTip(page, line);
  await page.getByRole("button", { name: "See how you went" }).click();
  if ((await page.locator("h1").textContent()) !== "Strong.") fail("Close practice did not score strong");
  if (errors.length) fail(`stage practice errors: ${errors.join(" | ")}`);
  console.log("ok stage practice: Introduction and Close");
  await page.close();
}

// ---- Dashboard, systems, script and onboarding ----
{
  const { page, errors } = await open(390, 844);
  await page.screenshot({ path: "tests/shots/home-390.png", fullPage: true });
  await page.getByRole("button", { name: /Every system in the manual/ }).click();
  await page.screenshot({ path: "tests/shots/skills-390.png", fullPage: true });
  await page.getByRole("button", { name: /KISS vs KILL/ }).click();
  if (!(await page.getByText("Ask a question every two to three sentences in every conversation.").count())) fail("KISS lesson is missing its daily target");
  if (await page.getByText("—").count()) fail("an em dash is showing on a lesson page");
  await page.getByRole("button", { name: "Home" }).click();
  await page.getByRole("button", { name: /The pitch script/ }).click();
  if (!(await page.getByText("When she objects").count())) fail("script page is missing the objection lines");
  await page.screenshot({ path: "tests/shots/script-390.png", fullPage: true });
  await page.getByRole("button", { name: "Home" }).click();
  await page.getByRole("button", { name: /Rules of conduct/ }).click();
  if (!(await page.getByText("Rules of conduct at the door").count())) fail("onboarding placeholder missing");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("a page scrolls sideways at phone width");
  if (errors.length) fail(`dashboard errors: ${errors.join(" | ")}`);
  console.log("ok dashboard, systems, script, onboarding");
  await page.close();
}

await browser.close();
server?.kill();
console.log(process.exitCode ? "E2E FAILED" : "E2E PASSED");

// Headless playthroughs of the practice shift at phone and tablet sizes.
// Run with: npm run build && npm run e2e:shift   (the default build is the practice shift)
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const BASE = process.env.SITE_URL ?? "http://localhost:4174";
const SIZES = [[390, 844], [820, 1180]];
mkdirSync("tests/shots", { recursive: true });

// The pack says which line breaks no rule and which code is right. The test reads it rather than repeating it.
const D = "src/content/clients/the-intro-broadbent";
const client = JSON.parse(readFileSync(`${D}/client.json`, "utf8"));
const shift = JSON.parse(readFileSync(`${D}/shift.json`, "utf8"));
const codes = JSON.parse(readFileSync(`${D}/dispositions.json`, "utf8"));
const names = { employer: client.employer, client: client.client, clientShort: client.clientShort, caller: client.caller };
const fill = (t) => t.replace(/\{\{(\w+)\}\}/g, (m, k) => names[k] ?? m);
const shown = (name) => name.replace(/\s*—\s*/g, ", ");
const options = shift.calls.flatMap((c) => Object.values(c.nodes).flatMap((n) => n.options ?? []));
const right = new Set(options.filter((o) => !o.breaks.length).map((o) => fill(o.text)));
const codeName = (id) => shown(codes.find((d) => d.id === id).name);

let server;
if (!process.env.SITE_URL) {
  server = spawn("npx", ["vite", "preview", "--port", "4174", "--strictPort"], { stdio: "ignore" });
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
  await page.goto(`${BASE}/?seed=7`);
  return { page, errors };
}

/** Play one whole shift. `good` picks the line that breaks no rule. `wrap` gives the code for each call. */
async function playShift(page, good, wrap, shot) {
  await page.getByRole("button", { name: "Start the shift" }).click();
  for (let call = 0; call < shift.calls.length; call++) {
    await page.getByRole("button", { name: "Available", exact: true }).click();
    for (let turn = 0; turn < 12; turn++) {
      await page.locator(".tips button, .codes button").first().waitFor({ timeout: 20000 });
      if (await page.locator(".codes button").count()) break;
      const texts = await page.locator(".tips button").allTextContents();
      if (texts.length !== 3) fail(`call ${call + 1} offered ${texts.length} lines`);
      const pick = texts.findIndex((t) => right.has(t) === good);
      if (shot && call === 0 && turn === 1) await page.screenshot({ path: `tests/shots/shift-call-${shot}.png` });
      await page.locator(".tips button").nth(pick < 0 ? 0 : pick).click();
    }
    if (shot && call === 0) await page.screenshot({ path: `tests/shots/shift-wrap-${shot}.png` });
    if ((await page.locator(".codes button").count()) !== codes.length) fail("the wrap list is not the full list");
    await page.locator(".codes button", { hasText: new RegExp(`^${codeName(wrap(call))}$`) }).click();
    await page.getByRole("button", { name: /^Wrap and/ }).click();
  }
  await page.fill("#read", "The second call. He was angry from the start.");
  await page.getByRole("button", { name: "Show me" }).click();
}

for (const [w, h] of SIZES) {
  const { page, errors } = await open(w, h);
  if (w === 390) await page.screenshot({ path: "tests/shots/shift-home-390.png", fullPage: true });
  if (!(await page.getByText(client.draftLabel).count())) fail("the draft label is missing on the home screen");
  await playShift(page, true, (call) => shift.calls[call].disposition.correct[0], w);
  if ((await page.locator("h1").textContent()) !== "Strong.") fail(`${w}x${h} clean shift ended with: ${await page.locator("h1").textContent()}`);
  if (await page.locator(".critical").count()) fail("a clean shift shows a critical error");
  if (!(await page.locator("blockquote cite").count())) fail("the debrief quotes no rule");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail(`${w}x${h} debrief scrolls sideways`);
  await page.screenshot({ path: `tests/shots/shift-debrief-good-${w}.png`, fullPage: true });
  if (errors.length) fail(`${w}x${h} errors: ${errors.join(" | ")}`);
  console.log("ok clean shift", `${w}x${h}`);
  await page.close();
}

// Every line right, but the "don't call me again" call wrapped as Not Interested.
{
  const { page, errors } = await open(390, 844);
  const dnc = shift.calls.findIndex((c) => c.disposition.correct.includes("dnc"));
  await playShift(page, true, (call) => (call === dnc ? "not_interested" : shift.calls[call].disposition.correct[0]), null);
  if ((await page.locator("h1").textContent()) !== "Needs work.") fail("a missed DNC did not force the result down");
  if (!(await page.locator(".critical").count())) fail("a missed DNC is not listed as a critical error");
  await page.screenshot({ path: "tests/shots/shift-debrief-dnc-390.png", fullPage: true });
  if (errors.length) fail(`missed DNC errors: ${errors.join(" | ")}`);
  console.log("ok missed DNC is a critical error and forces the result down");
  await page.close();
}

// Weak lines throughout.
{
  const { page, errors } = await open(390, 844);
  await playShift(page, false, () => "busy", null);
  if ((await page.locator("h1").textContent()) !== "Needs work.") fail("a weak shift did not score needs work");
  await page.screenshot({ path: "tests/shots/shift-debrief-weak-390.png", fullPage: true });
  if (errors.length) fail(`weak shift errors: ${errors.join(" | ")}`);
  console.log("ok weak shift scores needs work");
  await page.close();
}

await browser.close();
server?.kill();
console.log(process.exitCode ? "E2E FAILED" : "E2E PASSED");

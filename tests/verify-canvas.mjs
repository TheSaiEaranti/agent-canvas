// Headless smoke test for the canvas (M1 static + M2 execution).
// Requires the dev server running on http://localhost:3000.
//   npm run dev   (in another terminal)
//   node tests/verify-canvas.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const URL = process.env.URL ?? "http://localhost:3000";

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`✓ ${msg}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });

const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".react-flow__node", { timeout: 10000 });

// ---- M1: demo flow renders ----
const nodes = await page.locator(".react-flow__node").count();
const edges = await page.locator(".react-flow__edge").count();
const prompts = await page.locator(".react-flow__node-prompt").count();
const tools = await page.locator(".react-flow__node-tool").count();
const outputs = await page.locator(".react-flow__node-output").count();

nodes === 4 ? ok(`4 nodes render`) : fail(`expected 4 nodes, got ${nodes}`);
edges === 3 ? ok(`3 edges render`) : fail(`expected 3 edges, got ${edges}`);
prompts === 2 ? ok(`2 prompt nodes`) : fail(`expected 2 prompt nodes, got ${prompts}`);
tools === 1 ? ok(`1 tool node`) : fail(`expected 1 tool node, got ${tools}`);
outputs === 1 ? ok(`1 output node`) : fail(`expected 1 output node, got ${outputs}`);

const paletteVisible = await page.getByText("Node palette").isVisible();
paletteVisible ? ok(`palette visible`) : fail(`palette not visible`);

await page.screenshot({ path: join(__dirname, "canvas.png") });
ok(`pristine screenshot → tests/canvas.png`);

// ---- M2: run the flow end-to-end (scripted) ----
await page.getByTestId("run-button").click();
await page.waitForSelector('main[data-run-status="running"]', { timeout: 5000 });
ok(`run started`);

// Capture a mid-run frame (node glow + flowing edge).
await page.waitForTimeout(1500);
await page.screenshot({ path: join(__dirname, "canvas-running.png") });
ok(`running screenshot → tests/canvas-running.png`);

await page.waitForSelector('main[data-run-status="complete"]', { timeout: 25000 });
ok(`run completed`);

// Output node shows the streamed final result + a copy button.
const outputText = await page.locator(".react-flow__node-output").innerText();
outputText.includes("Reliability comes from constraint")
  ? ok(`output node shows final result`)
  : fail(`output node missing expected result; got: ${outputText.slice(0, 120)}…`);

const copyVisible = await page.getByRole("button", { name: /copy result/i }).isVisible();
copyVisible ? ok(`copy button present`) : fail(`copy button not visible`);

await page.screenshot({ path: join(__dirname, "canvas-complete.png") });
ok(`complete screenshot → tests/canvas-complete.png`);

// ---- Persistence: edit a field, reload, verify it stuck ----
const sentinel = `PERSIST_${Date.now()}`;
const firstPrompt = page.locator(".react-flow__node-prompt textarea").first();
await firstPrompt.fill(sentinel);
await page.waitForTimeout(300);
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector(".react-flow__node-prompt textarea", { timeout: 10000 });
const afterReload = await page
  .locator(".react-flow__node-prompt textarea")
  .first()
  .inputValue();
afterReload === sentinel
  ? ok(`graph persisted across reload`)
  : fail(`persistence failed: expected "${sentinel}", got "${afterReload}"`);

// Run state is in-memory only: should be idle again after reload.
const statusAfterReload = await page
  .locator("main")
  .getAttribute("data-run-status");
statusAfterReload === "idle"
  ? ok(`run state reset on reload (in-memory only)`)
  : fail(`expected idle run state after reload, got "${statusAfterReload}"`);

consoleErrors.length === 0
  ? ok(`no console errors`)
  : fail(`console errors:\n  ${consoleErrors.join("\n  ")}`);

await browser.close();
console.log(process.exitCode ? "\nFAILED" : "\nPASSED");

// Headless smoke test for the M1 canvas.
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

// 1. Demo flow renders: 4 nodes, 3 edges, correct node types.
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

// 2. Palette is present.
const paletteVisible = await page.getByText("Node palette").isVisible();
paletteVisible ? ok(`palette visible`) : fail(`palette not visible`);

// Screenshot the pristine demo before mutating anything.
const shot = join(__dirname, "canvas.png");
await page.screenshot({ path: shot, fullPage: false });
ok(`screenshot saved → ${shot}`);

// 3. localStorage persistence end-to-end: edit a field, reload, verify it stuck.
const sentinel = `PERSIST_${Date.now()}`;
const firstPrompt = page.locator(".react-flow__node-prompt textarea").first();
await firstPrompt.fill(sentinel);
await page.waitForTimeout(300); // let zustand persist flush
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector(".react-flow__node-prompt textarea", { timeout: 10000 });
const afterReload = await page
  .locator(".react-flow__node-prompt textarea")
  .first()
  .inputValue();
afterReload === sentinel
  ? ok(`graph persisted across reload`)
  : fail(`persistence failed: expected "${sentinel}", got "${afterReload}"`);

// 4. No console errors.
consoleErrors.length === 0
  ? ok(`no console errors`)
  : fail(`console errors:\n  ${consoleErrors.join("\n  ")}`);

await browser.close();
console.log(process.exitCode ? "\nFAILED" : "\nPASSED");

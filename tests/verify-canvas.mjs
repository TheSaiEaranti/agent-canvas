// Headless smoke test (M1 static + M2 execution + M3 real proxy / settings / IO).
// Requires the dev server on http://localhost:3000.
//   npm run dev   (in another terminal)
//   node tests/verify-canvas.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.URL ?? "http://localhost:3000";

let failed = false;
const fail = (m) => {
  failed = true;
  console.error(`✗ ${m}`);
};
const ok = (m) => console.log(`✓ ${m}`);

// ---------- M3: proxy url_fetch (real, no key needed) ----------
async function testProxyUrlFetch() {
  const res = await fetch(`${BASE}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "tool",
      tool: "url_fetch",
      input: "https://example.com",
    }),
  });
  if (!res.ok || !res.body) return fail(`proxy url_fetch HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let sawDone = false;
  let errMsg = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    for (const f of frames) {
      const line = f.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const msg = JSON.parse(line.slice(5).trim());
      if (msg.type === "token") text += msg.text;
      else if (msg.type === "error") errMsg = msg.message;
      else if (msg.type === "done") sawDone = true;
    }
  }

  if (!sawDone) return fail("proxy did not send a 'done' event");
  if (text.length > 20) {
    ok(`proxy url_fetch extracted real text (${text.length} chars): "${text.slice(0, 60).replace(/\s+/g, " ")}…"`);
  } else if (errMsg) {
    fail(`proxy url_fetch errored: ${errMsg}`);
  } else {
    fail("proxy url_fetch produced no content");
  }
}

// ---------- Browser tests ----------
async function testBrowser() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });

  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  let lastDialog = "";
  page.on("dialog", (d) => {
    lastDialog = d.message();
    d.accept();
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".react-flow__node", { timeout: 10000 });

  // M1: demo renders
  const nodes = await page.locator(".react-flow__node").count();
  const edges = await page.locator(".react-flow__edge").count();
  nodes === 4 ? ok("4 demo nodes render") : fail(`expected 4 nodes, got ${nodes}`);
  edges === 3 ? ok("3 demo edges render") : fail(`expected 3 edges, got ${edges}`);

  await page.screenshot({ path: join(__dirname, "canvas.png") });

  // M2: scripted run end-to-end
  await page.getByTestId("run-button").click();
  await page.waitForSelector('main[data-run-status="running"]', { timeout: 5000 });
  ok("scripted run started");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(__dirname, "canvas-running.png") });
  await page.waitForSelector('main[data-run-status="complete"]', { timeout: 25000 });
  const outText = await page.locator(".react-flow__node-output").innerText();
  outText.includes("Reliability comes from constraint")
    ? ok("output node shows final result")
    : fail(`output node missing result: ${outText.slice(0, 80)}`);
  await page.screenshot({ path: join(__dirname, "canvas-complete.png") });

  // M3: settings panel + live-mode no-key guard
  await page.getByTestId("settings-button").click();
  (await page.getByText("Anthropic API key").isVisible())
    ? ok("settings panel shows key fields")
    : fail("settings key fields not visible");
  await page.getByRole("button", { name: /live \(your keys\)/i }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByTestId("run-button").click();
  // No keys in live mode -> Run should re-open Settings instead of running.
  (await page.getByText("Run mode").isVisible())
    ? ok("live mode with no keys opens Settings (graceful guard)")
    : fail("live-mode no-key guard did not open Settings");
  await page.getByRole("button", { name: /demo \(scripted\)/i }).click();
  await page.getByRole("button", { name: "Done" }).click();

  // M3: export captures the current graph
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export" }).click(),
  ]);
  const exportPath = join(__dirname, "exported-flow.json");
  await download.saveAs(exportPath);
  const exported = JSON.parse(readFileSync(exportPath, "utf8"));
  exported.nodes?.length === 4 && exported.edges?.length === 3
    ? ok("export produced valid flow JSON (4 nodes / 3 edges)")
    : fail(`export JSON wrong shape: ${exported.nodes?.length}/${exported.edges?.length}`);

  // M3: import a minimal valid flow replaces the graph
  const minimalPath = join(__dirname, "minimal-flow.json");
  writeFileSync(
    minimalPath,
    JSON.stringify({
      nodes: [
        {
          id: "n1",
          type: "prompt",
          position: { x: 0, y: 0 },
          data: { label: "Solo", prompt: "hi", model: "claude-sonnet-4-6", temperature: 0.5, maxTokens: 256 },
        },
      ],
      edges: [],
    }),
  );
  await page.locator('input[type="file"]').setInputFiles(minimalPath);
  await page.waitForTimeout(300);
  const afterImport = await page.locator(".react-flow__node").count();
  afterImport === 1
    ? ok("import replaced graph (1 node)")
    : fail(`import expected 1 node, got ${afterImport}`);

  // M3: importing junk is rejected gracefully (alert, no crash)
  const junkPath = join(__dirname, "junk.json");
  writeFileSync(junkPath, JSON.stringify({ not: "a flow" }));
  await page.locator('input[type="file"]').setInputFiles(junkPath);
  await page.waitForTimeout(200);
  lastDialog.includes("valid Agent Canvas flow")
    ? ok("invalid import rejected gracefully")
    : fail(`expected rejection alert, got: "${lastDialog}"`);

  // Persistence + in-memory run state (reload)
  await page.locator(".react-flow__node-prompt textarea").first().fill("PERSIST_OK");
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".react-flow__node-prompt textarea", { timeout: 10000 });
  const persisted = await page.locator(".react-flow__node-prompt textarea").first().inputValue();
  persisted === "PERSIST_OK"
    ? ok("graph persisted across reload")
    : fail(`persistence failed: "${persisted}"`);
  const status = await page.locator("main").getAttribute("data-run-status");
  status === "idle" ? ok("run state reset on reload (in-memory)") : fail(`run state was "${status}"`);

  consoleErrors.length === 0
    ? ok("no console errors")
    : fail(`console errors:\n  ${consoleErrors.join("\n  ")}`);

  await browser.close();
}

await testProxyUrlFetch();
await testBrowser();
console.log(failed ? "\nFAILED" : "\nPASSED");
process.exit(failed ? 1 : 0);

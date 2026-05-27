// One-off: capture the running (glow) state as the README hero + OG image.
//   node tests/capture-hero.mjs   (dev server must be running)
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.URL ?? "http://localhost:3000";
const publicDir = join(__dirname, "..", "public");
mkdirSync(publicDir, { recursive: true });
const out = join(publicDir, "og.png");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector(".react-flow__node", { timeout: 10000 });
await page.getByTestId("run-button").click();
await page.waitForSelector('main[data-run-status="running"]', { timeout: 5000 });
await page.waitForTimeout(1600); // catch a node mid-glow with a flowing edge
await page.screenshot({ path: out });
await browser.close();
console.log("hero saved ->", out);

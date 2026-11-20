// Dev helper: render many studio views in one browser session.
// Usage: node scripts/contact-sheet.mjs <outDir> <view> [ids...]
import { chromium } from "playwright-core";
import fs from "node:fs";
const [outDir, view = "side", ...ids] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3123";
const all = ids.length ? ids : JSON.parse(fs.readFileSync("data/cars.json", "utf8")).map((c) => c.id);
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? "msedge", args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
for (const id of all) {
  await page.goto(`${base}/studio/${id}?view=${view}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${outDir}/${view}-${id}.png` });
}
await browser.close();
console.log("done", all.length);

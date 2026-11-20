// Dev helper: screenshot any app URL with the locally installed Edge/Chrome.
// Usage: node scripts/shoot.mjs <url> <out.png> [width] [height] [waitMs] [scrollY]
import { chromium } from "playwright-core";

const [url, out, w = "1440", h = "900", wait = "4000", scrollY = "0"] = process.argv.slice(2);
const channel = process.env.BROWSER_CHANNEL ?? "msedge";

const browser = await chromium.launch({
  channel,
  args: ["--use-angle=default", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(+wait);
if (+scrollY) {
  await page.evaluate((y) => window.scrollTo(0, y), +scrollY);
  await page.waitForTimeout(1500);
}
await page.screenshot({ path: out });
await browser.close();
if (logs.length) console.log(logs.slice(0, 15).join("\n"));
console.log("saved", out);

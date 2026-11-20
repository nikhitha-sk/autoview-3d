// Renders every car in the studio on a transparent background -> public/cars/<id>.webp
// Requires the app running (npm run dev) and a local Edge or Chrome.
// Usage: node scripts/render-thumbnails.mjs [baseUrl] [ids...]
import { chromium } from "playwright-core";
import sharp from "sharp";
import fs from "node:fs";

const [base = "http://localhost:3000", ...only] = process.argv.slice(2);
const cars = JSON.parse(fs.readFileSync("data/cars.json", "utf8")).filter((c) => !only.length || only.includes(c.id));
fs.mkdirSync("public/cars", { recursive: true });

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? "msedge",
  args: ["--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1.5 });
for (const car of cars) {
  await page.goto(`${base}/studio/${car.id}?bare=1&view=hero`, { waitUntil: "networkidle" });
  await page.waitForTimeout(4500);
  const png = await page.screenshot({ omitBackground: true });
  const out = `public/cars/${car.id}.webp`;
  await sharp(png).trim({ threshold: 1 }).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 90 }).toFile(out);
  console.log("rendered", out);
}
await browser.close();

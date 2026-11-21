// Social cards (next/og) can't read WebP, and sharp can't run on Cloudflare Workers,
// so convert each showroom render to a small palette PNG once: public/og/<id>.png
// Usage: node scripts/og-images.mjs [ids...]   (run after render-thumbnails)
import sharp from "sharp";
import fs from "node:fs";

const only = process.argv.slice(2);
const cars = JSON.parse(fs.readFileSync("data/cars.json", "utf8")).filter((c) => !only.length || only.includes(c.id));
fs.mkdirSync("public/og", { recursive: true });
for (const car of cars) {
  const out = `public/og/${car.id}.png`;
  await sharp(`public${car.thumbnail}`).resize({ width: 1000, withoutEnlargement: true }).png({ palette: true, quality: 90, effort: 10 }).toFile(out);
}
console.log("wrote", cars.length, "og images");

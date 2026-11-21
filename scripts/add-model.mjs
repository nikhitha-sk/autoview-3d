// Attach a real 3D model (.glb) to a car in the catalogue.
// Usage: node scripts/add-model.mjs <car-id> <path/to/model.glb> ["Title" "Author" "https://source-url" "CC BY 4.0"]
//
// The viewer scales the model to the car's real length, stands it on the floor
// and repaints materials named like "body" / "car_paint". If the car faces the
// wrong way, set "modelRotationY" (radians, e.g. 3.14159) on the car in data/cars.json.
// Afterwards run `npm run dev` and `node scripts/render-thumbnails.mjs http://localhost:3000 <car-id>`.
import fs from "node:fs";
import path from "node:path";

const [id, file, title, author, url, license] = process.argv.slice(2);
if (!id || !file) {
  console.error("Usage: node scripts/add-model.mjs <car-id> <model.glb> [title author url license]");
  process.exit(1);
}
if (!/\.glb$/i.test(file) || !fs.existsSync(file)) {
  console.error(`Not a .glb file: ${file}`);
  process.exit(1);
}

const dataPath = "data/cars.json";
const raw = fs.readFileSync(dataPath, "utf8");
const cars = JSON.parse(raw);
const car = cars.find((c) => c.id === id);
if (!car) {
  console.error(`Unknown car id "${id}". Known ids:\n  ${cars.map((c) => c.id).join("\n  ")}`);
  process.exit(1);
}

fs.mkdirSync("public/models", { recursive: true });
const dest = path.join("public/models", `${id}.glb`);
fs.copyFileSync(file, dest);

car.model3d = `/models/${id}.glb`;
if (title) car.modelCredit = { title, author: author ?? "", url: url ?? "", license: license ?? "" };
if (!car.tags.includes("Real model")) car.tags.push("Real model");

const eol = raw.includes("\r\n") ? "\r\n" : "\n";
fs.writeFileSync(dataPath, JSON.stringify(cars, null, 2).replace(/\n/g, eol) + eol);
console.log(`${id}: ${dest} (${(fs.statSync(dest).size / 1e6).toFixed(1)} MB) -> data/cars.json model3d set`);

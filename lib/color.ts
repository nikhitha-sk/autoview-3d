/**
 * Estimate the car's paint colour from a photo: sample the central region,
 * ignore near-grey/very dark/very bright pixels (tyres, glass, sky, road),
 * and average the most saturated half. Falls back to the plain average.
 */
export async function dominantPaint(file: Blob): Promise<string> {
  const bmp = await createImageBitmap(file);
  const S = 48;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const sx = bmp.width * 0.15;
  const sy = bmp.height * 0.25;
  g.drawImage(bmp, sx, sy, bmp.width * 0.7, bmp.height * 0.55, 0, 0, S, S);
  bmp.close();
  const { data } = g.getImageData(0, 0, S, S);

  const px: { r: number; g: number; b: number; s: number }[] = [];
  let ar = 0, ag = 0, ab = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], gg = data[i + 1], b = data[i + 2];
    ar += r; ag += gg; ab += b;
    const max = Math.max(r, gg, b), min = Math.min(r, gg, b);
    const l = (max + min) / 2;
    const sat = max === 0 ? 0 : (max - min) / max;
    if (l > 28 && l < 235) px.push({ r, g: gg, b, s: sat });
  }
  const n = data.length / 4;
  const hex = (r: number, g2: number, b: number) =>
    "#" + [r, g2, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

  px.sort((a, b) => b.s - a.s);
  const top = px.slice(0, Math.max(1, Math.floor(px.length / 2)));
  if (!top.length || top[0].s < 0.18) return hex(ar / n, ag / n, ab / n); // white/silver/black cars
  const sum = top.reduce((acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }), { r: 0, g: 0, b: 0 });
  return hex(sum.r / top.length, sum.g / top.length, sum.b / top.length);
}

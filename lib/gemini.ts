import "server-only";
import { getAllCars } from "./cars";
import type { BodyType } from "./types";

export interface Recognition {
  isCar: boolean;
  make: string | null;
  model: string | null;
  year: string | null;
  bodyType: BodyType | null;
  color: string | null;
  confidence: number;
  /** id of the matching car in our catalogue, if any */
  match: string | null;
}

const PROMPT = `You are an automotive expert. Identify the car in this photo.
Reply with JSON only, using this exact shape:
{"isCar": boolean, "make": string|null, "model": string|null, "year": string|null,
 "bodyType": "Coupe"|"Supercar"|"SUV"|"Sedan"|"Hatchback"|"Crossover"|null,
 "color": string|null, "confidence": number between 0 and 1}
If the photo does not clearly show a car, set isCar to false and the other fields to null.`;

/** Ask Gemini which car is in the photo. Returns null when no key is configured. */
export async function recogniseCar(file: Blob, mime: string): Promise<Recognition | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const payload = JSON.stringify({
    contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data } }, { text: PROMPT }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
  });

  // Model names get retired; try the configured one, then auto-updating aliases.
  const models = [...new Set([process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-flash-lite-latest"].filter(Boolean))] as string[];
  let res: Response | null = null;
  for (const model of models) {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: payload,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok || ![404, 429, 500, 503].includes(res.status)) break;
  }
  if (!res || !res.ok) throw new Error(`Gemini request failed (${res?.status ?? "no response"})`);
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const parsed = JSON.parse(text.replace(/^```(json)?|```$/g, "").trim()) as Omit<Recognition, "match">;
  return { ...parsed, confidence: Number(parsed.confidence) || 0, match: matchCatalogue(parsed.make, parsed.model) };
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Fuzzy match "Hyundai" + "Creta SX" to a catalogue id. */
export function matchCatalogue(make: string | null, model: string | null): string | null {
  if (!make && !model) return null;
  const needle = norm(`${make ?? ""} ${model ?? ""}`);
  let best: { id: string; score: number } | null = null;
  for (const c of getAllCars()) {
    const brand = norm(c.brand);
    const name = norm(c.name);
    const brandHit = brand.split(" ").some((t) => needle.includes(t));
    const nameTokens = name.split(" ").filter((t) => t.length > 1);
    const nameHits = nameTokens.filter((t) => needle.includes(t)).length;
    const score = (brandHit ? 1 : 0) + nameHits / Math.max(1, nameTokens.length) * 2;
    if (nameHits > 0 && (!best || score > best.score)) best = { id: c.id, score };
  }
  return best && best.score >= 1.5 ? best.id : null;
}

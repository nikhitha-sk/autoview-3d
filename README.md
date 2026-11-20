# AutoView 3D

Explore famous cars in real-time 3D — inside and out. Rotate, repaint, sit in the driver's seat, or upload a photo of any car to get a 3D model back.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Three.js · React Three Fiber · drei · Gemini · Tripo3D / Meshy · Cloudflare R2

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

No API keys are needed. Without keys, **Photo to 3D** runs in demo mode: it builds a procedural model tinted with your photo's paint colour.

## Optional keys

Copy `.env.example` to `.env.local` and fill in what you have:

| Variable | What it enables |
| --- | --- |
| `TRIPO_API_KEY` or `MESHY_API_KEY` | Real image-to-3D reconstruction |
| `GEMINI_API_KEY` | Recognises the car in the photo and links it to the showroom |
| `R2_*` | Saves generated `.glb` files to Cloudflare R2 |

Keys stay on the server. The browser only calls `/api/*`.

## Features

- **Showroom:** 12 cars with search, brand, body, fuel and price filters (filters are kept in the URL)
- **3D viewer:** orbit and zoom, camera presets, turntable, fullscreen, paint swatches with animated finishes
- **Interior:** a driver's-seat view with a wide-angle camera, or a 360° photo if `interior360` is set
- **Spec sheet:** price, specs, and a blueprint drawing with dimension lines
- **Photo to 3D:** drag, drop or paste a photo, then Gemini recognition, an async 3D job, polling and a `.glb` download
- **Themes:** night showroom (dark) and daylight studio (light)
- **SEO:** generated Open Graph cards, sitemap, robots and JSON-LD

Keyboard shortcuts on a car page: `1`–`5` camera, `I` interior, `R` turntable, `[` `]` paint, `F` fullscreen.

## How the 3D models work

- The **Ferrari 458** is a real Draco-compressed `.glb` (CC BY 4.0, credited in the footer).
- **Every other car** is generated procedurally from its real length, width, height and wheelbase. A body-style profile is lofted into smooth cross-sections. Wheel wells, lights, grille, cabin and cockpit are then added.
- To use a real model, put a `.glb` in `public/models` or on R2 and set `model3d` in `data/cars.json`.

## API

| Route | Purpose |
| --- | --- |
| `GET /api/cars?q=&brand=&type=&fuel=&price=` | Car list |
| `GET /api/cars/:id` | One car |
| `POST /api/generate` (multipart `image`) | Starts a 3D job and returns a job `id` |
| `GET /api/status?id=` | Job progress and the model URL when done |
| `GET /api/model?src=` | Streams a generated `.glb` (allowlisted hosts only) |

## Scripts

```bash
npm run lint
npm run thumbnails   # re-render card images (needs `npm run dev` running and Edge/Chrome installed)
```

## Deploy

Push to GitHub, import the repo on [Vercel](https://vercel.com), add your env variables, and deploy.

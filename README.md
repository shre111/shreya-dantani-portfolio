# Latent Space — Shreya Dantani

An interactive 3D portfolio. The visitor types a prompt, and then scrolls as **their own prompt travels through an inference pipeline** — tokenize, embed, retrieve, agent swarm, evaluate, deploy, generate. A single GPU point cloud reorganises itself at each stage: token chips, an identity portrait, a ring of retrieved documents, an agent graph, a candlestick chart, a globe, and finally her name.

On the evaluate stage it goes further: **every project gets its own particle world**, and switching project detonates the cloud and rebuilds it. A gift box for Giftlips, a conversion funnel for FunnelCockpit, boosted decision trees for the XGBoost dashboard, a voice waveform for Seed-VC.

Nothing about the theme is decorative. Each stage maps to work Shreya has actually shipped — RAG pipelines, multi-agent orchestration, a trading platform with XGBoost models and an RL exit agent.

## Running it

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # → dist/
pnpm preview
```

## Add a photo (recommended)

Drop a portrait at **`public/portrait.png`** and the embed stage renders it as a particle portrait — luminance drives point density, so a high-contrast headshot works best. Square-ish, at least 600px.

Without one it falls back to an "SD" monogram inside a ring. That works, but the photo is the better payoff for the stage the whole journey builds toward.

## How it works

The centrepiece is one `THREE.Points` object with ~130k vertices that never touches the CPU after boot.

- **`src/lib/shapes.ts`** builds all eight shapes once at load into a single stacked `Float32Array`. Text and images are rasterised to a 2D canvas and sampled by pixel; everything else is generated procedurally.
- That buffer becomes a **float `DataTexture` atlas** laid out as `[shape0 rows][shape1 rows]…`. Each vertex carries only its texel coordinate and a random seed.
- **`src/scene/pointCloudShader.ts`** fetches two shape slots per frame and mixes between them with a per-point stagger, so the cloud *flows* rather than snapping.
- Morphing 130k points therefore costs **one uniform update per frame**, not a buffer rewrite. Twelve shapes live in the atlas: eight for the stages, four more for per-project worlds.

Three forces stack through a transition — a shear about the view axis, a radial detonation, and simplex turbulence. All three are scaled by **scroll velocity**, not just scroll position: park halfway between two shapes and the cloud settles into the blend rather than hanging there as fog.

The cursor is a gaussian force well projected into world space. Points shove away from it, spin around the view axis, swell and run hot — and the well trails the pointer, so a fast flick carves a visible wake.

Scroll drives everything through a single normalised value. Per-frame state lives in a plain mutable object (`scroll` in `src/store/useStore.ts`), never React state — only the discrete stage index is pushed into Zustand, so scrolling causes at most one re-render per stage.

The cloud is brightest **during** transitions and dims while you are reading, which is what lets a dense particle field share the frame with body copy.

### Layout

```
src/
  data/profile.ts        every word on the site, typed — keep in sync with the CV
  lib/
    shapes.ts            the twelve shape builders + atlas packer
    quality.ts           GPU tier detection → point count, DPR, bloom
    audio.ts             procedural sound cues — no audio files
    projectShapes.ts     which particle world belongs to which project
    tokenize.ts          cosmetic sub-word tokenizer for the tokenize stage
    relevance.ts         term-overlap scoring behind the retrieval scores
    useScrollDriver.ts   Lenis, scroll → stage mapping, prompt gate lock
    math.ts              seeded RNG, gaussian, sphere sampling, damping
  scene/
    Scene.tsx            canvas + renderer setup
    PointCloud.tsx       the centrepiece
    pointCloudShader.ts  GLSL
    CameraRig.tsx        keyframed camera spline along the stage axis
    Effects.tsx          bloom, velocity-driven aberration, vignette
    Starfield.tsx        far shell, for parallax reference
  ui/
    Overlay.tsx          the eight cross-fading panels
    Panels.tsx           per-stage content
    PromptGate.tsx       the opening frame
    PlainDocument.tsx    the whole CV as an ordinary page
    Rail.tsx / Hud.tsx / Boot.tsx
```

### Editing content

`src/data/profile.ts` is the only file to touch for copy changes — experience, projects, skills, metrics, contact details. Panels read from it directly, and so does the plain document, so there is no second place to update.

Adding a project means two edits: an entry in `projects` (with `track` deciding whether it also shows in the stage-04 agent grid), and a line in `PROJECT_SHAPE` (`src/lib/projectShapes.ts`) pointing it at a particle world. Reuse an existing world or add a builder in `shapes.ts` and register it in `SHAPE_IDS`.

One thing is hand-written rather than derived: the closing answer text in `GeneratePanel`.

## Sound

Every cue is synthesised at runtime from oscillators and filtered noise — there are no audio files. Stage arrivals get a low swell, cards tick in as they land, tokens click, switching project lands a chord.

Browsers refuse to start audio without a gesture, so nothing is created until the prompt is submitted. The toggle lives in the top-right HUD and the choice persists in `localStorage`.

## The recruiter path

Spectacle is the default, but it is never the only way through:

- **"Read as document"** (top right) or **Escape** swaps to the full CV as an ordinary scrolling page
- A **skip link** on first Tab does the same, before any of the 3D matters
- **No WebGL** → the document is served directly, no canvas mounted at all
- **`prefers-reduced-motion`** → damped camera, no turbulence, no roll, near-instant scroll
- All copy is real DOM text, with `Person` JSON-LD and OG tags for link previews
- Quality tiers drop point count, DPR and bloom on weaker GPUs; mobile gets a single-column layout
- Sound is one click away from off, and stays off

## Deploying

The build is fully static and `vite.config.ts` sets `base: './'`, so `dist/` works from any path — a GitHub Pages project site included.

For GitHub Pages, publish `dist/` to the `gh-pages` branch (or point Pages at it via Actions). One thing to update after choosing a host: the `canonical` link and the JSON-LD `url` in `index.html` both point at `https://shre111.github.io/portfolio/`.

## Stack

Vite · React 18 · TypeScript · three.js · @react-three/fiber · drei · @react-three/postprocessing · Lenis · Zustand

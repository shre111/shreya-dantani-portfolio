/**
 * Shape builders for the morphing point cloud.
 *
 * Every builder fills a Float32Array of `count * 4`:
 *   x, y, z  — world position
 *   w        — per-point "emphasis" in 0..1, read by the shader to pick a colour
 *              ramp (0 = base ink, 1 = accent). Lets a single material express
 *              up/down candles, RAG beams, city markers, etc.
 *
 * All shapes are authored to roughly fill a ±9 unit box so the camera path can
 * stay fixed while the cloud reorganises underneath it.
 */

import { fibonacciSphere, gaussian, latLonToVec3, makeRng, type Rng } from './math'
import { geography } from '../data/profile'

export const SHAPE_IDS = [
  // 0-7 map one-to-one onto the eight journey stages
  'cloud',
  'tokens',
  'portrait',
  'shards',
  'neural',
  'candles',
  'globe',
  'name',
  // 8+ are per-project worlds for the evaluate stage. The stage borrows one of
  // these in place of its own shape depending on which project is selected.
  'gifting',
  'funnel',
  'trees',
  'waveform',
] as const

export type ShapeId = (typeof SHAPE_IDS)[number]

export const SHAPE_INDEX: Record<ShapeId, number> = SHAPE_IDS.reduce(
  (acc, id, i) => ({ ...acc, [id]: i }),
  {} as Record<ShapeId, number>,
)

type Builder = (count: number, out: Float32Array, rng: Rng) => void | Promise<void>

// ---------------------------------------------------------------------------
// canvas sampling — turns any 2D drawing into a point cloud
// ---------------------------------------------------------------------------

type SampleOpts = {
  /** Canvas resolution to rasterise at. Higher = crisper glyph edges. */
  res?: number
  /** World units per canvas pixel is derived from this target width. */
  spanX?: number
  depth?: number
  /** When true, pixel luminance drives both sample probability and w. */
  useLuma?: boolean
}

type Candidate = { x: number; y: number; a: number }

function collectCandidates(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  useLuma: boolean,
): Candidate[] {
  const out: Candidate[] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const alpha = data[i + 3] / 255
      if (alpha < 0.35) continue
      const luma = useLuma ? (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255 : 1
      if (useLuma && luma < 0.12) continue
      out.push({ x, y, a: useLuma ? luma : 1 })
    }
  }
  return out
}

function fillFromCandidates(
  cands: Candidate[],
  cw: number,
  ch: number,
  count: number,
  out: Float32Array,
  rng: Rng,
  opts: Required<Pick<SampleOpts, 'spanX' | 'depth'>>,
) {
  const scale = opts.spanX / cw
  for (let i = 0; i < count; i++) {
    const c = cands[(rng() * cands.length) | 0]
    const px = c.x + rng()
    const py = c.y + rng()
    const o = i * 4
    out[o] = (px - cw / 2) * scale
    out[o + 1] = (ch / 2 - py) * scale
    out[o + 2] = (rng() - 0.5) * opts.depth
    out[o + 3] = c.a
  }
}

function sphereFallback(count: number, out: Float32Array, rng: Rng, radius = 7) {
  for (let i = 0; i < count; i++) {
    const [x, y, z] = fibonacciSphere(i, count)
    const r = radius * Math.cbrt(rng())
    const o = i * 4
    out[o] = x * r
    out[o + 1] = y * r
    out[o + 2] = z * r
    out[o + 3] = 0
  }
}

function sampleDrawing(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  count: number,
  out: Float32Array,
  rng: Rng,
  opts: SampleOpts = {},
) {
  const res = opts.res ?? 420
  const spanX = opts.spanX ?? 17
  const depth = opts.depth ?? 0.7
  const cw = res
  const ch = Math.round(res * 0.55)

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return sphereFallback(count, out, rng)

  ctx.clearRect(0, 0, cw, ch)
  draw(ctx, cw, ch)

  const { data } = ctx.getImageData(0, 0, cw, ch)
  const cands = collectCandidates(data, cw, ch, opts.useLuma ?? false)
  if (cands.length < 32) return sphereFallback(count, out, rng)

  fillFromCandidates(cands, cw, ch, count, out, rng, { spanX, depth })
}

/** Fits a single line of text to the canvas width and draws it centred. */
function drawFittedText(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  text: string,
  opts: { weight?: number; family?: string; fill?: number } = {},
) {
  const weight = opts.weight ?? 800
  const family = opts.family ?? "'Arial Black', 'Segoe UI', Impact, sans-serif"
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  let size = h
  ctx.font = `${weight} ${size}px ${family}`
  const target = w * (opts.fill ?? 0.92)
  const measured = ctx.measureText(text).width || 1
  size = Math.min(size, size * (target / measured))
  ctx.font = `${weight} ${size}px ${family}`
  ctx.fillText(text, w / 2, h / 2 + size * 0.02)
}

// ---------------------------------------------------------------------------
// 0 — cloud: an embedding space. Clustered, like a 3D UMAP plot.
// ---------------------------------------------------------------------------

const cloud: Builder = (count, out, rng) => {
  const CLUSTERS = 16
  const centers: [number, number, number][] = []
  for (let i = 0; i < CLUSTERS; i++) {
    const [x, y, z] = fibonacciSphere(i, CLUSTERS)
    const r = 3.6 + rng() * 4.4
    centers.push([x * r, y * r * 0.8, z * r])
  }

  for (let i = 0; i < count; i++) {
    const o = i * 4
    if (rng() < 0.24) {
      // diffuse background haze so the space feels continuous, not a set of balls
      const [x, y, z] = fibonacciSphere(i, count)
      const r = 2 + 8 * Math.cbrt(rng())
      out[o] = x * r
      out[o + 1] = y * r * 0.85
      out[o + 2] = z * r
      out[o + 3] = 0
    } else {
      const c = centers[(rng() * CLUSTERS) | 0]
      const spread = 0.75 + rng() * 0.95
      out[o] = c[0] + gaussian(rng) * spread
      out[o + 1] = c[1] + gaussian(rng) * spread * 0.85
      out[o + 2] = c[2] + gaussian(rng) * spread
      out[o + 3] = rng() < 0.12 ? 1 : 0.15
    }
  }
}

// ---------------------------------------------------------------------------
// 1 — tokens: rows of token chips, the way a tokenizer preview looks.
// ---------------------------------------------------------------------------

const tokens: Builder = (count, out, rng) => {
  type Chip = { x: number; y: number; w: number; h: number }
  const chips: Chip[] = []
  const ROWS = 6
  const rowH = 1.05
  const maxX = 8.6

  for (let r = 0; r < ROWS; r++) {
    const y = (ROWS / 2 - r - 0.5) * (rowH + 0.55)
    let x = -maxX + rng() * 1.2
    while (x < maxX - 0.8) {
      const w = 0.7 + rng() * 2.3
      if (x + w > maxX) break
      chips.push({ x: x + w / 2, y, w, h: rowH })
      x += w + 0.32
    }
  }
  if (!chips.length) return sphereFallback(count, out, rng)

  const totalArea = chips.reduce((s, c) => s + c.w * c.h, 0)
  for (let i = 0; i < count; i++) {
    // area-weighted pick so wide chips are not sparser than narrow ones
    let pick = rng() * totalArea
    let chip = chips[0]
    for (const c of chips) {
      pick -= c.w * c.h
      if (pick <= 0) {
        chip = c
        break
      }
    }

    const o = i * 4
    const onEdge = rng() < 0.34
    let lx: number
    let ly: number
    if (onEdge) {
      // trace the perimeter so each chip reads as a bordered pill
      const perim = 2 * (chip.w + chip.h)
      let t = rng() * perim
      if (t < chip.w) {
        lx = t - chip.w / 2
        ly = chip.h / 2
      } else if ((t -= chip.w) < chip.h) {
        lx = chip.w / 2
        ly = chip.h / 2 - t
      } else if ((t -= chip.h) < chip.w) {
        lx = chip.w / 2 - t
        ly = -chip.h / 2
      } else {
        t -= chip.w
        lx = -chip.w / 2
        ly = t - chip.h / 2
      }
    } else {
      lx = (rng() - 0.5) * chip.w * 0.86
      ly = (rng() - 0.5) * chip.h * 0.52
    }

    out[o] = chip.x + lx
    out[o + 1] = chip.y + ly
    out[o + 2] = (rng() - 0.5) * 0.5
    out[o + 3] = onEdge ? 1 : 0.12
  }
}

// ---------------------------------------------------------------------------
// 2 — portrait: her photo if one is supplied, otherwise an SD monogram.
// ---------------------------------------------------------------------------

let portraitImage: HTMLImageElement | null | undefined

/** Resolves to the image at public/portrait.png, or null when it is absent. */
function loadPortrait(): Promise<HTMLImageElement | null> {
  if (portraitImage !== undefined) return Promise.resolve(portraitImage)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const done = (v: HTMLImageElement | null) => {
      portraitImage = v
      resolve(v)
    }
    img.onload = () => done(img)
    img.onerror = () => done(null)
    img.src = `${import.meta.env.BASE_URL}portrait.png`
  })
}

/** Slides a finished shape sideways, in world units. */
function shiftX(out: Float32Array, count: number, dx: number) {
  for (let i = 0; i < count; i++) out[i * 4] += dx
}

/**
 * Composed to sit right of centre: the embed stage puts a long bio in the left
 * of the frame, and a centred portrait would land underneath it.
 */
const PORTRAIT_X = 4.7

const portrait: Builder = async (count, out, rng) => {
  const img = await loadPortrait()

  if (img) {
    sampleDrawing(
      (ctx, w, h) => {
        // cover-fit, then lift contrast so the particle density reads as a face
        const scale = Math.max(w / img.width, h / img.height)
        const dw = img.width * scale
        const dh = img.height * scale
        ctx.filter = 'grayscale(1) contrast(1.35) brightness(1.05)'
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
        ctx.filter = 'none'
      },
      count,
      out,
      rng,
      { res: 300, spanX: 9, depth: 1.4, useLuma: true },
    )
    shiftX(out, count, PORTRAIT_X)
    return
  }

  // No photo supplied — fall back to a monogram sized to sit inside its ring.
  sampleDrawing(
    (ctx, w, h) => {
      const r = h * 0.4
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = Math.max(2, h * 0.016)
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, r * 0.86, 0, Math.PI * 2)
      ctx.stroke()
      drawFittedText(ctx, w, h, 'SD', { fill: (r * 1.15) / w })
    },
    count,
    out,
    rng,
    { res: 420, spanX: 11, depth: 0.9 },
  )
  shiftX(out, count, PORTRAIT_X)
}

// ---------------------------------------------------------------------------
// 3 — shards: retrieved documents on a ring, with beams pulled to the centre.
// ---------------------------------------------------------------------------

const shards: Builder = (count, out, rng) => {
  const N = 13
  const radius = 8.2
  const cards = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 + 0.2
    const y = ((i % 5) - 2) * 1.5 + (rng() - 0.5)
    return {
      a,
      cx: Math.cos(a) * radius,
      cy: y,
      cz: Math.sin(a) * radius,
      w: 2.6,
      h: 3.3,
      tilt: (rng() - 0.5) * 0.35,
    }
  })

  for (let i = 0; i < count; i++) {
    const o = i * 4
    const card = cards[(rng() * N) | 0]
    const isBeam = rng() < 0.17

    if (isBeam) {
      // a point somewhere along the retrieval beam from card to origin
      const t = Math.pow(rng(), 0.7)
      const jitter = 0.09 * (1 - t)
      out[o] = card.cx * (1 - t) + gaussian(rng) * jitter
      out[o + 1] = card.cy * (1 - t) + gaussian(rng) * jitter
      out[o + 2] = card.cz * (1 - t) + gaussian(rng) * jitter
      out[o + 3] = 1
      continue
    }

    // local card space: u across the card face, v up
    let u: number
    let v: number
    const roll = rng()
    if (roll < 0.22) {
      // border
      const perim = 2 * (card.w + card.h)
      let t = rng() * perim
      if (t < card.w) {
        u = t - card.w / 2
        v = card.h / 2
      } else if ((t -= card.w) < card.h) {
        u = card.w / 2
        v = card.h / 2 - t
      } else if ((t -= card.h) < card.w) {
        u = card.w / 2 - t
        v = -card.h / 2
      } else {
        t -= card.h
        u = -card.w / 2
        v = t - card.h / 2
      }
    } else {
      // text lines: quantise v into rows, vary line length like real paragraphs
      const rows = 11
      const row = (rng() * rows) | 0
      v = card.h / 2 - 0.28 - (row / rows) * (card.h - 0.5)
      const lineLen = card.w * (row % 4 === 3 ? 0.45 : 0.62 + rng() * 0.22)
      u = -card.w / 2 + 0.24 + rng() * lineLen
      v += (rng() - 0.5) * 0.05
    }

    // orient the card so its face points at the origin
    const nx = -Math.cos(card.a)
    const nz = -Math.sin(card.a)
    const tx = -nz
    const tz = nx
    out[o] = card.cx + tx * u
    out[o + 1] = card.cy + v + card.tilt * u
    out[o + 2] = card.cz + tz * u
    out[o + 3] = roll < 0.22 ? 0.85 : 0.1
  }
}

// ---------------------------------------------------------------------------
// 4 — neural: a layered agent graph. Nodes plus the edges between them.
// ---------------------------------------------------------------------------

const neural: Builder = (count, out, rng) => {
  const LAYERS = [3, 6, 9, 6, 4]
  const spanX = 15
  const nodes: [number, number, number][][] = LAYERS.map((n, li) => {
    const x = -spanX / 2 + (li / (LAYERS.length - 1)) * spanX
    const cols = Math.ceil(Math.sqrt(n))
    return Array.from({ length: n }, (_, i) => {
      const cx = i % cols
      const cy = Math.floor(i / cols)
      const rows = Math.ceil(n / cols)
      const y = (cy - (rows - 1) / 2) * 2.5
      const z = (cx - (cols - 1) / 2) * 2.5
      return [x, y, z] as [number, number, number]
    })
  })

  for (let i = 0; i < count; i++) {
    const o = i * 4
    if (rng() < 0.42) {
      // node blob
      const li = (rng() * nodes.length) | 0
      const layer = nodes[li]
      const n = layer[(rng() * layer.length) | 0]
      const s = 0.34
      out[o] = n[0] + gaussian(rng) * s
      out[o + 1] = n[1] + gaussian(rng) * s
      out[o + 2] = n[2] + gaussian(rng) * s
      out[o + 3] = 1
    } else {
      // edge between adjacent layers, bowed slightly so the graph has depth
      const li = (rng() * (nodes.length - 1)) | 0
      const a = nodes[li][(rng() * nodes[li].length) | 0]
      const b = nodes[li + 1][(rng() * nodes[li + 1].length) | 0]
      const t = rng()
      const sag = Math.sin(t * Math.PI) * 0.42
      out[o] = a[0] + (b[0] - a[0]) * t
      out[o + 1] = a[1] + (b[1] - a[1]) * t - sag
      out[o + 2] = a[2] + (b[2] - a[2]) * t + sag * 0.5
      out[o + 3] = 0.08
    }
  }
}

// ---------------------------------------------------------------------------
// 5 — candles: the AI Trader backtest, as a candlestick chart plus equity curve.
// ---------------------------------------------------------------------------

const candles: Builder = (count, out, rng) => {
  const N = 54
  const bodyW = 0.19
  const stepX = 17 / N
  const series: { x: number; o: number; c: number; hi: number; lo: number }[] = []

  let price = -2.2
  for (let i = 0; i < N; i++) {
    const drift = 0.085
    const open = price
    const move = gaussian(rng) * 0.62 + drift
    const close = open + move
    const hi = Math.max(open, close) + Math.abs(gaussian(rng)) * 0.35
    const lo = Math.min(open, close) - Math.abs(gaussian(rng)) * 0.35
    series.push({ x: -8.5 + i * stepX, o: open, c: close, hi, lo })
    price = close
  }

  // normalise into a readable vertical band
  const all = series.flatMap((s) => [s.hi, s.lo])
  const min = Math.min(...all)
  const max = Math.max(...all)
  const norm = (v: number) => ((v - min) / (max - min)) * 8.5 - 4.6

  const equity: [number, number][] = []
  let acc = 0
  for (let i = 0; i < N; i++) {
    acc += series[i].c - series[i].o
    equity.push([series[i].x, acc])
  }
  const eqMax = Math.max(...equity.map((e) => Math.abs(e[1]))) || 1

  for (let i = 0; i < count; i++) {
    const o = i * 4
    const roll = rng()

    if (roll < 0.14) {
      // equity curve floating above the chart
      const t = rng() * (N - 1)
      const i0 = Math.floor(t)
      const f = t - i0
      const y = equity[i0][1] + (equity[Math.min(i0 + 1, N - 1)][1] - equity[i0][1]) * f
      out[o] = equity[i0][0] + f * stepX + (rng() - 0.5) * 0.04
      out[o + 1] = 5.0 + (y / eqMax) * 1.9 + (rng() - 0.5) * 0.07
      out[o + 2] = (rng() - 0.5) * 0.25
      out[o + 3] = 1
      continue
    }

    const s = series[(rng() * N) | 0]
    const up = s.c >= s.o
    const bodyTop = norm(Math.max(s.o, s.c))
    const bodyBot = norm(Math.min(s.o, s.c))
    const isWick = rng() < 0.2

    if (isWick) {
      out[o] = s.x + (rng() - 0.5) * bodyW * 0.3
      out[o + 1] = norm(s.lo) + rng() * (norm(s.hi) - norm(s.lo))
      out[o + 2] = (rng() - 0.5) * 0.16
    } else {
      out[o] = s.x + (rng() - 0.5) * bodyW * 2
      out[o + 1] = bodyBot + rng() * Math.max(bodyTop - bodyBot, 0.12)
      out[o + 2] = (rng() - 0.5) * 0.5
    }
    out[o + 3] = up ? 1 : 0.06
  }
}

// ---------------------------------------------------------------------------
// 6 — globe: lat/lon wireframe with markers where her work has shipped.
// ---------------------------------------------------------------------------

const globe: Builder = (count, out, rng) => {
  const R = 6.6
  const markers = geography.map((g) => ({ ...g, v: latLonToVec3(g.lat, g.lon, R) }))
  const home = markers.find((m) => m.home) ?? markers[markers.length - 1]

  for (let i = 0; i < count; i++) {
    const o = i * 4
    const roll = rng()

    if (roll < 0.1) {
      // marker blob
      const m = markers[(rng() * markers.length) | 0]
      const s = m.home ? 0.36 : 0.28
      out[o] = m.v[0] + gaussian(rng) * s
      out[o + 1] = m.v[1] + gaussian(rng) * s
      out[o + 2] = m.v[2] + gaussian(rng) * s
      out[o + 3] = 1
      continue
    }

    if (roll < 0.22) {
      // great-circle arc from home to each destination, lifted off the surface
      const m = markers[(rng() * markers.length) | 0]
      if (m.home) {
        // no arc to itself — fall through to the shell below
        const [x, y, z] = fibonacciSphere(i, count)
        out[o] = x * R
        out[o + 1] = y * R
        out[o + 2] = z * R
        out[o + 3] = 0.05
        continue
      }
      const t = rng()
      const ax = home.v[0] + (m.v[0] - home.v[0]) * t
      const ay = home.v[1] + (m.v[1] - home.v[1]) * t
      const az = home.v[2] + (m.v[2] - home.v[2]) * t
      const len = Math.hypot(ax, ay, az) || 1
      const lift = R + Math.sin(t * Math.PI) * 2.6
      out[o] = (ax / len) * lift
      out[o + 1] = (ay / len) * lift
      out[o + 2] = (az / len) * lift
      out[o + 3] = 0.9
      continue
    }

    if (roll < 0.72) {
      // graticule — latitude and longitude rings
      const onLat = rng() < 0.5
      if (onLat) {
        const band = ((rng() * 11) | 0) - 5
        const lat = band * 15
        const lon = rng() * 360 - 180
        const v = latLonToVec3(lat, lon, R)
        out[o] = v[0]
        out[o + 1] = v[1]
        out[o + 2] = v[2]
      } else {
        const meridian = ((rng() * 12) | 0) * 30 - 180
        const lat = rng() * 170 - 85
        const v = latLonToVec3(lat, meridian, R)
        out[o] = v[0]
        out[o + 1] = v[1]
        out[o + 2] = v[2]
      }
      out[o + 3] = 0.3
      continue
    }

    // faint shell so the sphere reads as solid from any angle
    const [x, y, z] = fibonacciSphere(i, count)
    const r = R * (0.995 + rng() * 0.02)
    out[o] = x * r
    out[o + 1] = y * r
    out[o + 2] = z * r
    out[o + 3] = 0.04
  }
}

// ---------------------------------------------------------------------------
// 7 — name: the payoff frame.
// ---------------------------------------------------------------------------

const name: Builder = (count, out, rng) => {
  sampleDrawing(
    (ctx, w, h) => {
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      let size = h * 0.46
      ctx.font = `900 ${size}px 'Arial Black', 'Segoe UI', Impact, sans-serif`
      const measured = ctx.measureText('SHREYA').width || 1
      size = Math.min(size, size * ((w * 0.9) / measured))
      ctx.font = `900 ${size}px 'Arial Black', 'Segoe UI', Impact, sans-serif`
      ctx.fillText('SHREYA', w / 2, h * 0.38)

      const sub = size * 0.3
      ctx.font = `600 ${sub}px 'Segoe UI', Helvetica, sans-serif`
      ctx.fillText('DANTANI', w / 2, h * 0.68)
    },
    count,
    out,
    rng,
    { res: 460, spanX: 17, depth: 0.6 },
  )
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Per-project worlds. These are never reached by scrolling alone — the evaluate
// stage swaps its own shape for one of these depending on which project the
// visitor has selected, so switching project physically rebuilds the cloud.
// ---------------------------------------------------------------------------

/** A point somewhere on one of a cube's twelve edges. */
function boxEdgePoint(S: number, rng: Rng): [number, number, number] {
  const axis = (rng() * 3) | 0
  const s1 = rng() < 0.5 ? -S : S
  const s2 = rng() < 0.5 ? -S : S
  const t = (rng() * 2 - 1) * S
  if (axis === 0) return [t, s1, s2]
  if (axis === 1) return [s1, t, s2]
  return [s1, s2, t]
}

/** A point somewhere on a cube's surface. */
function boxFacePoint(S: number, rng: Rng): [number, number, number] {
  const face = (rng() * 6) | 0
  const a = (rng() * 2 - 1) * S
  const b = (rng() * 2 - 1) * S
  switch (face) {
    case 0:
      return [S, a, b]
    case 1:
      return [-S, a, b]
    case 2:
      return [a, S, b]
    case 3:
      return [a, -S, b]
    case 4:
      return [a, b, S]
    default:
      return [a, b, -S]
  }
}

// 8 — gifting: Giftlips. A wrapped gift box with cards orbiting it.

const gifting: Builder = (count, out, rng) => {
  const S = 3.1
  const RIBBON = 0.5

  for (let i = 0; i < count; i++) {
    const o = i * 4
    const roll = rng()

    if (roll < 0.13) {
      // gift cards orbiting the box, each facing inward
      const a = rng() * Math.PI * 2
      const r = 5.8 + rng() * 3
      const u = (rng() - 0.5) * 1.7
      const v = (rng() - 0.5) * 1.1
      const nx = Math.cos(a)
      const nz = Math.sin(a)
      out[o] = nx * r - nz * u
      out[o + 1] = (rng() - 0.5) * 7.5 + v
      out[o + 2] = nz * r + nx * u
      out[o + 3] = 0.5
      continue
    }

    if (roll < 0.2) {
      // the bow: two loops sitting on the lid
      const side = rng() < 0.5 ? -1 : 1
      const a = rng() * Math.PI * 2
      out[o] = side * 1.05 + Math.cos(a) * 1.05 * side
      out[o + 1] = S + 0.95 + Math.sin(a) * 0.72
      out[o + 2] = (rng() - 0.5) * 0.4
      out[o + 3] = 1
      continue
    }

    if (roll < 0.48) {
      // ribbon: two bands wrapping the box, sampled by rejection
      let p: [number, number, number] = [0, 0, 0]
      let ok = false
      for (let tries = 0; tries < 12 && !ok; tries++) {
        p = boxFacePoint(S, rng)
        ok = Math.abs(p[0]) < RIBBON || Math.abs(p[2]) < RIBBON
      }
      out[o] = p[0]
      out[o + 1] = p[1]
      out[o + 2] = p[2]
      out[o + 3] = 1
      continue
    }

    if (roll < 0.82) {
      const [x, y, z] = boxEdgePoint(S, rng)
      out[o] = x
      out[o + 1] = y
      out[o + 2] = z
      out[o + 3] = 0.55
      continue
    }

    // faint wrapping-paper fill so the box reads as solid
    const [x, y, z] = boxFacePoint(S, rng)
    out[o] = x
    out[o + 1] = y
    out[o + 2] = z
    out[o + 3] = 0.06
  }
}

// 9 — funnel: FunnelCockpit. A conversion funnel plus blocks being dragged in.

const funnel: Builder = (count, out, rng) => {
  const TIERS = [
    { w: 8.4, y: 3.9 },
    { w: 6.4, y: 1.4 },
    { w: 4.5, y: -1.1 },
    { w: 2.7, y: -3.6 },
  ]
  const H = 1.45
  const D = 2.0

  for (let i = 0; i < count; i++) {
    const o = i * 4
    const roll = rng()

    if (roll < 0.12) {
      // page blocks waiting off to the side, mid drag-and-drop
      const slot = (rng() * 3) | 0
      const bx = 7.2 + (slot % 2) * 0.4
      const by = 3.2 - slot * 2.4
      const bw = 2.2
      const bh = 1.2
      const edge = rng() < 0.55
      let u: number
      let v: number
      if (edge) {
        const perim = 2 * (bw + bh)
        let t = rng() * perim
        if (t < bw) {
          u = t - bw / 2
          v = bh / 2
        } else if ((t -= bw) < bh) {
          u = bw / 2
          v = bh / 2 - t
        } else if ((t -= bh) < bw) {
          u = bw / 2 - t
          v = -bh / 2
        } else {
          t -= bh
          u = -bw / 2
          v = t - bh / 2
        }
      } else {
        u = (rng() - 0.5) * bw * 0.82
        v = (rng() - 0.5) * bh * 0.5
      }
      out[o] = bx + u
      out[o + 1] = by + v
      out[o + 2] = (rng() - 0.5) * 0.5
      out[o + 3] = edge ? 1 : 0.1
      continue
    }

    if (roll < 0.24) {
      // traffic falling through the funnel, narrowing as it descends
      const t = rng()
      const y = TIERS[0].y + H / 2 - t * (TIERS[0].y - TIERS[3].y + H)
      const wAt = TIERS[0].w * (1 - t) + TIERS[3].w * t
      out[o] = (rng() - 0.5) * wAt * 0.55
      out[o + 1] = y
      out[o + 2] = (rng() - 0.5) * D * 0.5
      out[o + 3] = 1
      continue
    }

    if (roll < 0.36) {
      // sloped shoulders joining one tier to the next
      const k = (rng() * (TIERS.length - 1)) | 0
      const t = rng()
      const side = rng() < 0.5 ? -1 : 1
      const x0 = (side * TIERS[k].w) / 2
      const x1 = (side * TIERS[k + 1].w) / 2
      out[o] = x0 + (x1 - x0) * t
      out[o + 1] = TIERS[k].y - H / 2 - t * (TIERS[k].y - H / 2 - (TIERS[k + 1].y + H / 2))
      out[o + 2] = (rng() - 0.5) * D
      out[o + 3] = 0.5
      continue
    }

    // the tiers themselves — rims bright, bodies faint
    const tier = TIERS[(rng() * TIERS.length) | 0]
    const rim = rng() < 0.45
    if (rim) {
      const top = rng() < 0.5
      out[o] = (rng() - 0.5) * tier.w
      out[o + 1] = tier.y + (top ? H / 2 : -H / 2)
      out[o + 2] = (rng() - 0.5) * D
      out[o + 3] = 1
    } else {
      out[o] = (rng() - 0.5) * tier.w
      out[o + 1] = tier.y + (rng() - 0.5) * H
      out[o + 2] = (rng() - 0.5) * D
      out[o + 3] = 0.09
    }
  }
}

// 10 — trees: the XGBoost dashboard. Three boosted decision trees.

const trees: Builder = (count, out, rng) => {
  type Node = { x: number; y: number; z: number; leaf: boolean }
  const nodes: Node[] = []
  const edges: [Node, Node][] = []

  const DEPTH = 3
  const build = (x: number, y: number, z: number, spread: number, d: number): Node => {
    const node: Node = { x, y, z, leaf: d === DEPTH }
    nodes.push(node)
    if (d < DEPTH) {
      for (const side of [-1, 1]) {
        const child = build(x + side * spread, y - 2.1, z, spread * 0.52, d + 1)
        edges.push([node, child])
      }
    }
    return node
  }

  for (const [rootX, rootZ] of [
    [-5.7, -0.9],
    [0, 0.6],
    [5.7, -0.9],
  ]) {
    build(rootX, 3.7, rootZ, 2.5, 0)
  }

  if (!nodes.length || !edges.length) return sphereFallback(count, out, rng)

  for (let i = 0; i < count; i++) {
    const o = i * 4
    if (rng() < 0.45) {
      const n = nodes[(rng() * nodes.length) | 0]
      const s = n.leaf ? 0.22 : 0.34
      out[o] = n.x + gaussian(rng) * s
      out[o + 1] = n.y + gaussian(rng) * s
      out[o + 2] = n.z + gaussian(rng) * s
      out[o + 3] = n.leaf ? 1 : 0.5
    } else {
      const [a, b] = edges[(rng() * edges.length) | 0]
      const t = rng()
      out[o] = a.x + (b.x - a.x) * t + gaussian(rng) * 0.04
      out[o + 1] = a.y + (b.y - a.y) * t
      out[o + 2] = a.z + (b.z - a.z) * t + gaussian(rng) * 0.04
      out[o + 3] = 0.09
    }
  }
}

// 11 — waveform: Seed-VC and Seed Dance. A voice, and the rings it radiates.

const waveform: Builder = (count, out, rng) => {
  const SPAN = 17
  const BARS = 104

  // a speech-like envelope: syllable bursts under a slow overall shape
  const amplitude = (k: number) => {
    const u = k / (BARS - 1)
    const syllables =
      0.55 + 0.45 * Math.sin(u * 34) * Math.sin(u * 11.3) + 0.25 * Math.sin(u * 61.7)
    const envelope = Math.sin(u * Math.PI) ** 0.6
    return Math.max(0.06, Math.abs(syllables) * envelope) * 3.6
  }

  for (let i = 0; i < count; i++) {
    const o = i * 4
    const roll = rng()

    if (roll < 0.16) {
      // concentric rings radiating from the source, tilted into depth
      const ring = 1 + ((rng() * 4) | 0)
      const r = ring * 1.85
      const a = rng() * Math.PI * 2
      out[o] = Math.cos(a) * r * 1.15
      out[o + 1] = Math.sin(a) * r * 0.75
      out[o + 2] = -3.2 - ring * 0.5
      out[o + 3] = 0.45
      continue
    }

    if (roll < 0.22) {
      // the centre line the waveform is mirrored around
      out[o] = (rng() - 0.5) * SPAN
      out[o + 1] = gaussian(rng) * 0.04
      out[o + 2] = (rng() - 0.5) * 0.3
      out[o + 3] = 1
      continue
    }

    const k = (rng() * BARS) | 0
    const amp = amplitude(k)
    const x = -SPAN / 2 + (k / (BARS - 1)) * SPAN
    // sample along the bar, denser at its tips so peaks read
    const t = Math.pow(rng(), 0.75)
    out[o] = x + (rng() - 0.5) * 0.055
    out[o + 1] = (rng() < 0.5 ? -1 : 1) * t * amp
    out[o + 2] = (rng() - 0.5) * 0.55
    out[o + 3] = t > 0.82 ? 1 : 0.16
  }
}

const BUILDERS: Record<ShapeId, Builder> = {
  cloud,
  tokens,
  portrait,
  shards,
  neural,
  candles,
  globe,
  name,
  gifting,
  funnel,
  trees,
  waveform,
}

/**
 * Builds every shape into one stacked atlas buffer laid out as
 * `[shape0 rows][shape1 rows]…`, matching a DataTexture of
 * `texWidth x (texHeight * SHAPE_IDS.length)`.
 *
 * Yields to the event loop between shapes so the boot sequence stays responsive
 * and can report progress.
 */
export async function buildShapeAtlas(
  count: number,
  onProgress?: (done: number, total: number) => void,
) {
  // Backed by an explicit ArrayBuffer so the element type stays narrow enough
  // for THREE.DataTexture, which will not take a SharedArrayBuffer-backed view.
  const atlas = new Float32Array(new ArrayBuffer(count * 4 * SHAPE_IDS.length * 4))
  const scratch = new Float32Array(count * 4)

  for (let s = 0; s < SHAPE_IDS.length; s++) {
    const id = SHAPE_IDS[s]
    scratch.fill(0)
    // a fixed seed per shape keeps the cloud identical across reloads
    await BUILDERS[id](count, scratch, makeRng(0x5eed + s * 7919))
    atlas.set(scratch, s * count * 4)
    onProgress?.(s + 1, SHAPE_IDS.length)
    await new Promise((r) => setTimeout(r, 0))
  }

  return atlas
}

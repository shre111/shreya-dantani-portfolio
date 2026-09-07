/** Small deterministic helpers shared by the shape builders. */

/** mulberry32 — tiny, fast, good enough, and stable across reloads. */
export function makeRng(seed: number) {
  let a = seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = () => number

/** Box–Muller, for cluster spread that looks like real embedding data. */
export function gaussian(rng: Rng): number {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Evenly distributed directions on a sphere — no polar clumping. */
export function fibonacciSphere(i: number, n: number): [number, number, number] {
  const phi = Math.acos(1 - (2 * (i + 0.5)) / n)
  const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5)
  return [
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi),
  ]
}

export function latLonToVec3(latDeg: number, lonDeg: number, r: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  return [r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), -r * Math.cos(lat) * Math.sin(lon)]
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Frame-rate independent exponential smoothing. */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt))
}

export const smoothstep = (t: number) => t * t * (3 - 2 * t)

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

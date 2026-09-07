/**
 * Picks a rendering tier up front so the point-cloud atlas is sized once and
 * never re-allocated. Deliberately conservative: a recruiter on an integrated
 * GPU should get a smooth 60fps, not a slideshow.
 */

export type Tier = 'high' | 'medium' | 'low'

export type QualityProfile = {
  tier: Tier
  /** Atlas texture width in texels. */
  texWidth: number
  /** Rows per shape slot. Total points = texWidth * texHeight. */
  texHeight: number
  /** Number of points in the cloud. */
  count: number
  dpr: [number, number]
  bloom: boolean
  /** Screen-space point size multiplier. */
  pointScale: number
}

const PROFILES: Record<Tier, Omit<QualityProfile, 'tier' | 'count'>> = {
  high: { texWidth: 512, texHeight: 256, dpr: [1, 1.75], bloom: true, pointScale: 1 },
  medium: { texWidth: 384, texHeight: 160, dpr: [1, 1.5], bloom: true, pointScale: 1.25 },
  low: { texWidth: 256, texHeight: 96, dpr: [1, 1.25], bloom: false, pointScale: 1.6 },
}

function build(tier: Tier): QualityProfile {
  const p = PROFILES[tier]
  return { tier, count: p.texWidth * p.texHeight, ...p }
}

/** Reads the unmasked GPU string, which is the only halfway-reliable signal we get. */
function gpuName(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return ''
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '') : ''
    const lose = gl.getExtension('WEBGL_lose_context')
    lose?.loseContext()
    return name.toLowerCase()
  } catch {
    return ''
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** True when we should skip the 3D experience entirely and serve the readable document. */
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function detectQuality(): QualityProfile {
  if (typeof window === 'undefined') return build('medium')

  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 700
  const gpu = gpuName()

  const weakGpu = /(swiftshader|llvmpipe|software|mali-4|adreno \(tm\) [12]|powervr sgx)/.test(gpu)

  if (weakGpu || cores <= 2 || memory <= 2) return build('low')
  if (coarse || narrow) return build('medium')
  if (cores <= 4 || memory <= 4) return build('medium')
  return build('high')
}

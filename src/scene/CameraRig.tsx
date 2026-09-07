import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { damp } from '../lib/math'
import { scroll, useStore } from '../store/useStore'

/**
 * Camera keyframes along the stage axis. `at` is a position on the same 0..7
 * stage scale the point cloud morphs on, so extra keyframes can be dropped
 * between stages to choreograph a move — the dive through the middle of the
 * cloud on the way into the embed stage, for instance.
 */
type Key = { at: number; pos: [number, number, number]; look: [number, number, number]; fov: number }

const KEYS: Key[] = [
  // 0 — gate: the whole embedding space, held at a distance
  { at: 0.0, pos: [0, 1.2, 27], look: [0, 0, 0], fov: 42 },
  { at: 0.7, pos: [1.5, 0.8, 20], look: [0, 0, 0], fov: 44 },

  // 1 — tokenize: square on to the chip grid
  { at: 1.0, pos: [0, 0, 16], look: [0, 0, 0], fov: 45 },

  // …then straight through the middle of the cloud
  { at: 1.5, pos: [3.2, 1.4, 3.4], look: [0, 0, -2], fov: 62 },

  // 2 — embed: the shape resolves in front of you
  { at: 2.0, pos: [0, 0, 15.5], look: [0, 0, 0], fov: 45 },
  { at: 2.6, pos: [-6.5, 3, 12], look: [0, 0, 0], fov: 46 },

  // 3 — retrieve: looking down into the ring of documents
  { at: 3.0, pos: [0, 3.4, 12.5], look: [0, 0, 0], fov: 48 },
  { at: 3.6, pos: [7.5, 1, 9.5], look: [0, 0, 0], fov: 47 },

  // 4 — agents: the graph, then a pass along its length
  { at: 4.0, pos: [0, 1.5, 17], look: [0, 0, 0], fov: 45 },
  { at: 4.6, pos: [-9.5, 3.2, 8.5], look: [0, 0, 0], fov: 50 },

  // 5 — backtest: the chart, then a low sweep under the candles
  { at: 5.0, pos: [0, 0.6, 15], look: [0, 0.4, 0], fov: 45 },
  { at: 5.6, pos: [6.5, -2, 9], look: [0, 0, 0], fov: 48 },

  // 6 — deploy: the globe, orbited
  { at: 6.0, pos: [0, 0.5, 17], look: [0, 0, 0], fov: 44 },
  { at: 6.5, pos: [10, 4.5, 11], look: [0, 0, 0], fov: 46 },

  // 7 — generate: front on, for the name
  { at: 7.0, pos: [0, 0, 16], look: [0, 0, 0], fov: 44 },
]

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const reducedMotion = useStore((s) => s.reducedMotion)

  const { posCurve, lookCurve, ats } = useMemo(() => {
    const p = new THREE.CatmullRomCurve3(
      KEYS.map((k) => new THREE.Vector3(...k.pos)),
      false,
      'catmullrom',
      0.35,
    )
    const l = new THREE.CatmullRomCurve3(
      KEYS.map((k) => new THREE.Vector3(...k.look)),
      false,
      'catmullrom',
      0.35,
    )
    return { posCurve: p, lookCurve: l, ats: KEYS.map((k) => k.at) }
  }, [])

  const current = useRef(new THREE.Vector3(...KEYS[0].pos))
  const target = useRef(new THREE.Vector3(...KEYS[0].look))
  const fovRef = useRef(KEYS[0].fov)
  const scratchPos = useMemo(() => new THREE.Vector3(), [])
  const scratchLook = useMemo(() => new THREE.Vector3(), [])

  /** Maps a stage position onto normalised curve t, honouring keyframe spacing. */
  const toCurveT = (stageFloat: number) => {
    const last = ats.length - 1
    if (stageFloat <= ats[0]) return 0
    if (stageFloat >= ats[last]) return 1
    let i = 0
    while (i < last && ats[i + 1] < stageFloat) i++
    const span = ats[i + 1] - ats[i] || 1
    const u = (stageFloat - ats[i]) / span
    return (i + u) / last
  }

  const fovAt = (stageFloat: number) => {
    const last = ats.length - 1
    if (stageFloat <= ats[0]) return KEYS[0].fov
    if (stageFloat >= ats[last]) return KEYS[last].fov
    let i = 0
    while (i < last && ats[i + 1] < stageFloat) i++
    const span = ats[i + 1] - ats[i] || 1
    const u = (stageFloat - ats[i]) / span
    const e = u * u * (3 - 2 * u)
    return KEYS[i].fov + (KEYS[i + 1].fov - KEYS[i].fov) * e
  }

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    const s = scroll.eased
    const t = toCurveT(s)

    posCurve.getPoint(t, scratchPos)
    lookCurve.getPoint(t, scratchLook)

    // Pull back through the middle of each transition, so the detonation has
    // room to read and the camera feels like it is bracing against it.
    if (!reducedMotion) scratchPos.multiplyScalar(1 + scroll.transit * 0.13)

    // Pointer parallax, scaled down as the camera gets close to the cloud so it
    // never swings wildly during the dive.
    const proximity = THREE.MathUtils.clamp(scratchPos.length() / 20, 0.25, 1)
    const px = reducedMotion ? 0 : scroll.pointerX * 1.5 * proximity
    const py = reducedMotion ? 0 : scroll.pointerY * 1.0 * proximity
    scratchPos.x += px
    scratchPos.y -= py

    const lambda = reducedMotion ? 12 : 4.5
    current.current.x = damp(current.current.x, scratchPos.x, lambda, dt)
    current.current.y = damp(current.current.y, scratchPos.y, lambda, dt)
    current.current.z = damp(current.current.z, scratchPos.z, lambda, dt)

    target.current.x = damp(target.current.x, scratchLook.x, lambda, dt)
    target.current.y = damp(target.current.y, scratchLook.y, lambda, dt)
    target.current.z = damp(target.current.z, scratchLook.z, lambda, dt)

    camera.position.copy(current.current)
    camera.lookAt(target.current)

    // Roll tied to scroll velocity, banked further through a transition — sells
    // the sense of travel and gives the burst a direction.
    if (!reducedMotion) {
      const roll =
        THREE.MathUtils.clamp(scroll.velocity / 150, -0.12, 0.12) +
        Math.sin(scroll.eased * 2.1) * scroll.transit * 0.05
      camera.rotation.z = damp(camera.rotation.z, roll, 3.5, dt)
    }

    // widen slightly at the peak, which reads as a lens punch
    const nextFov = fovAt(s) + (reducedMotion ? 0 : scroll.transit * 5.5)
    fovRef.current = damp(fovRef.current, nextFov, 4, dt)
    if (Math.abs(camera.fov - fovRef.current) > 0.01) {
      camera.fov = fovRef.current
      camera.updateProjectionMatrix()
    }
  })

  return null
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { buildShapeAtlas, SHAPE_IDS } from '../lib/shapes'
import { clamp, damp, easeInOutCubic, makeRng } from '../lib/math'
import { shapeIndexForProject } from '../lib/projectShapes'
import { STAGES } from '../data/profile'
import { scroll, useStore } from '../store/useStore'
import { fragmentShader, vertexShader } from './pointCloudShader'
import { PALETTE } from './palette'

/** Index of the evaluate stage, whose shape is chosen by the selected project. */
const EVALUATE_STAGE = STAGES.indexOf('evaluate')

/** How long one project world takes to become another. Long enough to watch. */
const SWITCH_SECONDS = 1.5

/**
 * Holds the fraction between two stages near 0 and 1 for a while, so each shape
 * gets a moment to be legible before it dissolves into the next one.
 */
function dwell(f: number) {
  const t = clamp((f - 0.2) / 0.6, 0, 1)
  return t * t * (3 - 2 * t)
}

export function PointCloud() {
  const quality = useStore((s) => s.quality)
  const reducedMotion = useStore((s) => s.reducedMotion)
  const setBootProgress = useStore((s) => s.setBootProgress)
  const setReady = useStore((s) => s.setReady)

  const camera = useThree((s) => s.camera)
  const selectedProject = useStore((s) => s.selectedProject)

  // Which world the evaluate stage is currently showing, and the one it is
  // morphing away from. Refs, not state — these are read inside useFrame.
  const projectShape = useRef(shapeIndexForProject(selectedProject))
  const prevProjectShape = useRef(projectShape.current)
  const switchT = useRef(1)

  useEffect(() => {
    const next = shapeIndexForProject(selectedProject)
    if (next === projectShape.current) return
    prevProjectShape.current = projectShape.current
    projectShape.current = next
    switchT.current = 0
  }, [selectedProject])

  const [atlas, setAtlas] = useState<THREE.DataTexture | null>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const revealRef = useRef(0)
  const scatterRef = useRef(0)
  const dramaRef = useRef(0)
  const easedStage = useRef(0)

  // scratch vectors, reused every frame
  const ndc = useMemo(() => new THREE.Vector3(), [])
  const ray = useMemo(() => new THREE.Vector3(), [])
  const viewDir = useMemo(() => new THREE.Vector3(), [])
  const cursorTarget = useMemo(() => new THREE.Vector3(), [])

  const { count, texWidth, texHeight, pointScale } = quality

  // --- geometry: one vertex per texel, carrying only its atlas coordinate ---
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const uvs = new Float32Array(count * 2)
    const seeds = new Float32Array(count)
    const rng = makeRng(0xc0ffee)

    for (let i = 0; i < count; i++) {
      const col = i % texWidth
      const row = Math.floor(i / texWidth)
      uvs[i * 2] = (col + 0.5) / texWidth
      uvs[i * 2 + 1] = (row + 0.5) / texHeight
      seeds[i] = rng()
      // real positions come from the atlas in the vertex shader; this only
      // exists so three has a vertex count and a sane bounding sphere
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aUv', new THREE.BufferAttribute(uvs, 2))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60)
    return geo
  }, [count, texWidth, texHeight])

  const uniforms = useMemo(
    () => ({
      uAtlas: { value: null as THREE.DataTexture | null },
      uShapeCount: { value: SHAPE_IDS.length },
      uShapeA: { value: 0 },
      uShapeB: { value: 1 },
      uMorph: { value: 0 },
      uTime: { value: 0 },
      uScatter: { value: 0 },
      uTwist: { value: 0 },
      uBurstOut: { value: 0 },
      uSize: { value: 1.9 * pointScale },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uReveal: { value: 0 },
      uBreathe: { value: reducedMotion ? 0.02 : 0.12 },
      uPointer: { value: new THREE.Vector2() },
      uParallax: { value: reducedMotion ? 0 : 0.5 },
      uCursor: { value: new THREE.Vector3(0, 0, -999) },
      uViewDir: { value: new THREE.Vector3(0, 0, -1) },
      uCursorPush: { value: 0 },
      uCursorSwirl: { value: 0 },
      uCursorRadius: { value: 2.9 },
      uInk: { value: new THREE.Color(PALETTE.ink) },
      uAccent: { value: new THREE.Color(PALETTE.accent) },
      uHot: { value: new THREE.Color(PALETTE.hot) },
      uOpacity: { value: 1 },
    }),
    [pointScale, reducedMotion],
  )

  // --- boot: build every shape into one float texture ---
  useEffect(() => {
    let cancelled = false

    buildShapeAtlas(count, (done, total) => {
      if (!cancelled) setBootProgress(done / total)
    }).then((data) => {
      if (cancelled) return
      const tex = new THREE.DataTexture(
        data,
        texWidth,
        texHeight * SHAPE_IDS.length,
        THREE.RGBAFormat,
        THREE.FloatType,
      )
      tex.minFilter = THREE.NearestFilter
      tex.magFilter = THREE.NearestFilter
      tex.generateMipmaps = false
      tex.needsUpdate = true
      uniforms.uAtlas.value = tex
      setAtlas(tex)
      setReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [count, texWidth, texHeight, uniforms, setBootProgress, setReady])

  useEffect(() => () => atlas?.dispose(), [atlas])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    uniforms.uTime.value += dt

    // ease in the cloud once the atlas is ready
    revealRef.current = damp(revealRef.current, atlas ? 1 : 0, 1.4, dt)
    uniforms.uReveal.value = revealRef.current

    // smooth the raw scroll position so a flick of the wheel does not snap
    easedStage.current = damp(easedStage.current, scroll.stageFloat, 6, dt)
    scroll.eased = easedStage.current

    const lastStage = STAGES.length - 1
    const a = Math.min(Math.floor(easedStage.current), lastStage)
    const f = clamp(easedStage.current - a, 0, 1)

    // The evaluate stage borrows the selected project's world in place of its
    // own shape, so the cloud always shows whatever project is on screen.
    const shapeFor = (stage: number) =>
      stage === EVALUATE_STAGE ? projectShape.current : Math.min(stage, lastStage)

    // A project switch runs its own morph between two project worlds, driving
    // the shape pair directly — the scroll morph is idle on this stage anyway.
    //
    // Proximity, not `a === EVALUATE_STAGE`: the damped scroll position settles
    // asymptotically and lands just *under* the stage index, so floor() gives
    // the previous stage and an equality test never fires. That is what made
    // switching snap instantly instead of morphing.
    switchT.current = Math.min(1, switchT.current + dt / SWITCH_SECONDS)
    const nearEvaluate = Math.abs(easedStage.current - EVALUATE_STAGE) < 0.3
    const switching = switchT.current < 1 && nearEvaluate

    if (switching) {
      uniforms.uShapeA.value = prevProjectShape.current
      uniforms.uShapeB.value = projectShape.current
      uniforms.uMorph.value = easeInOutCubic(switchT.current)
    } else {
      uniforms.uShapeA.value = shapeFor(a)
      uniforms.uShapeB.value = shapeFor(Math.min(a + 1, lastStage))
      uniforms.uMorph.value = dwell(f)
    }

    // How mid-transition we are, by position alone.
    const transit = Math.sin(clamp(f, 0, 1) * Math.PI)
    const speed = clamp(Math.abs(scroll.velocity) / 30, 0, 1)

    // A project switch gets the same detonation a scroll transition does.
    const switchBurst = switching ? Math.sin(switchT.current * Math.PI) ** 0.75 : 0

    // The burst is a function of MOVEMENT, not just position. Stop scrolling
    // halfway between two shapes and the cloud settles into the blend instead
    // of hanging in the air as permanent fog.
    const drama = reducedMotion
      ? 0
      : Math.max(transit * (0.2 + 0.8 * speed), switchBurst)
    dramaRef.current = damp(dramaRef.current, drama, 5, dt)
    scroll.transit = dramaRef.current

    const targetScatter = reducedMotion ? 0.25 : 3.1 * dramaRef.current + 0.9 * speed
    scatterRef.current = damp(scatterRef.current, targetScatter, 6, dt)
    uniforms.uScatter.value = scatterRef.current

    // Shear and detonation ride the same curve but bite later, so a transition
    // reads as an event rather than a dissolve.
    const violence = Math.pow(dramaRef.current, 1.25)
    uniforms.uTwist.value = damp(uniforms.uTwist.value, violence * 2.1, 6, dt)
    uniforms.uBurstOut.value = damp(uniforms.uBurstOut.value, violence * 3.6, 6, dt)

    // The cloud is the spectacle while you are travelling and the backdrop
    // while you are reading, so it surges through each transition and settles
    // back out of the copy's way. The opening and closing frames keep more
    // presence — there is far less text on them and the shape is the point.
    const heroStage = a === 0 || a === lastStage
    const floor = heroStage ? 0.82 : 0.42
    uniforms.uOpacity.value = damp(
      uniforms.uOpacity.value,
      floor + (1 - floor) * Math.max(dramaRef.current, transit * 0.35),
      5,
      dt,
    )

    uniforms.uPointer.value.set(
      damp(uniforms.uPointer.value.x, scroll.pointerX, 3.2, dt),
      damp(uniforms.uPointer.value.y, scroll.pointerY, 3.2, dt),
    )

    // --- cursor force field ---------------------------------------------
    // Project the pointer onto the plane through the origin that faces the
    // camera, so the well sits inside the cloud rather than on the near plane.
    if (!reducedMotion && scroll.pointerActive) {
      camera.getWorldDirection(viewDir)
      uniforms.uViewDir.value.copy(viewDir)

      ndc.set(scroll.pointerX, -scroll.pointerY, 0.5).unproject(camera)
      ray.subVectors(ndc, camera.position).normalize()
      // distance along the ray to the plane through the origin
      const denom = viewDir.dot(ray)
      const hit = Math.abs(denom) > 1e-4 ? -viewDir.dot(camera.position) / denom : 20
      cursorTarget
        .copy(camera.position)
        .addScaledVector(ray, clamp(hit, 1, 60))

      // trails behind the pointer, which is what turns a fast flick into a wake
      uniforms.uCursor.value.lerp(cursorTarget, 1 - Math.exp(-9 * dt))

      // decay the sampled speed so the field calms down when the cursor stops
      scroll.pointerSpeed *= Math.exp(-4.5 * dt)
      const kick = clamp(scroll.pointerSpeed / 3.2, 0, 1)

      // A resting cursor barely dimples the cloud; a moving one pushes through
      // it. Kept modest on purpose — the shapes have fine structure, and a
      // strong well destroys them rather than reacting to you.
      uniforms.uCursorPush.value = damp(uniforms.uCursorPush.value, 0.22 + kick * 1.5, 9, dt)
      uniforms.uCursorSwirl.value = damp(uniforms.uCursorSwirl.value, 0.06 + kick * 0.36, 9, dt)
    } else {
      uniforms.uCursorPush.value = damp(uniforms.uCursorPush.value, 0, 6, dt)
      uniforms.uCursorSwirl.value = damp(uniforms.uCursorSwirl.value, 0, 6, dt)
    }

    // a slow yaw keeps the silhouette alive without fighting the camera path
    if (pointsRef.current && !reducedMotion) {
      pointsRef.current.rotation.y = Math.sin(uniforms.uTime.value * 0.06) * 0.09
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

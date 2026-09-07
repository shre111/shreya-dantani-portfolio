import { useMemo, useRef, type Ref } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing'
import {
  BlendFunction,
  type BloomEffect,
  type ChromaticAberrationEffect,
} from 'postprocessing'
import * as THREE from 'three'
import { clamp, damp } from '../lib/math'
import { scroll, useStore } from '../store/useStore'

/**
 * Bloom is what makes an additive point cloud read as light rather than as
 * dots. Both bloom and aberration are driven by motion — scroll speed and
 * transition progress — and fall back to nothing at rest. Held static, the
 * aberration would just look like a broken display.
 */
export function Effects() {
  const quality = useStore((s) => s.quality)
  const reducedMotion = useStore((s) => s.reducedMotion)
  const caRef = useRef<ChromaticAberrationEffect>(null)
  const bloomRef = useRef<BloomEffect>(null)
  const amount = useRef(0)
  const offset = useMemo(() => new THREE.Vector2(0, 0), [])

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)

    // Aberration answers to both scroll speed and how mid-transition we are.
    if (caRef.current) {
      const speed = clamp(Math.abs(scroll.velocity) / 60, 0, 1)
      amount.current = damp(amount.current, Math.max(speed, scroll.transit * 0.9), 8, dt)
      const v = amount.current * 0.006
      caRef.current.offset.set(v, v * 0.55)
    }

    // Bloom surges with the detonation, so the burst blows out rather than
    // just spreading. Settles straight back so reading stays comfortable.
    if (bloomRef.current) {
      const base = reducedMotion ? 0.55 : 0.82
      bloomRef.current.intensity = damp(
        bloomRef.current.intensity,
        base + (reducedMotion ? 0 : scroll.transit * 1.5),
        7,
        dt,
      )
    }
  })

  if (!quality.bloom) {
    return (
      <EffectComposer enableNormalPass={false}>
        <Vignette offset={0.28} darkness={0.72} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    )
  }

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      <Bloom
        ref={bloomRef as unknown as Ref<typeof BloomEffect>}
        intensity={reducedMotion ? 0.55 : 0.82}
        luminanceThreshold={0.22}
        luminanceSmoothing={0.45}
        mipmapBlur
        radius={0.66}
      />
      <ChromaticAberration
        // upstream types the ref as the class rather than an instance of it
        ref={caRef as unknown as Ref<typeof ChromaticAberrationEffect>}
        offset={offset}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette offset={0.24} darkness={0.68} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  )
}

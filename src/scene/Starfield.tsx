import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fibonacciSphere, makeRng } from '../lib/math'
import { PALETTE } from './palette'
import { useStore } from '../store/useStore'

/**
 * A sparse far shell. Costs almost nothing and gives the camera moves a fixed
 * frame of reference — without it the cloud reads as flat no matter how much
 * the camera travels.
 */
export function Starfield() {
  const reducedMotion = useStore((s) => s.reducedMotion)
  const ref = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const COUNT = 900
    const rng = makeRng(0xbeef)
    const positions = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const [x, y, z] = fibonacciSphere(i, COUNT)
      const r = 70 + rng() * 70
      positions[i * 3] = x * r
      positions[i * 3 + 1] = y * r * 0.7
      positions[i * 3 + 2] = z * r
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  useFrame((_, delta) => {
    if (ref.current && !reducedMotion) ref.current.rotation.y += delta * 0.006
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.9}
        sizeAttenuation
        color={PALETTE.ink}
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

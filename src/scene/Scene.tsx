import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { PointCloud } from './PointCloud'
import { Starfield } from './Starfield'
import { PALETTE } from './palette'
import { useStore } from '../store/useStore'

export function Scene() {
  const quality = useStore((s) => s.quality)

  return (
    <Canvas
      className="scene"
      dpr={quality.dpr}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
      }}
      camera={{ fov: 42, near: 0.1, far: 400, position: [0, 1.2, 27] }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(new THREE.Color(PALETTE.bg), 1)
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        scene.fog = new THREE.FogExp2(PALETTE.bg, 0.012)
      }}
    >
      <Starfield />
      <PointCloud />
      <CameraRig />
      <Effects />
    </Canvas>
  )
}

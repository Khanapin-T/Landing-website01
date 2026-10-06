import { Component, Suspense, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { setError } from '../story/appState'
import { HeroRing } from './ring/HeroRing'
import { IdeaScene } from '../acts/idea/IdeaScene'
import { PrintScene } from '../acts/print/PrintScene'
import { MoldScene } from '../acts/mold/MoldScene'
import { CAM_INITIAL } from '../story/store'
import { ResinStream } from './particles/ResinStream'
import { StudioEnvironment } from './StudioEnvironment'
import { PostFX } from './PostFX'
import { CameraRig } from './CameraRig'
import { Precompile } from './Precompile'
import { QualityController } from './quality/QualityController'
import { QUALITY_STEPS, effectiveDpr } from './quality/quality'
import { getQualityIndex } from './quality/qualityStore'

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    setError(String(error))
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** The single fixed full-screen WebGL canvas. */
export function Stage() {
  const dpr = effectiveDpr(QUALITY_STEPS[getQualityIndex()], window.devicePixelRatio)

  return (
    <Canvas
      className="!fixed inset-0"
      dpr={dpr}
      flat
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 30, position: [0, CAM_INITIAL.y, CAM_INITIAL.z], near: 0.1, far: 100 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          setError('webgl-context-lost')
        })
      }}
    >
      <color attach="background" args={['#0a1622']} />
      <CameraRig />
      <QualityController />
      <SceneErrorBoundary>
        <Suspense fallback={null}>
          <StudioEnvironment />
          <HeroRing />
          <IdeaScene />
          <PrintScene />
          <MoldScene />
          <ResinStream />
          <Precompile />
        </Suspense>
      </SceneErrorBoundary>
      <PostFX />
    </Canvas>
  )
}

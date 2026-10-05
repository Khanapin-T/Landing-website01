import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { createRingMaterial } from './ringMaterial'
import { RingPivot } from './RingPivot'
import { useRingGeometry } from './useRingGeometry'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'

/** The one persistent hero ring. Its state comes from story.ring (written by the acts' tweens). */
export function HeroRing() {
  const geometry = useRingGeometry()
  const { material, uniforms } = useMemo(() => createRingMaterial(), [])
  useEffect(() => () => material.dispose(), [material])

  const ref = useRef<Mesh>(null)
  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    material.opacity = story.ring.fill
    uniforms.uCad.value = story.ring.cad
    // Visible while loading so Precompile compiles it; afterwards skip the draw call when fully dissolved.
    mesh.visible = getAppState().phase === 'loading' || story.ring.fill > 0.001
  })

  return (
    <RingPivot>
      <mesh ref={ref} geometry={geometry} material={material} />
    </RingPivot>
  )
}

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { getRingMaterial } from './sharedMaterial'
import { RingPivot } from './RingPivot'
import { createSprueGeometry } from './sprue'
import { useRingGeometry } from './useRingGeometry'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'

/** The one persistent hero ring (with its sprue). Its state comes from story.ring (written by the acts' tweens). */
export function HeroRing() {
  const geometry = useRingGeometry()
  // Shared with the tree clones; the singleton is never disposed (the page owns the context).
  const { material, uniforms } = getRingMaterial()
  const sprueGeometry = useMemo(() => createSprueGeometry(), [])
  useEffect(() => () => sprueGeometry.dispose(), [sprueGeometry])

  const ref = useRef<Mesh>(null)
  const sprueRef = useRef<Mesh>(null)
  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    material.opacity = story.ring.fill
    uniforms.uCad.value = story.ring.cad
    uniforms.uResin.value = story.ring.resin
    uniforms.uCureY.value = story.ring.cureY
    // Visible while loading so Precompile compiles it; afterwards skip the draw call when fully dissolved.
    const loading = getAppState().phase === 'loading'
    const filled = story.ring.fill > 0.001
    mesh.visible = loading || filled
    if (sprueRef.current) sprueRef.current.visible = loading || (story.ring.sprue > 0.5 && filled)
  })

  // The sprue shares the ring's material instance: same states, same cure clip, one program.
  return (
    <RingPivot>
      <mesh ref={ref} geometry={geometry} material={material} />
      <mesh ref={sprueRef} geometry={sprueGeometry} material={material} />
    </RingPivot>
  )
}

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { RING_COUNT } from '../../config/print'
import { getRingMaterial } from './sharedMaterial'
import { RingPivot } from './RingPivot'
import { createSprueGeometry } from './sprue'
import { useRingGeometry, useRingLightGeometry } from './useRingGeometry'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'

const INDICES = Array.from({ length: RING_COUNT }, (_, k) => k)

/**
 * The four persistent rings (each with its sprue), all from story.ring (written by the acts' tweens): ring 0 is Act
 * 1's CAD ring and the first of the print; rings 1..3 exist from the resin print on (Act 2) and each flies to its own
 * tree slot (story.ring.flight). Ring 0 uses the full model, the others the light one (same shape, same program).
 */
export function HeroRing() {
  const geometry = useRingGeometry()
  const lightGeometry = useRingLightGeometry()
  // One material for all four (the singleton is never disposed: the page owns the context).
  const { material, uniforms } = getRingMaterial()
  const sprueGeometry = useMemo(() => createSprueGeometry(), [])
  useEffect(() => () => sprueGeometry.dispose(), [sprueGeometry])

  const rings = useRef<(Mesh | null)[]>([])
  const sprues = useRef<(Mesh | null)[]>([])
  useFrame(() => {
    material.opacity = story.ring.fill
    uniforms.uCad.value = story.ring.cad
    uniforms.uResin.value = story.ring.resin
    uniforms.uCureY.value = story.ring.cureY
    // Visible while loading so Precompile compiles it; afterwards skip the draw call when fully dissolved.
    const loading = getAppState().phase === 'loading'
    const filled = story.ring.fill > 0.001
    // Fully burned out (the burn front itself is written by Tree.tsx): skip the draw calls.
    const burned = story.flask.burn > 0.999
    // Rings 1..3 are printed alongside ring 0: they exist only from the resin print on (like the supports).
    const printed = story.ring.resin > 0.5
    for (let k = 0; k < RING_COUNT; k++) {
      const shown = filled && !burned && (k === 0 || printed)
      const ring = rings.current[k]
      if (ring) ring.visible = loading || shown
      const sprue = sprues.current[k]
      if (sprue) sprue.visible = loading || (shown && story.ring.sprue > 0.5)
    }
  })

  // The sprue shares the ring's material instance: same states, same cure clip, one program.
  return (
    <>
      {INDICES.map((k) => (
        <RingPivot key={k} index={k}>
          <mesh
            ref={(m) => {
              rings.current[k] = m
            }}
            geometry={k === 0 ? geometry : lightGeometry}
            material={material}
          />
          <mesh
            ref={(m) => {
              sprues.current[k] = m
            }}
            geometry={sprueGeometry}
            material={material}
          />
        </RingPivot>
      ))}
    </>
  )
}

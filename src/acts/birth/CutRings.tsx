import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { CUT_ORDER, HERO_SLOT, cutRingMatrix, jarOffsetY } from '../../config/birth'
import { createSprueGeometry } from '../../scene/ring/sprue'
import { useRingLightGeometry } from '../../scene/ring/useRingGeometry'
import { createRawGoldMaterial } from '../../scene/gold/rawGoldMaterial'
import { getAppState } from '../../story/appState'
import { birth, cutOf } from './state'

const SLOTS = CUT_ORDER.filter((s) => s !== HERO_SLOT)

/**
 * The three rings that stay in the jar (Act 7): raw gold with their sprue stubs, on the tree, falling one by one,
 * at rest in the acid; they go down with the jar (config/birth.ts cutRingMatrix). The hero ring is PolishRing.
 */
export function CutRings() {
  const ring = useRingLightGeometry()
  const sprue = useMemo(() => createSprueGeometry(), [])
  const material = useMemo(() => createRawGoldMaterial(false), [])
  useEffect(
    () => () => {
      sprue.dispose()
      material.dispose()
    },
    [sprue, material],
  )

  const refs = useRef<(Group | null)[]>([])
  useFrame(() => {
    const loading = getAppState().phase === 'loading'
    const jarY = jarOffsetY(birth.jar, birth.jarAway)
    for (let i = 0; i < SLOTS.length; i++) {
      const g = refs.current[i]
      if (!g) continue
      const slot = SLOTS[i]
      cutRingMatrix(slot, cutOf(birth, slot), jarY, g.matrix)
      g.matrixWorldNeedsUpdate = true
      g.visible = loading || birth.jarAway < 0.999
    }
  })

  return (
    <>
      {SLOTS.map((slot, i) => (
        <group
          key={slot}
          ref={(g) => {
            refs.current[i] = g
          }}
          matrixAutoUpdate={false}
        >
          <mesh geometry={ring} material={material} />
          <mesh geometry={sprue} material={material} />
        </group>
      ))}
    </>
  )
}

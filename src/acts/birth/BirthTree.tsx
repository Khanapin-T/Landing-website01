import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { treeMatrix } from '../../config/birth'
import { TreeShapes } from '../../scene/furnace/TreeShapes'
import { createRawGoldMaterial } from '../../scene/gold/rawGoldMaterial'
import { getAppState } from '../../story/appState'
import { birth } from './state'

/**
 * The raw tree without its rings (Act 7): trunk, funnel and the four trunk stubs in the act 6 end pose (the same
 * materials), so the hand-over at 14.0 is invisible. The rings are drawn by CutRings
 * and PolishRing. Goes up out of the frame (birth.treeUp) once all rings are off.
 */
export function BirthTree() {
  const material = useMemo(() => createRawGoldMaterial(), [])
  useEffect(
    () => () => {
      material.dispose()
    },
    [material],
  )

  const group = useRef<Group>(null)
  useFrame(() => {
    const g = group.current
    if (!g) return
    treeMatrix(birth.treeUp, g.matrix)
    g.matrixWorldNeedsUpdate = true
    g.visible = getAppState().phase === 'loading' || birth.treeUp < 0.999
  })

  return (
    <group ref={group} matrixAutoUpdate={false}>
      <TreeShapes material={material} rings={false} />
    </group>
  )
}

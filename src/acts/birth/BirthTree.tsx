import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { treeMatrix } from '../../config/birth'
import { TreeShapes } from '../../scene/furnace/TreeShapes'
import { createRawTreeMaterials } from '../../scene/gold/rawGoldMaterial'
import { getAppState } from '../../story/appState'
import { birth } from './state'

/**
 * The raw tree without its rings (Act 7): trunk, funnel and the four trunk stubs in the act 6 end pose (the same
 * materials and dirt seeds as RawTree), so the hand-over at 14.0 is invisible. The rings are drawn by CutRings
 * and PolishRing. Goes up out of the frame (birth.treeUp) once all rings are off.
 */
export function BirthTree() {
  // Same seeds in Act 6 (RawTree) and Act 7 (BirthTree): the tree keeps its dirt pattern across the hand-over.
  const mats = useMemo(() => createRawTreeMaterials(), [])
  useEffect(
    () => () => {
      mats.tree.dispose()
      for (const m of mats.slots) m.dispose()
    },
    [mats],
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
      <TreeShapes material={mats.tree} slotMaterials={mats.slots} rings={false} />
    </group>
  )
}

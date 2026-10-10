import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { rawTreeMatrix } from '../../config/water'
import { TreeShapes } from '../../scene/furnace/TreeShapes'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { createRawTreeMaterials } from '../../scene/gold/rawGoldMaterial'
import { water } from './state'

/**
 * The raw cast tree (Act 6): the tree shapes in matte as-cast gold with the post-casting dirt, shown once the investment has dissolved
 * (story.flask.wash). It sits in the flask frame, slides out of the funnel end, then stands upright in the
 * foreground (config/water.ts rawTreeMatrix). It stays as the end state for act 7.
 */
export function RawTree() {
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
    rawTreeMatrix(story.flask, water, g.matrix)
    g.matrixWorldNeedsUpdate = true
    g.visible = getAppState().phase === 'loading' || story.flask.wash > 0.5
  })

  return (
    <group ref={group} matrixAutoUpdate={false}>
      <TreeShapes material={mats.tree} slotMaterials={mats.slots} />
    </group>
  )
}

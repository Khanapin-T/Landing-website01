import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { rawTreeMatrix } from '../../config/water'
import { TreeShapes } from '../../scene/furnace/TreeShapes'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { createRawGoldMaterial } from './rawGoldMaterial'
import { water } from './state'

/**
 * The raw cast tree (Act 6): the tree shapes in matte as-cast gold, shown once the investment has dissolved
 * (story.flask.wash). It sits in the flask frame, slides out of the funnel end, then stands upright in the
 * foreground (config/water.ts rawTreeMatrix). It stays as the end state for act 7.
 */
export function RawTree() {
  const material = useMemo(() => createRawGoldMaterial(false), [])
  const trunk = useMemo(() => createRawGoldMaterial(true), [])
  useEffect(
    () => () => {
      material.dispose()
      trunk.dispose()
    },
    [material, trunk],
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
      <TreeShapes material={material} trunkMaterial={trunk} />
    </group>
  )
}

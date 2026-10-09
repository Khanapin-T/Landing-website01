import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { cavityAlpha } from './cavityAlpha'
import { TreeShapes } from './TreeShapes'
import { createXrayMaterial } from './xrayMaterial'

const CAVITY_COLOR = new THREE.Color(0.55, 1.3, 1.6)

/**
 * The hollow the burned tree leaves in the investment: the same shapes as the tree (trunk, four rings with their
 * sprues, the funnel) drawn as a glowing fresnel outline in the flask frame (mount it inside the flask rig). Visible
 * only in X-ray, after the burn (cavityAlpha). In Act 5 it shows the not yet filled part of the hollow.
 */
export function Cavity() {
  const { material, uniforms } = useMemo(() => createXrayMaterial(CAVITY_COLOR, { power: 1.6, base: 0.12, pushBack: true }), [])
  useEffect(() => () => material.dispose(), [material])

  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    const a = cavityAlpha(story.flask.xray, story.flask.burn)
    uniforms.uAlpha.value = a
    if (group.current) group.current.visible = getAppState().phase === 'loading' || a > 0.001
  })

  return (
    <group ref={group}>
      <TreeShapes material={material} />
    </group>
  )
}

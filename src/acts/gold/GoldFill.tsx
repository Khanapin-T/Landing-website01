import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLIP } from '../../config/fire'
import { fillFrontY, goldFillVisible, goldGlow } from '../../config/gold'
import { TreeShapes } from '../../scene/furnace/TreeShapes'
import { heatColor } from '../../scene/furnace/heat'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { createGoldMaterial, goldFillUniforms } from './goldMaterial'

const white: [number, number, number] = [0, 0, 0]

/**
 * The solid gold copy of the tree and funnel that fills from the bottom up (in the world) behind the molten stream. Under a fixed flip transform
 * (Rz(pi) about the flask pivot = the flask frame while the flask is flipped, which it is for all of Act 5). Visible
 * only while filling or full and X-ray is on (the opaque flask hides it afterwards), and while loading so Precompile
 * compiles it.
 */
export function GoldFill() {
  const material = useMemo(() => createGoldMaterial(), [])
  useEffect(() => () => material.dispose(), [material])

  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    const { fill, cool } = story.flask
    goldFillUniforms.uFillY.value = fillFrontY(fill)
    heatColor(1, white)
    const k = goldGlow(fill, cool)
    material.emissive.setRGB(white[0] * k, white[1] * k, white[2] * k)
    if (group.current) group.current.visible = getAppState().phase === 'loading' || goldFillVisible(story.flask)
  })

  return (
    <group ref={group} position-y={2 * FLIP.pivotY} rotation-z={Math.PI}>
      <TreeShapes material={material} />
    </group>
  )
}

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { getAppState } from '../../story/appState'
import { mold } from './state'
import { TAPE_RENDER_ORDER, createTapeMaterial } from './tapeMaterial'

const { innerRadius, wall, bottomY, height } = MOLD.flask
/** Just outside the steel so the tape never z-fights with the flask wall. */
const RADIUS = innerRadius + wall + 0.012

/**
 * Tape wrapped around the flask, in flask-local spinning space (a child of the spinner group; MoldScene applies
 * tapeSpin). Opaque green tape: two halves share one open cylinder, back faces first (seen through the flask holes), front faces last.
 */
export function Tape() {
  const geometry = useMemo(() => new THREE.CylinderGeometry(RADIUS, RADIUS, height, 96, 1, true), [])
  const back = useMemo(() => createTapeMaterial('back'), [])
  const front = useMemo(() => createTapeMaterial('front'), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => back.material.dispose(), [back])
  useEffect(() => () => front.material.dispose(), [front])

  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    back.uniforms.uProgress.value = mold.tape
    front.uniforms.uProgress.value = mold.tape
    if (ref.current) ref.current.visible = getAppState().phase === 'loading' || mold.tape > 0.001
  })

  // Starts visible: Precompile (traverseVisible) runs before the first frame sets the real value.
  return (
    <group ref={ref} position={[0, bottomY + height / 2, 0]}>
      <mesh geometry={geometry} material={back.material} renderOrder={TAPE_RENDER_ORDER.back} />
      <mesh geometry={geometry} material={front.material} renderOrder={TAPE_RENDER_ORDER.front} />
    </group>
  )
}

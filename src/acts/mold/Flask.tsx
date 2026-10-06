import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { FLASK_RADIUS, RIM, createFlaskMaterial, createSteelMaterial, flangeProfile } from './flaskMaterial'

const { bottomY, height } = MOLD.flask
/**
 * Layer order: every flask part is opaque, so it draws in the opaque pass before all the transparent layers of the
 * plan's layer table (tape, investment, bubbles), which depth-test against it and show only through the holes.
 * renderOrder stays at the default 0 so three sorts the steel front to back with the other opaque objects.
 */

/**
 * The perforated steel flask in flask-local space at rest (axis = world Y). The parent group in MoldScene applies
 * the descent and the spin. The shell is drawn twice from one open cylinder: the inner wall (back side) and the
 * outer wall (front side); the flange with its neck and the rolled rim at the top are plain brushed steel.
 */
export function Flask() {
  const shell = useMemo(() => new THREE.CylinderGeometry(FLASK_RADIUS, FLASK_RADIUS, height, 64, 1, true), [])
  const flange = useMemo(() => new THREE.LatheGeometry(flangeProfile().map(([x, y]) => new THREE.Vector2(x, y)), 96), [])
  const rim = useMemo(() => new THREE.TorusGeometry(FLASK_RADIUS, RIM.tube, 10, 64), [])
  const back = useMemo(() => createFlaskMaterial('back'), [])
  const front = useMemo(() => createFlaskMaterial('front'), [])
  const steel = useMemo(() => createSteelMaterial(), [])

  useEffect(
    () => () => {
      shell.dispose()
      flange.dispose()
      rim.dispose()
      back.material.dispose()
      front.material.dispose()
      steel.dispose()
    },
    [shell, flange, rim, back, front, steel],
  )

  return (
    <group>
      <mesh geometry={shell} material={back.material} position={[0, bottomY + height / 2, 0]} />
      <mesh geometry={shell} material={front.material} position={[0, bottomY + height / 2, 0]} />
      <mesh geometry={flange} material={steel} />
      <mesh geometry={rim} material={steel} position={[0, bottomY + height, 0]} rotation-x={Math.PI / 2} />
    </group>
  )
}

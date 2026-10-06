import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { FLANGE, FLASK_RADIUS, RIM, createFlaskMaterial, createSteelMaterial } from './flaskMaterial'

const { bottomY, height } = MOLD.flask
/** Transparent layer order (see the plan's layer table). */
const ORDER_BACK = 11
const ORDER_FRONT = 14

/** Flange cross-section: a flat steel band around the flask foot with small chamfers (lathe profile, outward faces). */
function createFlangeGeometry(): THREE.LatheGeometry {
  const ri = FLASK_RADIUS - 0.004
  const ro = FLASK_RADIUS + FLANGE.overhang
  const y0 = bottomY
  const y1 = bottomY + FLANGE.height
  const b = 0.012
  const v = (x: number, y: number) => new THREE.Vector2(x, y)
  return new THREE.LatheGeometry(
    [v(ri, y0 + b), v(ri + b, y0), v(ro - b, y0), v(ro, y0 + b), v(ro, y1 - b), v(ro - b, y1), v(ri + b, y1), v(ri, y1 - b), v(ri, y0 + b)],
    64,
  )
}

/**
 * The perforated steel flask in flask-local space at rest (axis = world Y). The parent group in MoldScene applies
 * the descent and the spin. The shell is drawn twice from one open cylinder: the inner back half (opaque) and the
 * ghosted front half; the flange and the top rim are plain opaque steel.
 */
export function Flask() {
  const shell = useMemo(() => new THREE.CylinderGeometry(FLASK_RADIUS, FLASK_RADIUS, height, 64, 1, true), [])
  const flange = useMemo(() => createFlangeGeometry(), [])
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
      <mesh geometry={shell} material={back.material} position={[0, bottomY + height / 2, 0]} renderOrder={ORDER_BACK} />
      <mesh geometry={shell} material={front.material} position={[0, bottomY + height / 2, 0]} renderOrder={ORDER_FRONT} />
      <mesh geometry={flange} material={steel} />
      <mesh geometry={rim} material={steel} position={[0, bottomY + height, 0]} rotation-x={Math.PI / 2} />
    </group>
  )
}

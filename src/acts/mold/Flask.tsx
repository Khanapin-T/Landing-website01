import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import {
  FLASK_INNER_RADIUS,
  FLASK_RADIUS,
  INNER_SHELL,
  SHELL,
  createBoreGeometry,
  createFlaskMaterial,
  createSteelMaterial,
  flangeProfile,
  footProfile,
  rimProfile,
} from './flaskMaterial'

const { bottomY, height } = MOLD.flask
/** Flask-local origin (middle of the flask) in the Flask group: the shells and the bores are built around it. */
const MIDDLE_Y = bottomY + height / 2
const SEGMENTS = 96
/**
 * Layer order: every flask part is opaque, so it draws in the opaque pass before all the transparent layers of the
 * plan's layer table (tape, investment, bubbles), which depth-test against it and show only through the holes.
 * renderOrder stays at the default 0 so three sorts the steel front to back with the other opaque objects.
 */

/**
 * Open cylinder at radius r over a flask-local span (SHELL for the outer surface: flask bottom to under the rolled
 * rim edges; INNER_SHELL for the inner surface, which runs on down through the foot).
 */
function createShell(r: number, span: { height: number; center: number }): THREE.CylinderGeometry {
  const g = new THREE.CylinderGeometry(r, r, span.height, SEGMENTS, 1, true)
  g.translate(0, span.center, 0)
  return g
}

const lathe = (pts: [number, number][]) =>
  new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    SEGMENTS,
  )

/**
 * The perforated steel flask in flask-local space at rest (axis = world Y). The parent group in MoldScene applies
 * the descent and the spin. A thick tube: the outer surface (front side) and the inner surface (back side, seen
 * through the top opening and the holes) with the same radial bores cut out, a short steel tube in every bore that
 * shows the wall thickness, the flat rolled rim on top, the flange and neck on the flask bottom and the foot tube
 * hanging below the flange (plain brushed steel, same radii as the tube; it stands in the rubber cup).
 */
export function Flask() {
  const outer = useMemo(() => createShell(FLASK_RADIUS, SHELL), [])
  const inner = useMemo(() => createShell(FLASK_INNER_RADIUS, INNER_SHELL), [])
  const bores = useMemo(() => createBoreGeometry(), [])
  const flange = useMemo(() => lathe(flangeProfile()), [])
  const foot = useMemo(() => lathe(footProfile()), [])
  const rim = useMemo(() => lathe(rimProfile()), [])
  const back = useMemo(() => createFlaskMaterial('back'), [])
  const front = useMemo(() => createFlaskMaterial('front'), [])
  const steel = useMemo(() => createSteelMaterial(), [])

  useEffect(
    () => () => {
      outer.dispose()
      inner.dispose()
      bores.dispose()
      flange.dispose()
      foot.dispose()
      rim.dispose()
      back.material.dispose()
      front.material.dispose()
      steel.dispose()
    },
    [outer, inner, bores, flange, foot, rim, back, front, steel],
  )

  return (
    <group>
      <mesh geometry={inner} material={back.material} position={[0, MIDDLE_Y, 0]} />
      <mesh geometry={outer} material={front.material} position={[0, MIDDLE_Y, 0]} />
      <mesh geometry={bores} material={steel} position={[0, MIDDLE_Y, 0]} />
      <mesh geometry={flange} material={steel} />
      <mesh geometry={foot} material={steel} />
      <mesh geometry={rim} material={steel} />
    </group>
  )
}

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import {
  FLASK_INNER_RADIUS,
  FLASK_RADIUS,
  SHELL,
  createBoreGeometry,
  createFlaskMaterial,
  createSteelMaterial,
  flangeProfile,
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

/** Open cylinder at radius r, spanning SHELL in flask-local space (stops under the rolled rim edges). */
function createShell(r: number): THREE.CylinderGeometry {
  const g = new THREE.CylinderGeometry(r, r, SHELL.height, SEGMENTS, 1, true)
  g.translate(0, SHELL.center, 0)
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
 * shows the wall thickness, the flat rolled rim on top, and the foot, flange and neck at the bottom (plain brushed
 * steel).
 */
export function Flask() {
  const outer = useMemo(() => createShell(FLASK_RADIUS), [])
  const inner = useMemo(() => createShell(FLASK_INNER_RADIUS), [])
  const bores = useMemo(() => createBoreGeometry(), [])
  const flange = useMemo(() => lathe(flangeProfile()), [])
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
      rim.dispose()
      back.material.dispose()
      front.material.dispose()
      steel.dispose()
    },
    [outer, inner, bores, flange, rim, back, front, steel],
  )

  return (
    <group>
      <mesh geometry={inner} material={back.material} position={[0, MIDDLE_Y, 0]} />
      <mesh geometry={outer} material={front.material} position={[0, MIDDLE_Y, 0]} />
      <mesh geometry={bores} material={steel} position={[0, MIDDLE_Y, 0]} />
      <mesh geometry={flange} material={steel} />
      <mesh geometry={rim} material={steel} />
    </group>
  )
}

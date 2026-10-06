import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { getAppState } from '../../story/appState'
import { FLASK_RADIUS } from './flaskMaterial'
import { mold } from './state'

const { baseTopY } = MOLD
const { radius, thickness, coneRadius, coneHeight, dropOffset } = MOLD.base
/**
 * Shallow recess under the flask body (its radius = the body radius + a small margin), so the flange plate rests on
 * the flat lip around it; the base radius (MOLD.base.radius) is wider than the flange, so the black lip shows all
 * around. CHAMFER = the outer edges.
 */
const RECESS_DEPTH = 0.035
const RECESS_RADIUS = FLASK_RADIUS + 0.02
const CHAMFER = 0.03

/**
 * Lathe profile from the bottom center outward, up the side, inward across the top and up the cone to its tip
 * (that order gives outward-facing triangles). LatheGeometry averages the normals of the two segments meeting at a
 * point; a point given twice puts a zero-length segment between them, so each side keeps its own normal: a hard edge.
 */
function createBaseGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = []
  const soft = (x: number, y: number) => pts.push(new THREE.Vector2(x, y))
  const hard = (x: number, y: number) => {
    soft(x, y)
    soft(x, y)
  }
  const bottomY = baseTopY - thickness
  const recessY = baseTopY - RECESS_DEPTH
  const coneTopY = baseTopY + coneHeight
  const coneRise = coneTopY - recessY

  soft(0, bottomY)
  hard(radius - CHAMFER, bottomY)
  hard(radius, bottomY + CHAMFER)
  hard(radius, baseTopY - CHAMFER)
  hard(radius - CHAMFER, baseTopY)
  hard(RECESS_RADIUS + 0.03, baseTopY)
  hard(RECESS_RADIUS, recessY)
  hard(coneRadius, recessY)
  // Crucible former: a flared cone, steeper toward the top where the trunk starts.
  soft(coneRadius * 0.75, recessY + coneRise * 0.24)
  soft(coneRadius * 0.53, recessY + coneRise * 0.55)
  hard(MOLD.trunk.radius * 1.4, coneTopY)
  soft(0, coneTopY)
  return new THREE.LatheGeometry(pts, 64)
}

/** Black rubber base with the crucible-former cone. Rises from below the frame with mold.base and drops away after. */
export function RubberBase() {
  const geometry = useMemo(() => createBaseGeometry(), [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15181c', roughness: 0.85, metalness: 0 }), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const m = ref.current
    if (!m) return
    m.position.y = (1 - mold.base) * dropOffset
    m.visible = getAppState().phase === 'loading' || mold.base > 0.001
  })

  // Starts visible: Precompile (traverseVisible) runs before the first frame sets the real value.
  return <mesh ref={ref} geometry={geometry} material={material} />
}

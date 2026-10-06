import * as THREE from 'three'
import { MOLD } from '../../config/mold'

const TRUNK_TOP_SCALE = 0.85

/** The wax trunk, origin at its bottom (place it at y = MOLD.trunk.bottomY). */
export function createTrunkGeometry(): THREE.CylinderGeometry {
  const { radius, bottomY, topY } = MOLD.trunk
  const g = new THREE.CylinderGeometry(radius * TRUNK_TOP_SCALE, radius, topY - bottomY, 20, 1, false)
  g.translate(0, (topY - bottomY) / 2, 0)
  return g
}

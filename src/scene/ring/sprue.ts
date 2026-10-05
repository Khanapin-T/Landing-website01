import * as THREE from 'three'
import { PRINT, RING_HALF } from '../../config/print'

/** Overlap into the shank so the joint has no gap. */
const OVERLAP = 0.02

/** The casting sprue in ring-local space (upright ring): a cylinder under the shank bottom. */
export function createSprueGeometry(): THREE.BufferGeometry {
  const { length, radius } = PRINT.sprue
  const h = length + OVERLAP
  const g = new THREE.CylinderGeometry(radius, radius, h, 24, 1, false)
  g.translate(0, -RING_HALF - length + h / 2, 0)
  return g
}

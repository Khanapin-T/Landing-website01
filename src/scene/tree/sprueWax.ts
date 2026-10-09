import * as THREE from 'three'
import { PRINT } from '../../config/print'

/**
 * Red wax continuation of a ring sprue on the casting tree: the same cylinder, `length` longer, from the tip plane
 * (where the sprue meets the trunk) further along the sprue axis into the trunk. It fills the gap between the flat
 * sprue end and the round trunk. `overlap` = a hair above the tip plane so the joint has no gap.
 */
export const SPRUE_WAX = { length: 0.12, overlap: 0.01 } as const

/** In the ring-local frame of the sprue (Y along it), origin at the tip plane; mount it at the sprue tip. */
export function createSprueWaxGeometry(): THREE.CylinderGeometry {
  const { length, overlap } = SPRUE_WAX
  const h = length + overlap
  const g = new THREE.CylinderGeometry(PRINT.sprue.radius, PRINT.sprue.radius, h, 24, 1, false)
  g.translate(0, -length + h / 2, 0)
  return g
}

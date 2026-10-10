import * as THREE from 'three'
import { PRINT, RING_HALF } from '../../config/print'

/** The sprue tip (its lowest point) in the ring-local frame: where the wax stub starts. */
export const SPRUE_TIP_LOCAL = [0, -(RING_HALF + PRINT.sprue.length), 0] as const

/**
 * Red wax continuation of a ring sprue on the casting tree: the same cylinder, `length` longer, from the tip plane
 * (where the sprue meets the trunk) further along the sprue axis into the trunk. It fills the gap between the flat
 * sprue end and the round trunk. `overlap` = a hair above the tip plane so the joint has no gap. The gold fill and
 * the cavity outline reuse it (TreeShapes), so the cast metal has the same transition.
 */
export const SPRUE_WAX = { length: 0.12, overlap: 0.01 } as const

/** In the frame of the sprue (Y along it), origin at the tip plane; mount it at the sprue tip. */
export function createSprueWaxGeometry(): THREE.CylinderGeometry {
  const { length, overlap } = SPRUE_WAX
  const h = length + overlap
  const g = new THREE.CylinderGeometry(PRINT.sprue.radius, PRINT.sprue.radius, h, 24, 1, false)
  g.translate(0, -length + h / 2, 0)
  return g
}

/** Flight value from which ring k's wax stub grows (it is then on its final slide, src/config/assembly.ts). */
export const STUB_FROM = 0.85

/** 0..1 growth of ring k's wax stub: it grows from the sprue tip during the last part of the ring's flight (its slide). */
export function stubGrowth(flight: number): number {
  return Math.min(Math.max((flight - STUB_FROM) / (1 - STUB_FROM), 0), 1)
}

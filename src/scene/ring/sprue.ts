import * as THREE from 'three'
import { PRINT, RING_HALF } from '../../config/print'

/** Overlap into the shank so the joint has no gap. */
const OVERLAP = 0.02

/**
 * Flare at the trunk end of the sprue (a concave fillet, like a casting sprue base).
 * - length: how far above the tip plane the radius starts to grow
 * - radiusFactor: widest radius R = radiusFactor * straight radius, reached at the tip plane
 * - overshoot: R continues this far PAST the tip plane so the flare sinks into the trunk (must stay < trunk radius)
 */
export const SPRUE_FLARE = { length: 0.14, radiusFactor: 1.8, overshoot: 0.05 }

const RADIAL_SEGMENTS = 24
const FLARE_STEPS = 12

/** The casting sprue in ring-local space (upright ring): one lathe body under the shank bottom with a flared trunk end. */
export function createSprueGeometry(): THREE.BufferGeometry {
  const { length, radius } = PRINT.sprue
  const { length: flareLength, radiusFactor, overshoot } = SPRUE_FLARE
  const wide = radius * radiusFactor
  const top = -RING_HALF + OVERLAP
  const tip = -RING_HALF - length
  const flareTop = tip + flareLength

  // Profile from the top cap down to the bottom cap (x = radius, y = height).
  const profile: THREE.Vector2[] = [new THREE.Vector2(0, top), new THREE.Vector2(radius, top)]
  for (let i = 0; i <= FLARE_STEPS; i++) {
    const t = i / FLARE_STEPS
    const ease = 1 - Math.cos((t * Math.PI) / 2) // tangent to the straight part, steepest at the tip plane
    profile.push(new THREE.Vector2(radius + (wide - radius) * ease, flareTop - flareLength * t))
  }
  profile.push(new THREE.Vector2(wide, tip - overshoot), new THREE.Vector2(0, tip - overshoot))

  const g = new THREE.LatheGeometry(profile, RADIAL_SEGMENTS)
  g.deleteAttribute('uv')
  return g
}

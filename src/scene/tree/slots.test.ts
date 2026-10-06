import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { FLANGE_RADIUS } from '../../acts/mold/flaskMaterial'
import { MOLD, TREE_SLOTS } from '../../config/mold'
import { PRINT, RING_HALF } from '../../config/print'
import { RING_HALF_EXTENTS, ringBoxCorners, slotPose } from './slots'

const MARGIN = 0.12
const REACH_MAX = 0.95
const TRUNK_CLEARANCE = 0.1
const POUR_CLEARANCE = 0.15
const RING_GAP = 0.06
/** Ring-local height below which the ring counts as the sprue end (it may sit against the trunk and its opposite twin). */
const SPRUE_END_Y = -0.3
const TAU = Math.PI * 2
const angleDiff = (a: number, b: number) => Math.abs((((a - b + Math.PI) % TAU) + TAU) % TAU - Math.PI)

const ringNormal = (i: number) => new Vector3(0, 0, 1).applyQuaternion(slotPose(i).quaternion)

/**
 * A proxy of the real ring: points on its shell. The ring is an annulus in the ring-local XY plane (ellipse half axes
 * 0.474 x 0.5), so we keep grid points whose elliptic radius is 0.8..1.0, at 5 z layers across the +-0.208 thickness.
 * Spacing 0.045, about 665 points per ring. It approximates the real mesh (the OBB is far too conservative: its corners
 * are empty space). Points below `minLocalY` (the sprue end) are left out.
 */
const SHELL_LOCAL: Vector3[] = []
for (let x = -RING_HALF_EXTENTS.x; x <= RING_HALF_EXTENTS.x + 1e-9; x += 0.045)
  for (let y = -RING_HALF_EXTENTS.y; y <= RING_HALF_EXTENTS.y + 1e-9; y += 0.045) {
    const r = Math.hypot(x / RING_HALF_EXTENTS.x, y / RING_HALF_EXTENTS.y)
    if (r < 0.8 || r > 1) continue
    for (const k of [-1, -0.5, 0, 0.5, 1]) SHELL_LOCAL.push(new Vector3(x, y, k * RING_HALF_EXTENTS.z))
  }

function ringShell(i: number, minLocalY = -Infinity): Vector3[] {
  const { position, quaternion } = slotPose(i)
  return SHELL_LOCAL.filter((v) => v.y >= minLocalY).map((v) => v.clone().applyQuaternion(quaternion).add(position))
}

/** Smallest distance between the shell points of two different rings. */
function shellGap(i: number, j: number): number {
  const a = ringShell(i, SPRUE_END_Y)
  const b = ringShell(j, SPRUE_END_Y)
  let min = Infinity
  for (const p of a) for (const q of b) min = Math.min(min, p.distanceToSquared(q))
  return Math.sqrt(min)
}

/** Distance from a point to the trunk surface (the cylinder between bottomY and topY). Negative inside. */
function trunkDistance(v: Vector3): number {
  const cy = Math.min(Math.max(v.y, MOLD.trunk.bottomY), MOLD.trunk.topY)
  return Math.hypot(Math.hypot(v.x, v.z), v.y - cy) - MOLD.trunk.radius
}

describe('tree slots', () => {
  it('puts each sprue tip on the trunk surface at the slot height', () => {
    TREE_SLOTS.forEach((s, i) => {
      const { position, quaternion } = slotPose(i)
      const tip = new Vector3(0, -(RING_HALF + PRINT.sprue.length), 0).applyQuaternion(quaternion).add(position)
      expect(Math.hypot(tip.x, tip.z)).toBeCloseTo(MOLD.trunk.radius)
      expect(tip.y).toBeCloseTo(s.y)
    })
  })

  it('makes the trunk 40% of the flask height and touches the upper sprue tips to its top end', () => {
    expect(MOLD.trunk.topY).toBeCloseTo(MOLD.flask.bottomY + 0.4 * MOLD.flask.height)
    expect(TREE_SLOTS[0].y).toBeCloseTo(MOLD.trunk.topY - 0.04)
    expect(TREE_SLOTS[1].y).toBeCloseTo(MOLD.trunk.topY - 0.04)
    expect(TREE_SLOTS[2].y).toBeLessThan(TREE_SLOTS[0].y)
    expect(TREE_SLOTS[3].y).toBeLessThan(TREE_SLOTS[1].y)
  })

  it('puts the hero ring in slot 0 at yaw + 180 deg and the branches in an X (45, 135, 225, 315 deg)', () => {
    expect(angleDiff(TREE_SLOTS[0].azimuth, MOLD.yaw + Math.PI)).toBeLessThan(1e-9)
    const azimuths = TREE_SLOTS.map((s) => s.azimuth)
    for (const target of [45, 135, 225, 315])
      expect(azimuths.some((a) => angleDiff(a, (target * Math.PI) / 180) < 1e-9)).toBe(true)
  })

  it('keeps the ring planes of a pair parallel in plan view and tilted the same amount (a V)', () => {
    // Opposite branches with an outward tilt cannot have |n1 . n2| = 1 (the V leans). The planes are parallel in plan view
    // (the horizontal parts of the normals are collinear) and both lean by the same angle.
    for (const [i, j] of [
      [0, 1],
      [2, 3],
    ] as const) {
      const n1 = ringNormal(i)
      const n2 = ringNormal(j)
      const h1 = new Vector3(n1.x, 0, n1.z).normalize()
      const h2 = new Vector3(n2.x, 0, n2.z).normalize()
      expect(Math.abs(h1.dot(h2))).toBeCloseTo(1, 6)
      expect(n1.y).toBeCloseTo(n2.y, 6)
      expect(TREE_SLOTS[i].tilt).toBeCloseTo(TREE_SLOTS[j].tilt)
    }
  })

  it('never lets the trunk axis show through a ring hole (rings stand, the trunk clears the ring away from the sprue end)', () => {
    TREE_SLOTS.forEach((_, i) => {
      expect(Math.abs(ringNormal(i).y)).toBeLessThan(0.6)
      // Every ring shell point above the sprue end (ring-local y >= -0.3) stays at least 0.1 off the trunk surface.
      for (const p of ringShell(i, SPRUE_END_Y)) expect(trunkDistance(p)).toBeGreaterThanOrEqual(TRUNK_CLEARANCE)
    })
  })

  it('keeps every ring inside the flask (reach <= 0.95), above the bottom and under the investment', () => {
    TREE_SLOTS.forEach((_, i) => {
      for (const c of ringBoxCorners(i)) {
        expect(Math.hypot(c.x, c.z)).toBeLessThanOrEqual(MOLD.flask.innerRadius - MARGIN)
        expect(Math.hypot(c.x, c.z)).toBeLessThanOrEqual(REACH_MAX)
        expect(c.y).toBeGreaterThanOrEqual(MOLD.flask.bottomY + MARGIN)
        expect(c.y).toBeLessThanOrEqual(MOLD.investment.topY - MARGIN)
      }
    })
  })

  it('keeps the pour stream clear of every ring box', () => {
    const line = new Vector3(
      MOLD.pour.radius * Math.cos(MOLD.pour.azimuth),
      0,
      -MOLD.pour.radius * Math.sin(MOLD.pour.azimuth),
    )
    TREE_SLOTS.forEach((_, i) => {
      for (const c of ringBoxCorners(i)) expect(Math.hypot(c.x - line.x, c.z - line.z)).toBeGreaterThanOrEqual(POUR_CLEARANCE)
    })
    expect(MOLD.pour.radius).toBeLessThan(MOLD.flask.innerRadius - MARGIN)
    // The rubber cup wraps the foot (same radius as the tube) with a real rim and stays under the flange.
    expect(MOLD.base.radius).toBeGreaterThanOrEqual(MOLD.flask.innerRadius + MOLD.flask.wall + 0.3)
    expect(MOLD.base.radius).toBeLessThan(FLANGE_RADIUS)
  })

  it('keeps the rings of different slots 0.06 apart (shell-point proxy of the real rings, sprue ends excluded)', () => {
    // The sprue ends are left out: opposite rings of a pair meet at the trunk there by design.
    for (let i = 0; i < TREE_SLOTS.length; i++)
      for (let j = i + 1; j < TREE_SLOTS.length; j++) expect(shellGap(i, j)).toBeGreaterThanOrEqual(RING_GAP)
  })
})

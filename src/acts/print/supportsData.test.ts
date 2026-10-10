import { describe, expect, it } from 'vitest'
import { PRINT, PRINT_SPOTS, RING_HALF, printPose } from '../../config/print'
import { RING_HALF_EXTENTS } from '../../scene/tree/slots'
import { mulberry32 } from '../../lib/random'
import { PLATE_FRAME_Y, buildSupportGeometry, computeSupports, sampleSupportPoints, supportRadii, type CastUp } from './supportsData'

// A stand-in ring: the lower half of a sphere of radius RING_HALF around the ring centre (ring-local, upright), so the
// shank bottom is at -RING_HALF like the real one.
const castSphere: CastUp = (x, z) => {
  const r2 = RING_HALF * RING_HALF - x * x - z * z
  return r2 < 0 ? null : -Math.sqrt(r2)
}

describe('print supports', () => {
  const supports = computeSupports(castSphere, mulberry32(3))

  it('keeps long supports (past the narrow shank) only in front of and behind it, 5-10 per side, spread across', () => {
    // Every ray reaches deep: only the front and back rows may keep them.
    const deep = computeSupports(() => 0, mulberry32(3))
    const { sideMinZ, sideCount } = PRINT.supports
    for (const sign of [-1, 1]) {
      const side = deep.filter((s) => Math.sign(s.z) === sign)
      expect(side.length).toBeGreaterThanOrEqual(5)
      expect(side.length).toBeLessThanOrEqual(Math.min(sideCount, 10))
      for (const s of side) expect(Math.abs(s.z)).toBeGreaterThanOrEqual(sideMinZ)
      const xs = side.map((s) => s.x)
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(PRINT.supports.spanX)
    }
    expect(deep.length).toBe(deep.filter((s) => Math.abs(s.z) >= sideMinZ).length)
  })

  it('makes many supports, none on the sprue', () => {
    expect(supports.length).toBeGreaterThanOrEqual(30)
    const { sprueClear } = PRINT.supports
    for (const s of supports) expect(Math.abs(s.x) < sprueClear && Math.abs(s.z) < sprueClear).toBe(false)
  })

  it('runs each support from the plate down to the ring surface (print frame: upside down), biting into it', () => {
    expect(PLATE_FRAME_Y).toBeCloseTo(RING_HALF + PRINT.sprue.length, 9)
    for (const s of supports) {
      expect(s.plateY).toBeCloseTo(PLATE_FRAME_Y, 9)
      // Upside down: x mirrors, the hit's local y mirrors; the tip goes `bite` deeper into the part.
      const hit = castSphere(-s.x, s.z)!
      expect(s.contactY).toBeCloseTo(-hit - PRINT.supports.bite, 9)
      expect(s.plateY - s.contactY).toBeGreaterThanOrEqual(PRINT.supports.minLength)
      // Long ones only in front of and behind the ring.
      if (s.plateY - s.contactY > PRINT.supports.maxLength + PRINT.supports.bite + 1e-9) {
        expect(Math.abs(s.z)).toBeGreaterThanOrEqual(PRINT.supports.sideMinZ)
      }
      expect(s.seed).toBeGreaterThanOrEqual(0)
      expect(s.seed).toBeLessThan(1)
    }
  })

  it('touches the plate exactly while printing (frame origin = the ring centre)', () => {
    // The supports' group is scaled by PRINT.scale like the ring.
    const p = printPose(0.4)
    expect(p.ringY + PLATE_FRAME_Y * PRINT.scale).toBeCloseTo(p.plateY, 9)
  })

  it('makes the front and back (long) supports twice as thick, tapering to the old thickness at the ring', () => {
    const deep = computeSupports(() => 0, mulberry32(3))
    expect(deep.every((s) => s.side)).toBe(true)
    expect(supportRadii(deep[0])).toEqual({ column: 2 * PRINT.supports.radius, contact: PRINT.supports.radius })
    const short = supports.find((s) => !s.side)!
    expect(supportRadii(short)).toEqual({ column: PRINT.supports.radius, contact: PRINT.supports.tipRadius })
  })

  it('builds one geometry with a seed per vertex, inside the supports', () => {
    const g = buildSupportGeometry(supports)
    const pos = g.getAttribute('position')
    const seed = g.getAttribute('aSeed')
    expect(seed.count).toBe(pos.count)
    const minY = Math.min(...supports.map((s) => s.contactY))
    for (let i = 0; i < pos.count; i++) {
      expect(pos.getY(i)).toBeGreaterThanOrEqual(minY - 1e-6)
      expect(pos.getY(i)).toBeLessThanOrEqual(PLATE_FRAME_Y + 1e-6)
    }
    g.dispose()
  })

  it('keeps each copy of the supports clear of its neighbours in the 2 x 2 grid (columns in x, rows in z)', () => {
    // The widest supports (every ray hits: deep and shallow stand-ins) with their feet, ring-local.
    for (const set of [supports, computeSupports(() => 0, mulberry32(3))]) {
      const reach = Math.max(...set.map((s) => Math.abs(s.x) + Math.max(PRINT.supports.baseRadius, supportRadii(s).column * 1.6)))
      const reachZ = Math.max(...set.map((s) => Math.abs(s.z) + Math.max(PRINT.supports.baseRadius, supportRadii(s).column * 1.6)))
      const halfX = Math.max(reach, RING_HALF_EXTENTS.x) * PRINT.scale
      const halfZ = Math.max(reachZ, RING_HALF_EXTENTS.z) * PRINT.scale
      for (let i = 0; i < PRINT_SPOTS.length; i++)
        for (let j = i + 1; j < PRINT_SPOTS.length; j++) {
          const a = PRINT_SPOTS[i]
          const b = PRINT_SPOTS[j]
          // Apart in x (the other column) or in z (the other row), by at least 0.2.
          const apart = Math.max(Math.abs(a.x - b.x) - 2 * halfX, Math.abs(a.z - b.z) - 2 * halfZ)
          expect(apart, `rings ${i}/${j}`).toBeGreaterThan(0.2)
        }
    }
  })

  it('samples points along the supports for the break-up', () => {
    const pts = sampleSupportPoints(supports, 20, mulberry32(4))
    expect(pts.count).toBe(supports.length * 20)
    const minY = Math.min(...supports.map((s) => s.contactY))
    for (let i = 0; i < pts.count; i++) {
      const y = pts.position[i * 3 + 1]
      expect(y).toBeLessThanOrEqual(PLATE_FRAME_Y + 1e-6)
      expect(y).toBeGreaterThanOrEqual(minY - 1e-6)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { PRINT, RING_HALF, printPose } from '../../config/print'
import { mulberry32 } from '../../lib/random'
import { PLATE_FRAME_Y, buildSupportGeometry, computeSupports, sampleSupportPoints, type CastUp } from './supportsData'

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
    const p = printPose(0.4)
    expect(p.ringY + PLATE_FRAME_Y).toBeCloseTo(p.plateY, 9)
  })

  it('builds one geometry with a centre and a seed per vertex, inside the supports', () => {
    const g = buildSupportGeometry(supports)
    const pos = g.getAttribute('position')
    const center = g.getAttribute('aCenter')
    const seed = g.getAttribute('aSeed')
    expect(center.count).toBe(pos.count)
    expect(seed.count).toBe(pos.count)
    const minY = Math.min(...supports.map((s) => s.contactY))
    for (let i = 0; i < pos.count; i++) {
      expect(pos.getY(i)).toBeGreaterThanOrEqual(minY - 1e-6)
      expect(pos.getY(i)).toBeLessThanOrEqual(PLATE_FRAME_Y + 1e-6)
    }
    g.dispose()
  })

  it('samples points along the supports for the break-up', () => {
    const pts = sampleSupportPoints(supports, 20, mulberry32(4))
    expect(pts.count).toBe(supports.length * 20)
    for (let i = 0; i < pts.count; i++) {
      const y = pts.position[i * 3 + 1]
      const cy = pts.center[i * 3 + 1]
      expect(y).toBeLessThanOrEqual(PLATE_FRAME_Y + 1e-6)
      expect(Math.abs(y - cy)).toBeLessThan(PLATE_FRAME_Y)
    }
  })
})

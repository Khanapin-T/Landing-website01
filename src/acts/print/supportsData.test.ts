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

  it('skips rays that would reach far into the part (beside the narrow shank)', () => {
    const deep = computeSupports(() => 0, mulberry32(3))
    expect(deep).toHaveLength(0)
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
      // Never through the ring: only short supports onto the near surface (+ the bite).
      expect(s.plateY - s.contactY).toBeLessThanOrEqual(PRINT.supports.maxLength + PRINT.supports.bite + 1e-9)
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

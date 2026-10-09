import { describe, expect, it } from 'vitest'
import { createSprueGeometry, SPRUE_FLARE } from './sprue'
import { PRINT, RING_HALF } from '../../config/print'
import { MOLD } from '../../config/mold'

const TIP_Y = -RING_HALF - PRINT.sprue.length

/** Max radius around the Y axis of the vertices within a height band. */
function radiusAt(g: ReturnType<typeof createSprueGeometry>, yMin: number, yMax: number): number {
  const pos = g.getAttribute('position')
  let r = 0
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    if (y >= yMin && y <= yMax) r = Math.max(r, Math.hypot(pos.getX(i), pos.getZ(i)))
  }
  return r
}

describe('sprue geometry', () => {
  it('reaches up into the shank and down past the tip plane by the overshoot', () => {
    const g = createSprueGeometry()
    g.computeBoundingBox()
    const b = g.boundingBox!
    expect(b.max.y).toBeGreaterThan(-RING_HALF)
    expect(b.max.y).toBeLessThan(-RING_HALF + 0.05)
    expect(b.min.y).toBeCloseTo(TIP_Y - SPRUE_FLARE.overshoot)
  })

  it('keeps the old radius on the straight part above the flare', () => {
    const g = createSprueGeometry()
    const flareTop = TIP_Y + SPRUE_FLARE.length
    expect(radiusAt(g, flareTop, Infinity)).toBeCloseTo(PRINT.sprue.radius)
  })

  it('widens to at least 1.7 times the straight radius (about the trunk width) at the tip plane and keeps it through the overshoot', () => {
    const g = createSprueGeometry()
    expect(radiusAt(g, TIP_Y - 1e-6, TIP_Y + 1e-6)).toBeGreaterThanOrEqual(1.7 * PRINT.sprue.radius)
    expect(radiusAt(g, TIP_Y - SPRUE_FLARE.overshoot - 1e-6, TIP_Y - SPRUE_FLARE.overshoot + 1e-6)).toBeGreaterThanOrEqual(
      1.7 * PRINT.sprue.radius,
    )
  })

  it('grows monotonically toward the tip', () => {
    const g = createSprueGeometry()
    const pos = g.getAttribute('position')
    // Side surface only: skip the cap centre vertices on the axis.
    const rows: { y: number; r: number }[] = []
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i))
      if (r > 1e-6) rows.push({ y: pos.getY(i), r })
    }
    rows.sort((a, b) => b.y - a.y) // from the shank down to the tip
    for (let i = 1; i < rows.length; i++) expect(rows[i].r).toBeGreaterThanOrEqual(rows[i - 1].r - 1e-6)
  })

  it('cannot poke out the far side of the trunk', () => {
    expect(SPRUE_FLARE.overshoot).toBeLessThan(MOLD.trunk.radius)
  })

  it('is one light mesh with positions and normals only', () => {
    const g = createSprueGeometry()
    expect(Object.keys(g.attributes).sort()).toEqual(['normal', 'position'])
    expect(g.getAttribute('position').count).toBeLessThan(3000)
  })
})

import { describe, expect, it } from 'vitest'
import { COILS } from '../../config/fire'
import { createHelixGeometry } from './helix'

const box = (g: ReturnType<typeof createHelixGeometry>) => {
  g.computeBoundingBox()
  return g.boundingBox!
}

describe('createHelixGeometry', () => {
  const radial = COILS.radialSegments
  const outer = COILS.coilRadius + COILS.tubeRadius

  it('is a spring along Y with the requested length', () => {
    const b = box(createHelixGeometry(4, 'y'))
    expect(b.max.y - b.min.y).toBeGreaterThan(4 - 2 * COILS.tubeRadius - 0.01)
    expect(b.max.y - b.min.y).toBeLessThan(4 + 2 * COILS.tubeRadius + 0.01)
    expect(b.max.x).toBeCloseTo(outer, 1)
    expect(b.max.z).toBeCloseTo(outer, 1)
  })

  it('lies along X when asked', () => {
    const b = box(createHelixGeometry(6, 'x'))
    expect(b.max.x - b.min.x).toBeGreaterThan(6 - 2 * COILS.tubeRadius - 0.01)
    expect(b.max.y).toBeCloseTo(outer, 1)
  })

  it('has one tube ring per segment (turns follow the pitch)', () => {
    const turns = Math.round(4 / COILS.pitch)
    const g = createHelixGeometry(4, 'y')
    expect(g.attributes.position.count).toBe((turns * COILS.stepsPerTurn + 1) * (radial + 1))
  })
})

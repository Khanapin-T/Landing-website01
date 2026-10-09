import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { COILS } from '../../config/fire'
import { coilPoint, createHairpinGeometry, hairpinBounds, hairpinPoint, hairpinTotal } from './helix'

const L = 11
const H = 1.6
const R = H / 2
const RUN = L - R
const TURN = Math.PI * R
const outer = COILS.coilRadius + COILS.tubeRadius

describe('hairpin centerline', () => {
  it('has two runs and one half circle', () => {
    expect(hairpinTotal(L, H)).toBeCloseTo(2 * RUN + TURN, 9)
  })

  it('starts at the far end of the top run, turns at the near end and ends at the far end of the bottom run', () => {
    const start = hairpinPoint(0, L, H)
    expect(start).toMatchObject({ s: L, w: R, ts: -1, tw: 0 })
    const topRun = hairpinPoint(RUN / 2, L, H)
    expect(topRun.w).toBeCloseTo(R, 9)
    expect(topRun.ts).toBe(-1)
    const tip = hairpinPoint(RUN + TURN / 2, L, H)
    expect(tip.s).toBeCloseTo(0, 9)
    expect(tip.w).toBeCloseTo(0, 9)
    const bottomRun = hairpinPoint(RUN + TURN + RUN / 2, L, H)
    expect(bottomRun.w).toBeCloseTo(-R, 9)
    expect(bottomRun.ts).toBe(1)
    const end = hairpinPoint(hairpinTotal(L, H), L, H)
    expect(end.s).toBeCloseTo(L, 9)
    expect(end.w).toBeCloseTo(-R, 9)
  })

  it('is continuous with a unit tangent everywhere', () => {
    const total = hairpinTotal(L, H)
    let last = hairpinPoint(0, L, H)
    for (let i = 1; i <= 400; i++) {
      const p = hairpinPoint((i / 400) * total, L, H)
      expect(Math.hypot(p.s - last.s, p.w - last.w)).toBeLessThan((total / 400) * 1.01)
      expect(Math.hypot(p.ts, p.tw)).toBeCloseTo(1, 9)
      last = p
    }
  })

  it('stays inside its bounds', () => {
    expect(hairpinBounds(L, H)).toEqual({ s: [0, L], w: [-R, R] })
    const total = hairpinTotal(L, H)
    for (let i = 0; i <= 200; i++) {
      const p = hairpinPoint((i / 200) * total, L, H)
      expect(p.s).toBeGreaterThan(-1e-9)
      expect(p.s).toBeLessThan(L + 1e-9)
      expect(Math.abs(p.w)).toBeLessThan(R + 1e-9)
    }
  })
})

describe('createHairpinGeometry', () => {
  const geo = createHairpinGeometry(L, H)

  it('winds the spring around the path: extents are the path plus the coil outer radius', () => {
    geo.computeBoundingBox()
    const box = geo.boundingBox!
    // Local frame: x = along the runs, y = across them, z = out of the wall.
    expect(box.min.x).toBeGreaterThan(-outer - 1e-6)
    expect(box.max.x).toBeLessThan(L + outer + 1e-6)
    expect(box.max.y).toBeLessThan(R + outer + 1e-6)
    expect(box.min.y).toBeGreaterThan(-R - outer - 1e-6)
    expect(box.max.z).toBeCloseTo(outer, 1)
    expect(box.min.z).toBeCloseTo(-outer, 1)
  })

  it('starts and ends on the helix at the path ends', () => {
    const n = COILS.radialSegments
    const ringCenter = (ring: number) => {
      const pos = geo.attributes.position
      const c = new THREE.Vector3()
      for (let j = 0; j < n; j++) c.add(new THREE.Vector3().fromBufferAttribute(pos, ring * (n + 1) + j))
      return c.divideScalar(n)
    }
    const rings = geo.attributes.position.count / (n + 1)
    expect(ringCenter(0).distanceTo(coilPoint(0, L, H))).toBeLessThan(0.02)
    expect(ringCenter(rings - 1).distanceTo(coilPoint(hairpinTotal(L, H), L, H))).toBeLessThan(0.02)
  })

  it('gives every turn of the spring the same number of segments (turns follow the pitch)', () => {
    const rings = geo.attributes.position.count / (COILS.radialSegments + 1)
    const turns = hairpinTotal(L, H) / COILS.pitch
    expect(rings).toBeGreaterThan(turns * COILS.stepsPerTurn * 0.95)
    expect(rings).toBeLessThan(turns * COILS.stepsPerTurn * 1.05 + 6)
  })
})

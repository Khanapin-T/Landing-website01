import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { COILS } from '../../config/fire'
import { coilPoint, createSerpentineGeometries, serpentineBounds, serpentinePoint, serpentineTotal } from './helix'

const L = 9
const D = 1.6
const R = D / 2
const RUN = L - 2 * R
const TURN = Math.PI * R
const outer = COILS.coilRadius + COILS.tubeRadius

describe('serpentine centerline', () => {
  it('has three runs and two half-circle turns', () => {
    expect(serpentineTotal(L, D)).toBeCloseTo(3 * RUN + 2 * TURN, 9)
  })

  it('starts on the top run, turns down at the far end and again at the near end', () => {
    const start = serpentinePoint(0, L, D)
    expect(start).toMatchObject({ s: R, w: D, ts: 1, tw: 0 })
    const farTurn = serpentinePoint(RUN + TURN / 2, L, D)
    expect(farTurn.s).toBeCloseTo(L, 9)
    expect(farTurn.w).toBeCloseTo(D / 2, 9)
    const middleRun = serpentinePoint(RUN + TURN + RUN / 2, L, D)
    expect(middleRun.w).toBeCloseTo(0, 9)
    expect(middleRun.ts).toBe(-1)
    const nearTurn = serpentinePoint(2 * RUN + 1.5 * TURN, L, D)
    expect(nearTurn.s).toBeCloseTo(0, 9)
    expect(nearTurn.w).toBeCloseTo(-D / 2, 9)
    const end = serpentinePoint(serpentineTotal(L, D), L, D)
    expect(end.s).toBeCloseTo(L - R, 9)
    expect(end.w).toBeCloseTo(-D, 9)
  })

  it('is continuous with a unit tangent everywhere', () => {
    const total = serpentineTotal(L, D)
    let last = serpentinePoint(0, L, D)
    for (let i = 1; i <= 400; i++) {
      const p = serpentinePoint((i / 400) * total, L, D)
      expect(Math.hypot(p.s - last.s, p.w - last.w)).toBeLessThan((total / 400) * 1.01)
      expect(Math.hypot(p.ts, p.tw)).toBeCloseTo(1, 9)
      last = p
    }
  })

  it('stays inside its bounds', () => {
    const b = serpentineBounds(L, D)
    expect(b).toEqual({ s: [0, L], w: [-D, D] })
  })
})

describe('createSerpentineGeometries', () => {
  const geos = createSerpentineGeometries(L, D)

  it('splits the spring into three tiers, one per run', () => {
    expect(geos).toHaveLength(3)
  })

  it('winds the spring around the path: extents are the path plus the coil outer radius', () => {
    const box = new THREE.Box3()
    for (const g of geos) {
      g.computeBoundingBox()
      box.union(g.boundingBox!)
    }
    // Local frame: x = along the runs, y = across them, z = out of the wall.
    expect(box.min.x).toBeGreaterThan(-outer - 1e-6)
    expect(box.max.x).toBeLessThan(L + outer + 1e-6)
    expect(box.max.y).toBeLessThan(D + outer + 1e-6)
    expect(box.min.y).toBeGreaterThan(-D - outer - 1e-6)
    expect(box.max.z).toBeCloseTo(outer, 1)
    expect(box.min.z).toBeCloseTo(-outer, 1)
  })

  it('joins the tiers without a gap: each tier starts where the previous one ends', () => {
    const total = serpentineTotal(L, D)
    const run = L - D
    const turn = Math.PI * (D / 2)
    const bounds = [0, run + turn / 2, 2 * run + 1.5 * turn, total]
    const ringCenter = (g: THREE.BufferGeometry, ring: number) => {
      const pos = g.attributes.position
      const c = new THREE.Vector3()
      const n = COILS.radialSegments
      for (let j = 0; j < n; j++) c.add(new THREE.Vector3().fromBufferAttribute(pos, ring * (n + 1) + j))
      return c.divideScalar(n)
    }
    for (let i = 0; i < 3; i++) {
      const g = geos[i]
      const rings = g.attributes.position.count / (COILS.radialSegments + 1)
      const first = ringCenter(g, 0)
      const last = ringCenter(g, rings - 1)
      expect(first.distanceTo(coilPoint(bounds[i], L, D))).toBeLessThan(0.02)
      expect(last.distanceTo(coilPoint(bounds[i + 1], L, D))).toBeLessThan(0.02)
    }
  })

  it('gives every turn of the spring the same number of segments (turns follow the pitch)', () => {
    const rings = geos.reduce((n, g) => n + g.attributes.position.count / (COILS.radialSegments + 1), 0)
    const turns = serpentineTotal(L, D) / COILS.pitch
    expect(rings).toBeGreaterThan(turns * COILS.stepsPerTurn * 0.95)
    expect(rings).toBeLessThan(turns * COILS.stepsPerTurn * 1.05 + 6)
  })
})

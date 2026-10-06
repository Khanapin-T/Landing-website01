import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { BURN, burnFrontY } from '../../config/fire'
import { mulberry32 } from '../../lib/random'
import { BURNOUT_COUNTS, buildBurnoutParts, burnoutBuffers, sampleParts, type BurnoutPart } from './burnoutData'

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)

describe('sampleParts', () => {
  const parts: BurnoutPart[] = [
    { geometry: box(1, 1, 1), matrix: new THREE.Matrix4().makeTranslation(0, 0, 0), count: 600 },
    { geometry: box(1, 1, 1), matrix: new THREE.Matrix4().makeTranslation(10, 0, 0), count: 600 },
  ]

  it('returns every requested point in world space', () => {
    const p = sampleParts(parts, mulberry32(1))
    expect(p.length).toBe(1200 * 3)
    for (let i = 0; i < 1200; i++) {
      const x = p[i * 3]
      expect(Math.abs(x) <= 0.5 + 1e-6 || Math.abs(x - 10) <= 0.5 + 1e-6).toBe(true)
    }
  })

  it('shuffles the parts together, so any prefix (a lower quality step) still shows every part', () => {
    const p = sampleParts(parts, mulberry32(1))
    const prefix = 120
    let far = 0
    for (let i = 0; i < prefix; i++) if (p[i * 3] > 5) far++
    expect(far).toBeGreaterThan(prefix * 0.25)
    expect(far).toBeLessThan(prefix * 0.75)
  })

  it('is deterministic for a seed', () => {
    expect(sampleParts(parts, mulberry32(7))).toEqual(sampleParts(parts, mulberry32(7)))
  })
})

describe('burnoutBuffers', () => {
  const points = new Float32Array([0, BURN.topY, 0, 0.3, 0, 0.1, 0, BURN.bottomY, 0])
  const b = burnoutBuffers(points, mulberry32(3))

  it('copies the positions and gives each point a seed', () => {
    expect(b.count).toBe(3)
    expect(Array.from(b.position)).toEqual(Array.from(points))
    expect(b.seed).toHaveLength(3)
    for (const s of b.seed) expect(s).toBeGreaterThanOrEqual(0)
  })

  it('detaches each point exactly when the burn front reaches it', () => {
    // Float32 stores BURN.topY (1.8) as 1.79999995, so the top point detaches at ~1e-8, not exactly 0.
    expect(b.start[0]).toBeCloseTo(0, 6)
    expect(burnFrontY(b.start[1] + 1e-9)).toBeCloseTo(0, 3)
    expect(b.start[2] + BURN.trail).toBeCloseTo(1, 6)
  })
})

describe('buildBurnoutParts', () => {
  it('has the trunk, four rings and four sprues with the configured counts', () => {
    const parts = buildBurnoutParts(box(1, 1, 1), box(0.1, 0.5, 0.1), box(0.2, 1, 0.2))
    expect(parts).toHaveLength(9)
    const total = parts.reduce((n, p) => n + p.count, 0)
    expect(total).toBe(BURNOUT_COUNTS.trunk + 4 * (BURNOUT_COUNTS.ring + BURNOUT_COUNTS.sprue))
  })
})

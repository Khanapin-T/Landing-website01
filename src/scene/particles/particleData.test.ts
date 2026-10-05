import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { particleDrawCount, resinStream, sampleSurface } from './particleData'
import { mulberry32 } from '../../lib/random'
import { PRINT, RING_HALF, printPose } from '../../config/print'

describe('particle data', () => {
  it('samples points on the surface, deterministically per seed', () => {
    const box = new THREE.BoxGeometry(1, 2, 0.5)
    const a = sampleSurface(box, 500, mulberry32(4))
    const b = sampleSurface(box, 500, mulberry32(4))
    expect(a.length).toBe(1500)
    expect(Array.from(a)).toEqual(Array.from(b))
    for (let i = 0; i < a.length; i += 3) {
      expect(Math.abs(a[i])).toBeLessThanOrEqual(0.5 + 1e-5)
      expect(Math.abs(a[i + 1])).toBeLessThanOrEqual(1 + 1e-5)
      expect(Math.abs(a[i + 2])).toBeLessThanOrEqual(0.25 + 1e-5)
    }
  })

  // A ring-sized box: height 1, centered, like the normalized hero ring.
  const ring = sampleSurface(new THREE.BoxGeometry(0.95, 2 * RING_HALF, 0.4), 3000, mulberry32(5))
  const p = resinStream(ring, mulberry32(6))

  it('pours every point into the resin bed under the plate, bottom points first', () => {
    const { pool } = PRINT
    let lowSum = 0
    let lowN = 0
    let highSum = 0
    let highN = 0
    for (let i = 0; i < p.count; i++) {
      expect(Math.abs(p.to[i * 3])).toBeLessThanOrEqual(pool.halfWidth + 1e-6)
      expect(Math.abs(p.to[i * 3 + 1] - pool.y)).toBeLessThanOrEqual(pool.thickness / 2 + 1e-6)
      expect(Math.abs(p.to[i * 3 + 2])).toBeLessThanOrEqual(pool.halfDepth + 1e-6)
      expect(p.delay[i]).toBeGreaterThanOrEqual(0)
      expect(p.delay[i]).toBeLessThanOrEqual(0.65)
      if (ring[i * 3 + 1] < 0) {
        lowSum += p.delay[i]
        lowN++
      } else {
        highSum += p.delay[i]
        highN++
      }
    }
    expect(lowSum / lowN).toBeLessThan(highSum / highN)
  })

  it('sends each point back to its own spot on the printed ring, when the cure front reaches it', () => {
    for (let i = 0; i < p.count; i++) {
      const [x, y, z] = [ring[i * 3], ring[i * 3 + 1], ring[i * 3 + 2]]
      // Upside down (flip PI around Z): x and y mirror, z stays; the point is printed on the cure plane.
      expect(p.front![i * 3]).toBeCloseTo(-x)
      expect(p.front![i * 3 + 1]).toBeCloseTo(PRINT.cureY)
      expect(p.front![i * 3 + 2]).toBeCloseTo(z)
      // At its arrival progress the printed ring has carried this point exactly onto the cure plane.
      const g = p.arrive![i]
      expect(g).toBeGreaterThan(0)
      expect(g).toBeLessThanOrEqual(1 + 1e-6)
      expect(printPose(g).ringY - y).toBeCloseTo(PRINT.cureY)
    }
  })

  it('scales the draw count by quality and halves it for reduced motion', () => {
    expect(particleDrawCount(24000, 1, false)).toBe(24000)
    expect(particleDrawCount(24000, 0.6, false)).toBe(14400)
    expect(particleDrawCount(24000, 1, true)).toBe(12000)
    expect(particleDrawCount(24000, 0.6, true)).toBe(7200)
  })
})

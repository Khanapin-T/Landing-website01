import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { particleDrawCount, resinStream, sampleSurface, streamRing } from './particleData'
import { mulberry32 } from '../../lib/random'
import { PRINT, RING_COUNT, RING_HALF, printPose, printRingX } from '../../config/print'

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

  it('sends each point to its own spot on its printed ring, when the cure front reaches it', () => {
    for (let i = 0; i < p.count; i++) {
      const [x, y, z] = [ring[i * 3], ring[i * 3 + 1], ring[i * 3 + 2]]
      // Upside down (flip PI around Z about the ring's own centre): x and y mirror, z stays; printed on the cure plane.
      expect(p.front![i * 3]).toBeCloseTo(-x * PRINT.scale + printRingX(streamRing(i)))
      expect(p.front![i * 3 + 1]).toBeCloseTo(PRINT.cureY)
      expect(p.front![i * 3 + 2]).toBeCloseTo(z * PRINT.scale)
      // At its arrival progress the printed ring has carried this point exactly onto the cure plane.
      const g = p.arrive![i]
      expect(g).toBeGreaterThan(0)
      expect(g).toBeLessThanOrEqual(1 + 1e-6)
      expect(printPose(g).ringY - y * PRINT.scale).toBeCloseTo(PRINT.cureY)
    }
  })

  it('spreads the points evenly over the four printed rings, each ring getting the whole surface', () => {
    const n = new Array(RING_COUNT).fill(0)
    const lo = new Array(RING_COUNT).fill(Infinity)
    const hi = new Array(RING_COUNT).fill(-Infinity)
    for (let i = 0; i < p.count; i++) {
      const k = streamRing(i)
      expect(Number.isInteger(k) && k >= 0 && k < RING_COUNT).toBe(true)
      n[k]++
      lo[k] = Math.min(lo[k], ring[i * 3 + 1])
      hi[k] = Math.max(hi[k], ring[i * 3 + 1])
      // The point lands within its own ring's footprint in the row.
      expect(Math.abs(p.front![i * 3] - printRingX(k))).toBeLessThanOrEqual(0.5 * PRINT.scale + 1e-6)
    }
    for (let k = 0; k < RING_COUNT; k++) {
      expect(Math.abs(n[k] - p.count / RING_COUNT)).toBeLessThanOrEqual(1)
      // Each ring is printed top to bottom (from the bottom of the sampled shape to its top).
      expect(lo[k]).toBeLessThan(-RING_HALF + 0.05)
      expect(hi[k]).toBeGreaterThan(RING_HALF - 0.05)
    }
  })

  it('scales the draw count by quality and halves it for reduced motion', () => {
    expect(particleDrawCount(24000, 1, false)).toBe(24000)
    expect(particleDrawCount(24000, 0.6, false)).toBe(14400)
    expect(particleDrawCount(24000, 1, true)).toBe(12000)
    expect(particleDrawCount(24000, 0.6, true)).toBe(7200)
  })
})

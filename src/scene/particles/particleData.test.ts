import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { particleDrawCount, sampleSurface, streamDown } from './particleData'
import { mulberry32 } from '../../lib/random'

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

  it('streams every point down below the floor, bottom points first', () => {
    const from = sampleSurface(new THREE.BoxGeometry(1, 1, 1), 2000, mulberry32(5))
    const p = streamDown(from, mulberry32(6), { floorY: -1.4, drop: 0.5 })
    expect(p.count).toBe(2000)
    let lowSum = 0
    let lowN = 0
    let highSum = 0
    let highN = 0
    for (let i = 0; i < p.count; i++) {
      expect(p.to[i * 3 + 1]).toBeLessThanOrEqual(-1.4)
      expect(p.to[i * 3 + 1]).toBeGreaterThanOrEqual(-1.9)
      expect(p.delay[i]).toBeGreaterThanOrEqual(0)
      expect(p.delay[i]).toBeLessThanOrEqual(0.65)
      expect(p.seed[i]).toBeGreaterThanOrEqual(0)
      expect(p.seed[i]).toBeLessThan(1)
      if (from[i * 3 + 1] < 0) {
        lowSum += p.delay[i]
        lowN++
      } else {
        highSum += p.delay[i]
        highN++
      }
    }
    expect(lowSum / lowN).toBeLessThan(highSum / highN)
  })

  it('scales the draw count by quality and halves it for reduced motion', () => {
    expect(particleDrawCount(24000, 1, false)).toBe(24000)
    expect(particleDrawCount(24000, 0.6, false)).toBe(14400)
    expect(particleDrawCount(24000, 1, true)).toBe(12000)
    expect(particleDrawCount(24000, 0.6, true)).toBe(7200)
  })
})

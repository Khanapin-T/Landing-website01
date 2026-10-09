import { describe, expect, it } from 'vitest'
import { MOLD, TAPE_LENGTH, investmentLevelY, tapeCenter, tapeLayers, tapeSpin } from './mold'

const TAU = Math.PI * 2
const angleDiff = (a: number, b: number) => Math.abs((((a - b + Math.PI) % TAU) + TAU) % TAU - Math.PI)

describe('tape', () => {
  const samples: [number, number][] = []
  for (let h = 0; h <= 1.0001; h += 0.05) for (let az = -Math.PI; az < Math.PI; az += 0.3) samples.push([Math.min(h, 1), az])

  it('covers nothing before the wrap starts and everything when it is done', () => {
    for (const [h, az] of samples) {
      expect(tapeLayers(h, az, 0)).toBe(0)
      expect(tapeLayers(h, az, 1)).toBeGreaterThanOrEqual(1)
    }
  })

  it('only ever adds layers while p grows (no point un-wraps)', () => {
    for (const [h, az] of samples) {
      let prev = 0
      for (let p = 0; p <= 1.0001; p += 0.02) {
        const n = tapeLayers(h, az, p)
        expect(n).toBeGreaterThanOrEqual(prev)
        prev = n
      }
    }
  })

  it('overlaps turns (two layers somewhere) but never more than four', () => {
    const counts = samples.map(([h, az]) => tapeLayers(h, az, 1))
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(2)
    expect(Math.max(...counts)).toBeLessThanOrEqual(4)
  })

  it('has an integer length and a climbing pitch that still overlaps (no gaps between turns)', () => {
    const { width } = MOLD.tape
    expect(Number.isInteger(TAPE_LENGTH)).toBe(true)
    let steepest = 0
    for (let u = 0; u < TAPE_LENGTH - 1; u += 0.01) steepest = Math.max(steepest, tapeCenter(u + 1) - tapeCenter(u))
    expect(steepest).toBeLessThanOrEqual(width / 1.3)
    // Flush with the flask bottom at the start and the top at the end.
    expect(tapeCenter(0) - width / 2).toBeCloseTo(0, 9)
    expect(tapeCenter(TAPE_LENGTH) + width / 2).toBeCloseTo(1, 9)
  })

  it('has no gaps at p = 1 on a dense grid', () => {
    for (let h = 0; h <= 1.00001; h += 0.004) {
      for (let az = -Math.PI; az < Math.PI; az += 0.02) {
        if (tapeLayers(Math.min(h, 1), az, 1) < 1) throw new Error(`gap at h=${h} az=${az}`)
      }
    }
  })

  // The covered band's [min, max] height at a given azimuth and progress, on a fine height scan.
  const band = (az: number, p: number) => {
    let lo = Infinity
    let hi = -Infinity
    for (let h = 0; h <= 1.00001; h += 0.002) {
      if (tapeLayers(Math.min(h, 1), az, p) > 0) {
        lo = Math.min(lo, h)
        hi = Math.max(hi, h)
      }
    }
    return [lo, hi]
  }

  it('starts flat at the bottom: inside the first turn the band is the same height at every laid azimuth', () => {
    const p = 0.6 / TAPE_LENGTH // 0.6 of the first turn is laid
    const { azimuth0, width } = MOLD.tape
    for (let a = 0.05; a < 0.55; a += 0.05) {
      const [lo, hi] = band(azimuth0 + TAU * a, p)
      expect(lo).toBeLessThan(0.003)
      expect(hi).toBeGreaterThan(width - 0.003)
      expect(hi).toBeLessThan(width + 0.003)
    }
    // The part of the turn not laid yet is bare.
    expect(band(azimuth0 + TAU * 0.8, p)[0]).toBe(Infinity)
  })

  it('ends flat at the top: inside the last turn the upper band edge is flush with the top at every azimuth', () => {
    const { azimuth0, width } = MOLD.tape
    const p = (TAPE_LENGTH - 0.4) / TAPE_LENGTH // 0.6 of the last turn is laid
    for (let a = 0.05; a < 0.55; a += 0.05) {
      const az = azimuth0 + TAU * a
      // The last pass alone is the band [1 - width, 1]: above 1 - width only passes 5 and 6 can reach.
      expect(tapeLayers(1, az, p)).toBeGreaterThanOrEqual(1)
      expect(tapeLayers(1 - width + 0.003, az, 1)).toBeGreaterThanOrEqual(1)
      expect(tapeCenter(TAPE_LENGTH - 1 + a) + width / 2).toBeCloseTo(1, 9)
    }
  })

  it('keeps the lay point at the same world azimuth while the flask turns, and ends at rest', () => {
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const front = MOLD.tape.azimuth0 + TAU * (p * TAPE_LENGTH) // object-space azimuth of the strip end
      expect(angleDiff(front + tapeSpin(p), MOLD.tape.azimuth0)).toBeLessThan(1e-9)
    }
    expect(angleDiff(tapeSpin(0), 0)).toBeLessThan(1e-9)
    expect(angleDiff(tapeSpin(1), 0)).toBeLessThan(1e-9)
  })
})

describe('investment level', () => {
  it('rises from the flask bottom to the top', () => {
    expect(investmentLevelY(0)).toBeCloseTo(MOLD.investment.bottomY)
    expect(investmentLevelY(1)).toBeCloseTo(MOLD.investment.topY)
    expect(investmentLevelY(0.5)).toBeCloseTo((MOLD.investment.bottomY + MOLD.investment.topY) / 2)
  })
})

describe('tree layout config', () => {
  it('derives the trunk top from the flask (40% of its height) and keeps the base wider than the flask', () => {
    expect(MOLD.trunk.topY).toBeCloseTo(MOLD.flask.bottomY + 0.4 * MOLD.flask.height)
    expect(MOLD.base.radius).toBeGreaterThan(MOLD.flask.innerRadius)
  })

  it('turns the tree 45 deg and puts the pour on the far side', () => {
    expect(MOLD.yaw).toBeCloseTo(Math.PI / 4)
    expect(MOLD.pour).toEqual({ radius: 1.05, azimuth: Math.PI / 2 })
  })
})

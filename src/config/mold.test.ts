import { describe, expect, it } from 'vitest'
import { MOLD, TAPE_LENGTH, investmentLevelY, tapeLayers, tapeSpin } from './mold'

const TAU = Math.PI * 2
const angleDiff = (a: number, b: number) => Math.abs((((a - b + Math.PI) % TAU) + TAU) % TAU - Math.PI)

describe('tape', () => {
  const samples: [number, number][] = []
  for (let h = 0; h <= 1.0001; h += 0.05) for (let az = -Math.PI; az < Math.PI; az += 0.3) samples.push([h, az])

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

  it('overlaps turns (two layers somewhere) but never more than two', () => {
    const counts = samples.map(([h, az]) => tapeLayers(h, az, 1))
    expect(Math.max(...counts)).toBe(2)
  })

  it('keeps the lay point at the same world azimuth while the flask turns, and ends at rest', () => {
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const front = MOLD.tape.azimuth0 + TAU * (-1 + p * TAPE_LENGTH) // object-space azimuth of the strip end
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

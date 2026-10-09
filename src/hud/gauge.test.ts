import { describe, expect, it } from 'vitest'
import { GAUGE, needleAngle, tickLines } from './gauge'

describe('needleAngle', () => {
  it('rests at atmosphere on the left and swings to full vacuum on the right', () => {
    expect(needleAngle(0)).toBe(GAUGE.startDeg)
    expect(needleAngle(1)).toBe(GAUGE.endDeg)
    expect(needleAngle(0.5)).toBeCloseTo((GAUGE.startDeg + GAUGE.endDeg) / 2, 9)
  })

  it('clamps outside 0..1', () => {
    expect(needleAngle(-2)).toBe(GAUGE.startDeg)
    expect(needleAngle(7)).toBe(GAUGE.endDeg)
  })
})

describe('tickLines', () => {
  const ticks = tickLines()

  it('has one tick per mark, from the first angle to the last', () => {
    expect(ticks).toHaveLength(GAUGE.ticks)
  })

  it('keeps every tick inside the 160 x 160 viewBox, pointing out from the center', () => {
    for (const t of ticks) {
      for (const v of [t.x1, t.y1, t.x2, t.y2]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(160)
      }
      const inner = Math.hypot(t.x1 - GAUGE.center, t.y1 - GAUGE.center)
      const outer = Math.hypot(t.x2 - GAUGE.center, t.y2 - GAUGE.center)
      expect(inner).toBeCloseTo(GAUGE.tickInner, 6)
      expect(outer).toBeCloseTo(GAUGE.tickOuter, 6)
    }
  })

  it('is symmetric about the vertical axis', () => {
    const first = ticks[0]
    const last = ticks[ticks.length - 1]
    expect(first.x1 + last.x1).toBeCloseTo(2 * GAUGE.center, 6)
    expect(first.y1).toBeCloseTo(last.y1, 6)
  })
})

import { describe, expect, it } from 'vitest'
import { heatColor } from './heat'

const luminance = ([r, g, b]: readonly number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b

describe('heatColor', () => {
  it('is cold dark steel at 0 and bright orange past the bloom threshold at 1', () => {
    expect(luminance(heatColor(0))).toBeLessThan(0.05)
    expect(luminance(heatColor(1))).toBeGreaterThan(0.6)
  })

  it('never gets darker as the heat rises', () => {
    let last = -1
    for (let i = 0; i <= 20; i++) {
      const l = luminance(heatColor(i / 20))
      expect(l).toBeGreaterThanOrEqual(last)
      last = l
    }
  })

  it('goes red before orange before white (red channel leads)', () => {
    const [r, g, b] = heatColor(0.45)
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
  })

  it('clamps outside 0..1 and reuses the output array', () => {
    expect(heatColor(-3)).toEqual(heatColor(0))
    expect(heatColor(9)).toEqual(heatColor(1))
    const out: [number, number, number] = [0, 0, 0]
    expect(heatColor(0.5, out)).toBe(out)
  })
})

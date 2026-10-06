import { describe, expect, it } from 'vitest'
import { cavityAlpha } from './cavityAlpha'

describe('cavityAlpha', () => {
  it('is invisible without X-ray, whatever the burn', () => {
    expect(cavityAlpha(0, 0.9)).toBe(0)
    expect(cavityAlpha(0, 0)).toBe(0)
  })

  it('appears as the tree burns away and stays while X-ray is on', () => {
    expect(cavityAlpha(1, 0)).toBe(0)
    expect(cavityAlpha(1, 0.15)).toBe(0)
    expect(cavityAlpha(1, 0.5)).toBeGreaterThan(0)
    expect(cavityAlpha(1, 0.9)).toBe(1)
    expect(cavityAlpha(1, 1)).toBe(1)
  })

  it('fades with the X-ray', () => {
    expect(cavityAlpha(0.5, 1)).toBeCloseTo(0.5, 6)
  })
})

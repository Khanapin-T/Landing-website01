import { describe, expect, it } from 'vitest'
import { QUALITY_STEPS, effectiveDpr, initialStep, stepDown, stepUp } from './quality'

describe('quality steps', () => {
  it('starts at full quality on a 1.5+ DPR screen', () => {
    expect(initialStep(2)).toBe(0)
    expect(initialStep(1.5)).toBe(0)
  })

  it('skips DPR steps the device does not have', () => {
    expect(QUALITY_STEPS[initialStep(1.25)].dpr).toBe(1.25)
    expect(QUALITY_STEPS[initialStep(1)].dpr).toBe(1)
  })

  it('never renders above the device DPR', () => {
    for (const s of QUALITY_STEPS) expect(effectiveDpr(s, 1)).toBeLessThanOrEqual(1)
    expect(effectiveDpr(QUALITY_STEPS[0], 1.25)).toBe(1.25)
  })

  it('steps down and stops at the last step', () => {
    const last = QUALITY_STEPS.length - 1
    expect(stepDown(0)).toBe(1)
    expect(stepDown(last)).toBe(last)
  })

  it('steps up but never above the device floor', () => {
    expect(stepUp(3, 0)).toBe(2)
    expect(stepUp(2, 2)).toBe(2)
  })

  it('only lowers cost from one step to the next', () => {
    for (let i = 1; i < QUALITY_STEPS.length; i++) {
      const a = QUALITY_STEPS[i - 1]
      const b = QUALITY_STEPS[i]
      expect(b.dpr).toBeLessThanOrEqual(a.dpr)
      expect(b.msaa).toBeLessThanOrEqual(a.msaa)
      expect(b.bloomScale).toBeLessThanOrEqual(a.bloomScale)
      expect(b.particleScale).toBeLessThanOrEqual(a.particleScale)
    }
  })
})

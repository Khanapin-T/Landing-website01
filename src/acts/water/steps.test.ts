import { describe, expect, it } from 'vitest'
import { content } from '../../content'
import { WATER_BEATS } from './beats'
import { STEP_STARTS, stepAt } from './steps'

describe('water steps', () => {
  it('has one start per step name, in ascending order', () => {
    expect(STEP_STARTS).toHaveLength(content.water.steps.length)
    expect([...STEP_STARTS].sort((a, b) => a - b)).toEqual([...STEP_STARTS])
  })

  it('walks Water, Rest, Tree out', () => {
    expect(stepAt(11.5)).toBe(-1)
    expect(stepAt(STEP_STARTS[0])).toBe(0)
    expect(stepAt(STEP_STARTS[1])).toBe(1)
    expect(stepAt(STEP_STARTS[2])).toBe(2)
    expect(stepAt(13.99)).toBe(2)
    expect(STEP_STARTS[0]).toBe(WATER_BEATS.copyIn)
  })
})

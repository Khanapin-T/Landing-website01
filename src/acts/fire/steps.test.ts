import { describe, expect, it } from 'vitest'
import { content } from '../../content'
import { STEP_STARTS, stepAt } from './steps'

describe('fire steps', () => {
  it('has one start per step name, in ascending order', () => {
    expect(STEP_STARTS).toHaveLength(content.fire.steps.length)
    expect([...STEP_STARTS].sort((a, b) => a - b)).toEqual([...STEP_STARTS])
  })

  it('walks Furnace, Burnout, Flip', () => {
    expect(stepAt(6.9)).toBe(-1)
    expect(stepAt(STEP_STARTS[0])).toBe(0)
    expect(stepAt(STEP_STARTS[1])).toBe(1)
    expect(stepAt(STEP_STARTS[2])).toBe(2)
    expect(stepAt(9)).toBe(2)
  })
})

import { describe, expect, it } from 'vitest'
import { content } from '../../content'
import { BIRTH_BEATS } from './beats'
import { STEP_STARTS, stepAt } from './steps'

describe('birth steps', () => {
  it('has one start per step name, in ascending order', () => {
    expect(STEP_STARTS).toHaveLength(content.birth.steps.length)
    expect([...STEP_STARTS].sort((a, b) => a - b)).toEqual([...STEP_STARTS])
  })

  it('walks Cut off, Acid, Polish', () => {
    expect(stepAt(14.0)).toBe(-1)
    expect(stepAt(STEP_STARTS[0])).toBe(0)
    expect(stepAt(STEP_STARTS[1])).toBe(1)
    expect(stepAt(STEP_STARTS[2])).toBe(2)
    expect(STEP_STARTS[0]).toBe(BIRTH_BEATS.cutFrom)
    expect(STEP_STARTS[1]).toBe(BIRTH_BEATS.restFrom)
    expect(STEP_STARTS[2]).toBe(BIRTH_BEATS.polishFrom)
  })
})

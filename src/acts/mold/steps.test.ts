import { describe, expect, it } from 'vitest'
import { stepAt } from './steps'
import { MOLD_BEATS as B } from './beats'

const starts = [B.steps.tree, B.steps.flask, B.steps.tape, B.steps.investment, B.steps.vacuum, B.steps.rest, B.steps.tapeOff]

describe('stepAt', () => {
  it('is -1 before the first step', () => {
    expect(stepAt(0)).toBe(-1)
    expect(stepAt(B.steps.tree - 0.001)).toBe(-1)
    expect(stepAt(3.99)).toBe(-1)
  })

  it('returns each index at its own start and until the next one', () => {
    starts.forEach((start, i) => {
      expect(stepAt(start)).toBe(i)
      expect(stepAt(start + 0.001)).toBe(i)
    })
    expect(stepAt(B.steps.flask - 0.001)).toBe(0)
    expect(stepAt(B.steps.tape - 0.001)).toBe(1)
    expect(stepAt(B.steps.vacuum - 0.001)).toBe(3)
    expect(stepAt(B.steps.rest - 0.001)).toBe(4)
    expect(stepAt(B.steps.tapeOff - 0.001)).toBe(5)
  })

  it('stays on the last step after it', () => {
    expect(stepAt(B.steps.tapeOff)).toBe(6)
    expect(stepAt(6.45)).toBe(6)
    expect(stepAt(99)).toBe(6)
  })
})

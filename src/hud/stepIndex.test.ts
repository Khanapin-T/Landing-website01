import { describe, expect, it } from 'vitest'
import { stepIndex } from './stepIndex'

describe('stepIndex', () => {
  const starts = [1, 2, 3]
  it('is -1 before the first start', () => {
    expect(stepIndex(starts, 0)).toBe(-1)
    expect(stepIndex(starts, 0.999)).toBe(-1)
  })
  it('switches exactly at each start and stays on the last one', () => {
    expect(stepIndex(starts, 1)).toBe(0)
    expect(stepIndex(starts, 1.999)).toBe(0)
    expect(stepIndex(starts, 2)).toBe(1)
    expect(stepIndex(starts, 99)).toBe(2)
  })
})

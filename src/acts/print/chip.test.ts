import { describe, expect, it } from 'vitest'
import { chipStateAt } from './chip'
import { PRINT_BEATS as B } from './beats'

describe('chipStateAt', () => {
  it('maps every scroll position to one state', () => {
    expect(chipStateAt(0)).toBe('hidden')
    expect(chipStateAt(B.chipIn - 0.001)).toBe('hidden')
    expect(chipStateAt(B.chipIn)).toBe('sending')
    expect(chipStateAt(B.printFrom)).toBe('printing')
    expect(chipStateAt(B.printTo - 0.001)).toBe('printing')
    expect(chipStateAt(B.printTo)).toBe('done')
    expect(chipStateAt(99)).toBe('done')
  })
})

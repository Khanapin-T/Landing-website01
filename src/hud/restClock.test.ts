import { describe, expect, it } from 'vitest'
import { restClock } from './restClock'

describe('restClock', () => {
  it('counts 00:00 up to the given length and clamps (default 10 minutes)', () => {
    expect(restClock(0)).toBe('00:00')
    expect(restClock(0.5)).toBe('05:00')
    expect(restClock(1)).toBe('10:00')
    expect(restClock(-3)).toBe('00:00')
    expect(restClock(9)).toBe('10:00')
  })

  it('takes another length in seconds (the investment rests up to 15 minutes)', () => {
    expect(restClock(0.5, 900)).toBe('07:30')
    expect(restClock(1, 900)).toBe('15:00')
    expect(restClock(0.1, 900)).toBe('01:30')
    expect(restClock(9, 900)).toBe('15:00')
  })
})

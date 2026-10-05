import { describe, expect, it } from 'vitest'
import { FOCUS_X, focusOffsetX } from './cameraMath'

describe('focusOffsetX', () => {
  it('puts the scene center at 58% of the width', () => {
    expect(FOCUS_X).toBe(0.58)
    expect(focusOffsetX(1000)).toBeCloseTo(-80)
  })

  it('scales with the window width (resize keeps the framing)', () => {
    expect(focusOffsetX(1920)).toBeCloseTo(-153.6)
    expect(focusOffsetX(1280)).toBeCloseTo(-102.4)
  })
})

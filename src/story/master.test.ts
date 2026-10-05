import { describe, expect, it } from 'vitest'
import { master } from './master'
import { TOTAL_SCREENS } from '../config/acts'

describe('master timeline', () => {
  it('is paused and lasts exactly TOTAL_SCREENS seconds', () => {
    expect(master.paused()).toBe(true)
    expect(master.duration()).toBe(TOTAL_SCREENS)
  })
})

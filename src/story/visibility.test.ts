import { describe, expect, it } from 'vitest'
import { shouldRender } from './visibility'

describe('shouldRender', () => {
  it('always renders while loading (shaders must compile)', () => {
    expect(shouldRender('loading', 99, 0, 2.5)).toBe(true)
  })
  it('renders only inside the window once ready', () => {
    expect(shouldRender('ready', 1, 0, 2.5)).toBe(true)
    expect(shouldRender('ready', 2.5, 0, 2.5)).toBe(true)
    expect(shouldRender('ready', 2.51, 0, 2.5)).toBe(false)
    expect(shouldRender('error', 1, 0, 2.5)).toBe(true)
  })
})

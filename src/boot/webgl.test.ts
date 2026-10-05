import { describe, expect, it } from 'vitest'
import { hasWebGL2 } from './webgl'

const canvasWith = (ctx: unknown) => () => ({ getContext: () => ctx }) as unknown as HTMLCanvasElement

describe('hasWebGL2', () => {
  it('is true when a webgl2 context is returned', () => {
    expect(hasWebGL2(canvasWith({}))).toBe(true)
  })

  it('is false when the context is null', () => {
    expect(hasWebGL2(canvasWith(null))).toBe(false)
  })

  it('is false when getContext throws', () => {
    const throwing = () => ({ getContext: () => { throw new Error('blocked') } }) as unknown as HTMLCanvasElement
    expect(hasWebGL2(throwing)).toBe(false)
  })
})

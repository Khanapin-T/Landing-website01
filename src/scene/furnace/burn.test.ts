import { describe, expect, it } from 'vitest'
import { BURN } from '../../config/fire'
import { BURN_PARS, burnDiscard, burnGlow, burnUniforms } from './burn'

describe('burn shader snippets', () => {
  it('starts with the front far above everything', () => {
    expect(burnUniforms.uBurnY.value).toBe(BURN.off)
  })

  it('declares the uniforms and the band thickness from the config', () => {
    expect(BURN_PARS).toContain('uniform float uBurnY;')
    expect(BURN_PARS).toContain('uniform vec3 uBurnColor;')
    expect(BURN_PARS).toContain(`#define BURN_BAND ${BURN.band.toFixed(4)}`)
  })

  it('discards above the front and glows under it, for any world-Y varying', () => {
    expect(burnDiscard('vX')).toBe('if (vX > uBurnY) discard;')
    expect(burnGlow('vX')).toContain('uBurnY - vX')
    expect(burnGlow('vX')).toContain('outgoingLight +=')
  })
})

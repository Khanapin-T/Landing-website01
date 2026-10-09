import { describe, expect, it } from 'vitest'
import { MOLD } from '../../config/mold'
import { RAW_GOLD, TARNISH, createRawGoldMaterial } from './rawGoldMaterial'

describe('raw gold', () => {
  it('is strongly matte, never shiny before the polish', () => {
    expect(RAW_GOLD.roughness).toBeGreaterThanOrEqual(0.8)
    expect(createRawGoldMaterial(false).roughness).toBe(RAW_GOLD.roughness)
  })

  it('puts the one tarnish patch on the trunk surface, small, in its lower half', () => {
    const length = MOLD.trunk.topY - MOLD.trunk.bottomY
    expect(Math.hypot(TARNISH.center[0], TARNISH.center[2])).toBeCloseTo(MOLD.trunk.radius, 2)
    expect(TARNISH.center[1]).toBeGreaterThan(0)
    expect(TARNISH.center[1]).toBeLessThan(length / 2)
    expect(TARNISH.radius).toBeLessThan(length / 4)
  })

  it('compiles the tarnished trunk as its own program, the rest as another', () => {
    expect(createRawGoldMaterial(true).customProgramCacheKey()).not.toBe(createRawGoldMaterial(false).customProgramCacheKey())
  })
})

import { describe, expect, it } from 'vitest'
import { RAW_GOLD, createRawGoldMaterial } from './rawGoldMaterial'

describe('raw gold material', () => {
  it('stays strongly matte and fully metallic', () => {
    const m = createRawGoldMaterial()
    expect(m.roughness).toBe(RAW_GOLD.roughness)
    expect(RAW_GOLD.roughness).toBeGreaterThan(0.8)
    expect(m.metalness).toBe(1)
  })

  it('is clean pale yellow gold: no tarnish or dirt in the shader', () => {
    const m = createRawGoldMaterial()
    const shader = { vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>' }
    m.onBeforeCompile(shader as never, {} as never)
    expect(shader.fragmentShader).not.toMatch(/tarnish|dirt/i)
    const c = m.color
    expect(c.r).toBeGreaterThan(c.g)
    expect(c.g).toBeGreaterThan(c.b)
  })

  it('compiles every raw material as one program', () => {
    expect(createRawGoldMaterial().customProgramCacheKey()).toBe(createRawGoldMaterial().customProgramCacheKey())
  })
})

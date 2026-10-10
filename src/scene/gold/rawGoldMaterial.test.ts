import { describe, expect, it } from 'vitest'
import { CAST_DARK, RAW_GOLD, cleanOf, createRawGoldMaterial } from './rawGoldMaterial'

describe('raw gold material', () => {
  it('stays strongly matte and fully metallic', () => {
    const m = createRawGoldMaterial()
    expect(m.roughness).toBe(RAW_GOLD.roughness)
    expect(RAW_GOLD.roughness).toBeGreaterThan(0.8)
    expect(m.metalness).toBe(1)
  })

  it('is clean pale yellow gold: no tarnish or dirt in the shader', () => {
    const m = createRawGoldMaterial()
    const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>' }
    m.onBeforeCompile(shader as never, {} as never)
    expect(shader.fragmentShader).not.toMatch(/tarnish|dirt/i)
    const c = m.color
    expect(c.r).toBeGreaterThan(c.g)
    expect(c.g).toBeGreaterThan(c.b)
  })

  it('compiles every raw material as one program', () => {
    expect(createRawGoldMaterial().customProgramCacheKey()).toBe(createRawGoldMaterial().customProgramCacheKey())
  })

  it('is darker as cast and cleaned by the acid: cleanOf runs 0..1 over the timer, monotonic', () => {
    expect(CAST_DARK).toBeGreaterThan(0.6)
    expect(CAST_DARK).toBeLessThan(0.95)
    expect(cleanOf(0)).toBe(0)
    expect(cleanOf(1)).toBe(1)
    let prev = 0
    for (let r = 0; r <= 1; r += 0.05) {
      expect(cleanOf(r)).toBeGreaterThanOrEqual(prev)
      prev = cleanOf(r)
    }
  })

  it('takes the cleanness as a shared uniform (each material may be driven separately)', () => {
    const clean = { value: 0.5 }
    const m = createRawGoldMaterial(clean)
    const shader = {
      uniforms: {} as Record<string, unknown>,
      vertexShader: '#include <common>\n#include <begin_vertex>',
      fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>',
    }
    m.onBeforeCompile(shader as never, {} as never)
    expect(shader.uniforms.uClean).toBe(clean)
    expect(shader.fragmentShader).toContain('uniform float uClean;')
  })
})

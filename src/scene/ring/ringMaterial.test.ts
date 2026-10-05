import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createRingMaterial } from './ringMaterial'

function fakeShader() {
  return {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: '',
    fragmentShader: [
      '#include <common>',
      '#include <color_fragment>',
      '#include <roughnessmap_fragment>',
      '#include <metalnessmap_fragment>',
    ].join('\n'),
  }
}

describe('ring material', () => {
  it('uses alpha hashing (opaque pipeline, no sorting) and pushes its depth back for edge lines', () => {
    const { material } = createRingMaterial()
    expect(material.alphaHash).toBe(true)
    expect(material.transparent).toBe(false)
    expect(material.polygonOffset).toBe(true)
  })

  it('injects the CAD state into the standard shader', () => {
    const { material, uniforms } = createRingMaterial()
    const shader = fakeShader()
    material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
    expect(shader.uniforms.uCad).toBe(uniforms.uCad)
    expect(shader.uniforms.uCadColor).toBe(uniforms.uCadColor)
    expect(shader.fragmentShader).toContain('uniform float uCad;')
    expect(shader.fragmentShader).toMatch(/diffuseColor\.rgb = mix\(diffuseColor\.rgb, uCadColor, uCad\)/)
    expect(shader.fragmentShader).toMatch(/metalnessFactor = mix\(metalnessFactor, 0\.0, uCad\)/)
    expect(shader.fragmentShader).toMatch(/roughnessFactor = mix\(roughnessFactor, CAD_ROUGHNESS, uCad\)/)
  })

  it('keeps one program across state changes (uniforms only)', () => {
    const { material, uniforms } = createRingMaterial()
    const key = material.customProgramCacheKey()
    uniforms.uCad.value = 0.3
    material.opacity = 0.5
    expect(material.customProgramCacheKey()).toBe(key)
  })
})

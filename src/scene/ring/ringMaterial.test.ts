import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createRingMaterial } from './ringMaterial'
import { CURE_OFF } from '../../config/print'

function fakeShader() {
  return {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: ['#include <common>', 'void main() {', '#include <worldpos_vertex>', '}'].join('\n'),
    fragmentShader: [
      '#include <common>',
      '#include <clipping_planes_fragment>',
      '#include <color_fragment>',
      '#include <roughnessmap_fragment>',
      '#include <metalnessmap_fragment>',
      '#include <opaque_fragment>',
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
    expect(shader.fragmentShader).toMatch(/metalnessFactor = mix\(metalnessFactor, 0\.0, max\(uCad, uResin\)\)/)
    expect(shader.fragmentShader).toMatch(/roughnessFactor = mix\(roughnessFactor, CAD_ROUGHNESS, uCad\)/)
  })

  it('injects the resin state, the cure clip and the glowing front', () => {
    const { material, uniforms } = createRingMaterial()
    const shader = fakeShader()
    material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
    expect(shader.uniforms.uResin).toBe(uniforms.uResin)
    expect(shader.uniforms.uCureY).toBe(uniforms.uCureY)
    expect(shader.vertexShader).toContain('vRingWorldY')
    expect(shader.fragmentShader).toMatch(/if \(vRingWorldY < uCureY \+ 1e-4\) discard;/)
    expect(shader.fragmentShader).toMatch(/diffuseColor\.rgb = mix\(diffuseColor\.rgb, uResinColor, uResin\)/)
    expect(shader.fragmentShader).toContain('uFrontColor')
  })

  it('finds every anchor in the real three standard shader', () => {
    const { material } = createRingMaterial()
    const shader = {
      uniforms: {} as Record<string, THREE.IUniform>,
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    }
    material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
    expect(shader.vertexShader).toContain('varying float vRingWorldY;')
    expect(shader.vertexShader).toContain('vRingWorldY = (modelMatrix')
    for (const line of [
      'uniform float uCureY;',
      'discard;',
      'uResinColor, uResin)',
      'RESIN_ROUGHNESS, uResin)',
      'max(uCad, uResin)',
      'outgoingLight += front * uFrontColor;',
    ]) {
      expect(shader.fragmentShader).toContain(line)
    }
    // The resin/front block must sit before the final color write.
    expect(shader.fragmentShader.indexOf('uFrontColor;\n}')).toBeLessThan(shader.fragmentShader.indexOf('#include <opaque_fragment>'))
  })

  it('starts unclipped and not resin', () => {
    const { uniforms } = createRingMaterial()
    expect(uniforms.uCureY.value).toBe(CURE_OFF)
    expect(uniforms.uResin.value).toBe(0)
  })

  it('keeps one program across state changes (uniforms only)', () => {
    const { material, uniforms } = createRingMaterial()
    const key = material.customProgramCacheKey()
    uniforms.uCad.value = 0.3
    material.opacity = 0.5
    expect(material.customProgramCacheKey()).toBe(key)
  })
})

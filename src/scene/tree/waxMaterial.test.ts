import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { burnUniforms } from '../furnace/burn'
import { createWaxMaterial } from './waxMaterial'

describe('wax material', () => {
  it('is the red wax standard material', () => {
    const m = createWaxMaterial()
    expect(m).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(m.color.getHexString()).toBe(new THREE.Color('#7a1620').getHexString())
  })

  it('burns: world-Y varying, discard above the front, glow before the final color', () => {
    const m = createWaxMaterial()
    const shader = {
      uniforms: {} as Record<string, THREE.IUniform>,
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    }
    m.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
    expect(shader.uniforms.uBurnY).toBe(burnUniforms.uBurnY)
    expect(shader.vertexShader).toContain('varying float vWaxWorldY;')
    expect(shader.vertexShader).toContain('vWaxWorldY = (modelMatrix * vec4(transformed, 1.0)).y;')
    expect(shader.fragmentShader).toContain('if (vWaxWorldY > uBurnY) discard;')
    expect(shader.fragmentShader).toContain('uBurnY - vWaxWorldY')
    expect(shader.fragmentShader.indexOf('uBurnY - vWaxWorldY')).toBeLessThan(shader.fragmentShader.indexOf('#include <opaque_fragment>'))
  })

  it('has its own program key', () => {
    expect(createWaxMaterial().customProgramCacheKey()).toBe('wax-burn-v1')
  })
})

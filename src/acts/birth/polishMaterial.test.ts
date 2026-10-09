import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { LINE_NORMAL } from '../../config/birth'
import { RAW_GOLD } from '../../scene/gold/rawGoldMaterial'
import { POLISHED_GOLD, createPolishMaterials } from './polishMaterial'

const compile = (m: THREE.Material) => {
  const shader = {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  }
  m.onBeforeCompile(shader as never, {} as never)
  return shader
}

describe('polish materials', () => {
  it('share one set of uniforms and start fully raw', () => {
    const { ring, stub, mirror, uniforms } = createPolishMaterials()
    for (const m of [ring, stub, mirror]) {
      const s = compile(m)
      expect(s.uniforms.uLinePoint).toBe(uniforms.uLinePoint)
      expect(s.uniforms.uAll).toBe(uniforms.uAll)
      expect(s.fragmentShader).toContain('uniform vec3 uLinePoint;')
      expect(s.vertexShader).toContain('vPolishWorld')
    }
    expect(uniforms.uAll.value).toBe(0)
    expect(uniforms.uLineNormal.value.equals(LINE_NORMAL)).toBe(true)
  })

  it('discards the stub on the polished side only in the stub variant', () => {
    const { ring, stub } = createPolishMaterials()
    expect(compile(stub).fragmentShader).toContain('discard')
    expect(compile(ring).fragmentShader).not.toContain('if (polished > 0.5) discard;')
  })

  it('makes the reflection variant transparent and the others opaque, each with its own program key', () => {
    const { ring, stub, mirror } = createPolishMaterials()
    expect(mirror.transparent).toBe(true)
    expect(ring.transparent).toBe(false)
    const keys = new Set([ring, stub, mirror].map((m) => m.customProgramCacheKey()))
    expect(keys.size).toBe(3)
    expect(POLISHED_GOLD.roughness).toBeLessThan(0.2)
    expect(mirror.side).toBe(THREE.FrontSide)
  })

  it('scales the IBL down to the raw gold intensity on the raw side, always on the stub', () => {
    const { ring, stub, mirror } = createPolishMaterials()
    const ratio = (RAW_GOLD.envMapIntensity / POLISHED_GOLD.envMapIntensity).toFixed(5)
    for (const m of [ring, mirror]) {
      const fs = compile(m).fragmentShader
      expect(fs).toContain(`float pgEnv = mix(${ratio}, 1.0, polished);`)
      expect(fs.indexOf('pgEnv')).toBeGreaterThan(fs.indexOf('#include <lights_fragment_maps>'))
      expect(fs).toContain('iblIrradiance *= pgEnv;')
    }
    expect(compile(stub).fragmentShader).toContain(`float pgEnv = ${ratio};`)
  })
})

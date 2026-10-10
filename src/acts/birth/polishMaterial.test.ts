import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { FINAL, LINE_NORMAL } from '../../config/birth'
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
      expect(s.uniforms.uBoost).toBe(uniforms.uBoost)
      expect(s.fragmentShader).toContain('uniform float uBoost;')
      expect(s.fragmentShader).toContain('uniform vec3 uLinePoint;')
      expect(s.vertexShader).toContain('vPolishWorld')
    }
    expect(uniforms.uAll.value).toBe(0)
    expect(uniforms.uBoost.value).toBe(1)
    expect(uniforms.uLineNormal.value.equals(LINE_NORMAL)).toBe(true)
  })

  it('discards the stub on the polished side only in the stub variant', () => {
    const { ring, stub } = createPolishMaterials()
    expect(compile(stub).fragmentShader).toContain('discard')
    expect(compile(ring).fragmentShader).not.toContain('if (polished > 0.5) discard;')
  })

  it('keeps every variant opaque, each with its own program key', () => {
    const { ring, stub, mirror } = createPolishMaterials()
    for (const m of [ring, stub, mirror]) {
      expect(m.transparent).toBe(false)
      expect(m.depthWrite).toBe(true)
      expect(m.depthTest).toBe(true)
      expect(m.blending).toBe(THREE.NormalBlending)
    }
    const keys = new Set([ring, stub, mirror].map((m) => m.customProgramCacheKey()))
    expect(keys.size).toBe(3)
    expect(POLISHED_GOLD.roughness).toBeLessThan(0.2)
    expect(mirror.side).toBe(THREE.FrontSide)
  })

  it('fades the reflection to black by scaling the outgoing light, not by alpha (no x-ray of the inner faces)', () => {
    const { ring, mirror } = createPolishMaterials()
    const fs = compile(mirror).fragmentShader
    const fade = fs.indexOf('outgoingLight *= uReflect')
    expect(fade).toBeGreaterThan(fs.indexOf('vec3 outgoingLight ='))
    expect(fade).toBeLessThan(fs.indexOf('#include <opaque_fragment>'))
    expect(fs).toContain(`${FINAL.reflectFade.toFixed(4)}, ${FINAL.mirrorY.toFixed(4)} - vPolishWorld.y`)
    expect(fs).not.toContain('diffuseColor.a = uReflect')
    expect(compile(ring).fragmentShader).not.toContain('outgoingLight *= uReflect')
  })

  it('scales the IBL down to the raw gold intensity on the raw side (always on the stub), the polished side by uBoost', () => {
    const { ring, stub, mirror } = createPolishMaterials()
    const ratio = (RAW_GOLD.envMapIntensity / POLISHED_GOLD.envMapIntensity).toFixed(5)
    for (const m of [ring, mirror]) {
      const fs = compile(m).fragmentShader
      expect(fs).toContain(`float pgEnv = mix(${ratio}, uBoost, polished);`)
      expect(fs.indexOf('pgEnv')).toBeGreaterThan(fs.indexOf('#include <lights_fragment_maps>'))
      expect(fs).toContain('iblIrradiance *= pgEnv;')
    }
    expect(compile(stub).fragmentShader).toContain(`float pgEnv = ${ratio};`)
  })
})

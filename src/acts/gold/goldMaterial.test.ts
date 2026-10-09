import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { FILL } from '../../config/gold'
import { FLIP } from '../../config/fire'
import { createGoldMaterial, goldFillUniforms } from './goldMaterial'

function compile(material: THREE.MeshStandardMaterial) {
  const shader = {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  }
  material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
  return shader
}

describe('gold fill material', () => {
  it('is a yellow-gold metal that renders both sides', () => {
    const m = createGoldMaterial()
    expect(m).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(m.color.getHexString()).toBe(new THREE.Color('#e3b04b').getHexString())
    expect(m.metalness).toBe(1)
    expect(m.side).toBe(THREE.DoubleSide)
  })

  it('starts with nothing filled', () => {
    expect(goldFillUniforms.uFillY.value).toBe(FILL.off)
    expect(FILL.off).toBeGreaterThan(FILL.topY)
  })

  it('maps world Y back to the flask frame, discards below the front, glows just above it', () => {
    const shader = compile(createGoldMaterial())
    expect(shader.uniforms.uFillY).toBe(goldFillUniforms.uFillY)
    expect(shader.uniforms.uFillColor).toBe(goldFillUniforms.uFillColor)
    expect(shader.vertexShader).toContain('varying float vFillY;')
    expect(shader.vertexShader).toContain(`vFillY = 2.0 * ${FLIP.pivotY.toFixed(5)} - (modelMatrix * vec4(transformed, 1.0)).y;`)
    expect(shader.fragmentShader).toContain('if (vFillY < uFillY) discard;')
    const glow = shader.fragmentShader.indexOf('vFillY - uFillY')
    expect(glow).toBeGreaterThan(-1)
    expect(glow).toBeLessThan(shader.fragmentShader.indexOf('#include <opaque_fragment>'))
  })

  it('has its own program key', () => {
    expect(createGoldMaterial().customProgramCacheKey()).toBe('gold-fill-v2')
  })
})

describe('flip mapping', () => {
  it('the fixed Rz(pi) + translate(0, 2 pivot, 0) equals the flask rig flip about the pivot', () => {
    const pivot = new THREE.Vector3(0, FLIP.pivotY, 0)
    const p = new THREE.Vector3(0.4, -1.1, 0.7)
    // The rig: move to the pivot frame, rotate pi about Z, move back.
    const viaRig = p.clone().sub(pivot).applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI).add(pivot)
    const viaGroup = p.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI).add(new THREE.Vector3(0, 2 * FLIP.pivotY, 0))
    expect(viaGroup.x).toBeCloseTo(viaRig.x, 9)
    expect(viaGroup.y).toBeCloseTo(viaRig.y, 9)
    expect(viaGroup.z).toBeCloseTo(viaRig.z, 9)
  })
})

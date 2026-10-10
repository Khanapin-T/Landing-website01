import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  DIRT,
  DIRT_SEEDS,
  RAW_CLEAN,
  RAW_GOLD,
  createRawGoldMaterial,
  createRawTreeMaterials,
  dirtAt,
  rawCleanOf,
} from './rawGoldMaterial'

const compile = (m: THREE.Material) => {
  const shader = {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  }
  m.onBeforeCompile(shader as never, {} as never)
  return shader
}

/** Fraction of points in a ring-sized box (ring height = 1) where the dirt is over half strength. */
function coverage(seed: number, clean = 0): number {
  let s = 12345
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  let hit = 0
  const n = 20000
  for (let k = 0; k < n; k++) if (dirtAt(rnd() - 0.5, rnd() - 0.5, rnd() * 0.4 - 0.2, seed, clean) > 0.5) hit++
  return hit / n
}

describe('raw gold', () => {
  it('is strongly matte, never shiny before the polish', () => {
    expect(RAW_GOLD.roughness).toBeGreaterThanOrEqual(0.8)
    expect(createRawGoldMaterial(DIRT_SEEDS.tree).roughness).toBe(RAW_GOLD.roughness)
  })

  it('compiles every raw piece into one program: the seed and the clean value are uniforms', () => {
    const keys = new Set([DIRT_SEEDS.tree, ...DIRT_SEEDS.slots].map((s) => createRawGoldMaterial(s).customProgramCacheKey()))
    expect(keys.size).toBe(1)
    const a = compile(createRawGoldMaterial(DIRT_SEEDS.slots[0]))
    const b = compile(createRawGoldMaterial(DIRT_SEEDS.slots[1]))
    expect(a.fragmentShader).toBe(b.fragmentShader)
    expect(a.vertexShader).toBe(b.vertexShader)
    expect(a.fragmentShader).toContain('uniform float uDirtSeed;')
    expect(a.fragmentShader).toContain('uniform float uRawClean;')
    expect(a.uniforms.uDirtSeed.value).toBe(DIRT_SEEDS.slots[0])
    expect(b.uniforms.uDirtSeed.value).toBe(DIRT_SEEDS.slots[1])
    expect(a.uniforms.uRawClean).toBe(RAW_CLEAN)
    expect(b.uniforms.uRawClean).toBe(RAW_CLEAN)
  })

  it('makes the dirt dull: rougher and less metallic, dark brown', () => {
    const fs = compile(createRawGoldMaterial(DIRT_SEEDS.tree)).fragmentShader
    expect(fs).toContain(`roughnessFactor = mix(roughnessFactor, ${DIRT.roughness.toFixed(4)}, gdK);`)
    expect(fs).toContain(`metalnessFactor = mix(metalnessFactor, ${DIRT.metalness.toFixed(4)}, gdK);`)
    expect(fs.indexOf('gdK = gd.x')).toBeGreaterThan(fs.indexOf('#include <color_fragment>'))
    expect(fs.indexOf('metalnessFactor = mix')).toBeGreaterThan(fs.indexOf('#include <metalnessmap_fragment>'))
    expect(DIRT.roughness).toBeGreaterThan(RAW_GOLD.roughness)
    expect(DIRT.metalness).toBeLessThan(1)
    const hsl = { h: 0, s: 0, l: 0 }
    for (const hex of [DIRT.dark, DIRT.light]) expect(new THREE.Color(hex).getHSL(hsl).l).toBeLessThan(0.2)
  })

  it('gives the tree one seed and every ring slot its own', () => {
    const seeds = [DIRT_SEEDS.tree, ...DIRT_SEEDS.slots]
    expect(new Set(seeds).size).toBe(5)
    const { tree, slots } = createRawTreeMaterials()
    expect(compile(tree).uniforms.uDirtSeed.value).toBe(DIRT_SEEDS.tree)
    slots.forEach((m, i) => expect(compile(m).uniforms.uDirtSeed.value).toBe(DIRT_SEEDS.slots[i]))
  })

  it('covers about a quarter to a third of a ring, with a different pattern per seed', () => {
    const all = DIRT_SEEDS.slots.map((s) => coverage(s))
    for (const c of all) {
      expect(c).toBeGreaterThan(0.18)
      expect(c).toBeLessThan(0.4)
    }
    const mean = all.reduce((a, b) => a + b, 0) / all.length
    expect(mean).toBeGreaterThan(0.24)
    expect(mean).toBeLessThan(0.34)
    // Same points, other seed: the patterns do not line up.
    let same = 0
    for (let k = 0; k < 400; k++) {
      const p = [Math.sin(k * 1.7) * 0.5, Math.cos(k * 2.3) * 0.5, Math.sin(k * 0.9) * 0.2] as const
      if (dirtAt(...p, DIRT_SEEDS.slots[0]) > 0.5 === dirtAt(...p, DIRT_SEEDS.slots[1]) > 0.5) same++
    }
    expect(same / 400).toBeLessThan(0.8)
  })

  it('is deterministic', () => {
    expect(dirtAt(0.1, 0.2, 0.05, DIRT_SEEDS.tree)).toBe(dirtAt(0.1, 0.2, 0.05, DIRT_SEEDS.tree))
  })

  it('starts dirty and is cleaned by the acid rest: shrinking patches, gone at the end', () => {
    expect(RAW_CLEAN.value).toBe(0)
    expect(rawCleanOf(0)).toBe(0)
    expect(rawCleanOf(1)).toBe(1)
    expect(rawCleanOf(0.5)).toBeGreaterThan(0.3)
    expect(rawCleanOf(0.5)).toBeLessThan(0.7)
    for (let r = 0; r < 1; r += 0.05) expect(rawCleanOf(r + 0.05)).toBeGreaterThanOrEqual(rawCleanOf(r))
    const seed = DIRT_SEEDS.slots[0]
    expect(coverage(seed, 0.3)).toBeLessThan(coverage(seed, 0))
    expect(coverage(seed, 1)).toBe(0)
  })
})

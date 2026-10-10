import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { CUT_ORDER, SPARKS, cutOutDir, cutPoint, slotMatrix } from '../../config/birth'
import { QUADS_PER_BURST, buildSparks, flashAge, sparkAge, sparkPos, writeBurst } from './sparkMath'

const origin = new THREE.Vector3(1, 2, 3)
const out = new THREE.Vector3(1, 0, 0)
const set = buildSparks(7, out)

describe('spark data', () => {
  it('is deterministic per seed and differs between seeds', () => {
    const again = buildSparks(7, out)
    expect([...again.dir]).toEqual([...set.dir])
    expect([...buildSparks(8, out).dir]).not.toEqual([...set.dir])
  })

  it('has unit directions, speeds and lives inside the config ranges', () => {
    for (let i = 0; i < set.count; i++) {
      expect(Math.hypot(set.dir[i * 3], set.dir[i * 3 + 1], set.dir[i * 3 + 2])).toBeCloseTo(1, 4)
      expect(set.speed[i]).toBeGreaterThanOrEqual(SPARKS.speed[0])
      expect(set.speed[i]).toBeLessThanOrEqual(SPARKS.speed[1])
      expect(set.life[i]).toBeGreaterThanOrEqual(SPARKS.life[0])
      expect(set.life[i]).toBeLessThanOrEqual(SPARKS.life[1])
    }
  })

  it('is over within the first half of the fall', () => {
    expect(SPARKS.life[1]).toBeLessThanOrEqual(0.5)
    expect(SPARKS.flashLife).toBeLessThan(SPARKS.life[0])
  })
})

describe('spark motion', () => {
  const p = new THREE.Vector3()

  it('starts at the cut point and flies away from it, then falls', () => {
    expect(sparkPos(set, 0, 0, origin, p).distanceTo(origin)).toBe(0)
    const mid = sparkPos(set, 0, set.life[0] * 0.5, origin, new THREE.Vector3())
    expect(mid.distanceTo(origin)).toBeGreaterThan(0.3)
    // Gravity: later, the spark is lower than the straight path would put it.
    const c = set.life[0]
    const end = sparkPos(set, 0, c, origin, new THREE.Vector3())
    const run = (set.speed[0] * (1 - Math.exp(-SPARKS.drag * c))) / SPARKS.drag
    expect(end.y).toBeLessThan(origin.y + set.dir[1] * run)
  })

  it('is a pure function of c: same c, same place, in any order (both scroll directions)', () => {
    const a = sparkPos(set, 3, 0.2, origin, new THREE.Vector3())
    sparkPos(set, 3, 0.4, origin, p)
    sparkPos(set, 3, 0.05, origin, p)
    expect(sparkPos(set, 3, 0.2, origin, new THREE.Vector3()).equals(a)).toBe(true)
  })

  it('is hidden before the cut and once spent, shown in between', () => {
    expect(sparkAge(0, 0.3)).toBe(-1)
    expect(sparkAge(-0.1, 0.3)).toBe(-1)
    expect(sparkAge(0.15, 0.3)).toBeCloseTo(0.5)
    expect(sparkAge(0.3, 0.3)).toBe(-1)
    expect(sparkAge(1, 0.3)).toBe(-1)
    expect(flashAge(0)).toBe(-1)
    expect(flashAge(SPARKS.flashLife / 2)).toBeCloseTo(0.5)
    expect(flashAge(SPARKS.flashLife)).toBe(-1)
  })
})

describe('writeBurst', () => {
  const n = QUADS_PER_BURST * 4
  const bufs = () => ({ head: new Float32Array(n * 3), tail: new Float32Array(n * 3), age: new Float32Array(n) })
  const alive = (b: ReturnType<typeof bufs>) => Array.from({ length: QUADS_PER_BURST }, (_, q) => b.age[q * 4]).filter((a) => a >= 0).length

  it('writes nothing visible at c = 0 and at c = 1', () => {
    for (const c of [0, 1]) {
      const b = bufs()
      expect(writeBurst(set, origin, c, 0, b.head, b.tail, b.age)).toBe(QUADS_PER_BURST)
      expect(alive(b)).toBe(0)
    }
  })

  it('shows the flash and every spark early, fewer later, only the sparks with a long life at the end', () => {
    const b = bufs()
    writeBurst(set, origin, 0.02, 0, b.head, b.tail, b.age)
    expect(alive(b)).toBe(QUADS_PER_BURST)
    const early = alive(b)
    writeBurst(set, origin, 0.3, 0, b.head, b.tail, b.age)
    const later = alive(b)
    expect(later).toBeLessThan(early)
    expect(later).toBeGreaterThan(0)
    writeBurst(set, origin, 0.51, 0, b.head, b.tail, b.age)
    expect(alive(b)).toBe(0)
  })

  it('is reversible: the same c writes the same buffers after any path', () => {
    const a = bufs()
    writeBurst(set, origin, 0.12, 0, a.head, a.tail, a.age)
    const b = bufs()
    for (const c of [0.4, 0.05, 0.9, 0.12]) writeBurst(set, origin, c, 0, b.head, b.tail, b.age)
    expect([...b.head]).toEqual([...a.head])
    expect([...b.tail]).toEqual([...a.tail])
    expect([...b.age]).toEqual([...a.age])
  })

  it('stretches each streak along its motion: the tail lags the head, the head starts at the cut point', () => {
    const b = bufs()
    writeBurst(set, origin, 0.1, 0, b.head, b.tail, b.age)
    const h = new THREE.Vector3(b.head[12], b.head[13], b.head[14])
    const t = new THREE.Vector3(b.tail[12], b.tail[13], b.tail[14])
    expect(h.distanceTo(t)).toBeGreaterThan(0.2)
    expect(t.distanceTo(origin)).toBeLessThan(h.distanceTo(origin))
  })
})

describe('cut point', () => {
  it('is on the standing tree at each slot (sprue tip), out direction horizontal and unit', () => {
    const p = new THREE.Vector3()
    const d = new THREE.Vector3()
    const m = new THREE.Matrix4()
    for (const slot of CUT_ORDER) {
      cutPoint(slot, p)
      cutOutDir(slot, d)
      expect(d.y).toBe(0)
      expect(d.length()).toBeCloseTo(1, 5)
      // The ring centre is further out than the cut point (the ring hangs on its branch), along the out direction.
      const centre = new THREE.Vector3().setFromMatrixPosition(slotMatrix(slot, m))
      expect(centre.clone().sub(p).dot(d)).toBeGreaterThan(0.1)
    }
  })

  it('differs per slot', () => {
    const pts = CUT_ORDER.map((s) => cutPoint(s, new THREE.Vector3()))
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) expect(pts[i].distanceTo(pts[j])).toBeGreaterThan(0.1)
  })
})

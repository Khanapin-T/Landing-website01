import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { SPRUE_WAX } from '../scene/tree/sprueWax'
import { RING, SPRUE_TIP, cylPoints, cylY, gap, makeBody, overlap, place, ringBody, shankBody, worldPoints, type Body } from '../test/ringBodies'
import { MOLD } from './mold'
import { PRINT } from './print'
import { RAW } from './water'
import {
  ACID_Y,
  CUT_ORDER,
  HERO_SLOT,
  JAR,
  JAR_FLOOR_Y,
  cutRingMatrix,
  heroMatrix,
  jarOffsetY,
  restMatrix,
  slotMatrix,
  treeMatrix,
} from './birth'

/*
 * Act 7 collisions, with the real-mesh ring solids of src/test/ringBodies.ts. The empty tree is its trunk, funnel and
 * the four wax stubs (TreeShapes).
 */

/** A ring "rests on" something closer than this (the stack gap is 0.02). */
const TOUCH = 0.03

// ---------- the empty tree (tree frame for the trunk and funnel, slot frames for the wax stubs) ----------

const TRUNK_PTS: number[] = []
cylPoints(MOLD.trunk.radius, MOLD.trunk.bottomY, MOLD.trunk.topY, TRUNK_PTS)
const trunk = place(makeBody('trunk', TRUNK_PTS, [cylY(MOLD.trunk.radius, MOLD.trunk.bottomY, MOLD.trunk.topY)]), treeMatrix(0, new THREE.Matrix4()))
const FUNNEL_PTS: number[] = []
cylPoints(MOLD.base.coneRadius, MOLD.flask.bottomY, MOLD.trunk.bottomY, FUNNEL_PTS)
const funnel = place(makeBody('funnel', FUNNEL_PTS, [cylY(MOLD.base.coneRadius, MOLD.flask.bottomY, MOLD.trunk.bottomY)]), treeMatrix(0, new THREE.Matrix4()))
/** Wax stub left on the trunk by slot i (from the sprue tip into the trunk). */
const stubOf = (i: number) => {
  const pts: number[] = []
  cylPoints(PRINT.sprue.radius, SPRUE_TIP - SPRUE_WAX.length, SPRUE_TIP, pts)
  return place(makeBody(`tree stub ${i}`, pts, [cylY(PRINT.sprue.radius, SPRUE_TIP - SPRUE_WAX.length, SPRUE_TIP)]), slotMatrix(i, new THREE.Matrix4()))
}
const STUBS = [0, 1, 2, 3].map(stubOf)

const INNER = JAR.radius - JAR.wall
const FLOOR = JAR_FLOOR_Y + JAR.wall
const radial = (p: THREE.Vector3) => Math.hypot(p.x, p.z - RAW.z)
const restBody = (slot: number, jarY = 0) => place(ringBody(`rest ${slot}`), restMatrix(slot, jarY, new THREE.Matrix4()))
const treeRing = (slot: number) => place(ringBody(`tree ring ${slot}`), slotMatrix(slot, new THREE.Matrix4()))

/** Outside the jar wall or under its floor (jar in place): a point below the rim must be inside the inner wall. */
const jarFault = (p: THREE.Vector3) => (p.y < JAR.rimY && radial(p) >= INNER) || p.y <= FLOOR - 1e-6

describe('ring solids', () => {
  it('match the mesh: about 2.35 x 2.48 x 1.03 with a 2.05 hole', () => {
    expect(Math.max(...RING.rOut)).toBeGreaterThan(0.5)
    expect(Math.max(...RING.hz)).toBeCloseTo(1.03 / 2.48 / 2, 2)
    expect(Math.min(...RING.rIn)).toBeGreaterThan(0.35)
    expect(Math.max(...RING.rIn)).toBeLessThan(0.47)
    expect(RING.surface.length).toBeGreaterThan(2000)
  })
})

describe('cut rings falling into the jar', () => {
  const STEPS = 400
  /** While the falling ring is closer than this to its tree pose its sprue is still in the joint (cut plane, trunk). */
  const JOINT = 0.1

  it('never pass through a ring on the tree, a ring in the jar, the trunk, the funnel, the stubs or the jar', () => {
    const faults: string[] = []
    const m = new THREE.Matrix4()
    const from = new THREE.Vector3()
    const at = new THREE.Vector3()
    CUT_ORDER.forEach((slot, k) => {
      const others = [
        ...CUT_ORDER.slice(k + 1).map(treeRing),
        ...CUT_ORDER.slice(0, k).map((s) => restBody(s)),
        funnel,
        ...STUBS.filter((_, i) => i !== slot),
      ]
      const joint = [trunk, STUBS[slot]]
      const ring = ringBody(`falling ${slot}`)
      const shank = shankBody(`falling ${slot} shank`)
      from.setFromMatrixPosition(slotMatrix(slot, m))
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS
        cutRingMatrix(slot, t, 0, m)
        place(ring, m)
        place(shank, m)
        for (const o of others) {
          const n = overlap(ring, o)
          if (n) faults.push(`slot ${slot} t=${t.toFixed(4)}: ${n} points with ${o.name}`)
        }
        const free = at.setFromMatrixPosition(m).distanceTo(from) > JOINT
        for (const o of joint) {
          const n = overlap(free ? ring : shank, o)
          if (n) faults.push(`slot ${slot} t=${t.toFixed(4)}: ${n} points with ${o.name}`)
        }
        const out = worldPoints(ring).filter(jarFault).length
        if (out) faults.push(`slot ${slot} t=${t.toFixed(4)}: ${out} points through the jar`)
      }
    })
    expect(faults.slice(0, 12)).toEqual([])
  })
})

describe('rings at rest in the jar', () => {
  const rest = [0, 1, 2, 3].map((s) => restBody(s))

  it('do not interpenetrate', () => {
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(overlap(rest[i], rest[j]), `${i} / ${j}`).toBe(0)
  })

  it('lie inside the jar, over its floor, under the acid', () => {
    for (const b of rest)
      for (const p of worldPoints(b)) {
        expect(radial(p)).toBeLessThan(INNER)
        expect(p.y).toBeGreaterThan(FLOOR - 1e-6)
        expect(p.y).toBeLessThan(ACID_Y)
      }
  })

  it('each rests on the floor, the wall or another ring (nothing floats)', () => {
    rest.forEach((b, i) => {
      const pts = worldPoints(b)
      const floor = Math.min(...pts.map((p) => p.y)) - FLOOR
      const wall = INNER - Math.max(...pts.map(radial))
      const rings = Math.min(...rest.filter((o) => o !== b).map((o) => gap(b, o, TOUCH).min))
      expect(Math.min(floor, wall, rings), `ring ${i}`).toBeLessThan(TOUCH)
    })
  })

  it('each would not tip: its centre lies inside the points it rests on (floor or the rings under it)', () => {
    // The rings lie flat; a real one settles by up to SETTLE onto its supports, so points that close count as contacts.
    const SETTLE = 0.06
    rest.forEach((b, i) => {
      const c = new THREE.Vector3().setFromMatrixPosition(b.m)
      const contacts = [
        ...worldPoints(b).filter((p) => p.y - FLOOR < SETTLE),
        ...rest.filter((o) => o !== b && new THREE.Vector3().setFromMatrixPosition(o.m).y < c.y).flatMap((o) => gap(b, o, SETTLE).contacts),
      ]
      const ang = contacts.map((p) => Math.atan2(p.z - c.z, p.x - c.x)).sort((x, y) => x - y)
      expect(ang.length, `ring ${i}`).toBeGreaterThan(2)
      let widest = ang[0] + 2 * Math.PI - ang.at(-1)!
      for (let k = 1; k < ang.length; k++) widest = Math.max(widest, ang[k] - ang[k - 1])
      expect(widest, `ring ${i}`).toBeLessThan(Math.PI * 0.9)
    })
  })

  it('puts the hero ring on top of the other three', () => {
    const y = (b: Body) => new THREE.Vector3().setFromMatrixPosition(b.m).y
    for (const o of rest) if (o !== rest[HERO_SLOT]) expect(y(o)).toBeLessThan(y(rest[HERO_SLOT]))
  })
})

describe('hero ring out of the jar', () => {
  it('rises clear of the jar wall and of the rings left in the jar (also while the jar sinks)', () => {
    const outEase = gsap.parseEase('power2.inOut')
    // birth.out and birth.jarAway run over the same screens (acts/birth/timeline.ts) with these eases.
    const awayEase = gsap.parseEase('power2.in')
    const hero = ringBody('hero')
    const m = new THREE.Matrix4()
    const faults: string[] = []
    for (let i = 0; i <= 200; i++) {
      const s = i / 200
      heroMatrix({ cut: 1, jar: 1, out: outEase(s), yaw: 0, tilt: 0 }, m)
      place(hero, m)
      for (const away of [0, awayEase(s)])
        for (const slot of CUT_ORDER.filter((x) => x !== HERO_SLOT)) {
          const n = overlap(hero, restBody(slot, jarOffsetY(1, away)))
          if (n) faults.push(`s=${s} away=${away.toFixed(3)}: ${n} points with ring ${slot}`)
        }
      const out = worldPoints(hero).filter((p) => p.y < JAR.rimY && radial(p) >= INNER).length
      if (out) faults.push(`s=${s}: ${out} points through the jar wall`)
    }
    expect(faults.slice(0, 12)).toEqual([])
  })
})

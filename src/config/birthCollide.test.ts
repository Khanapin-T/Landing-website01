import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { computeNormalization } from '../scene/ring/normalize'
import { SPRUE_WAX } from '../scene/tree/sprueWax'
import { MOLD } from './mold'
import { PRINT, RING_HALF } from './print'
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
 * Act 7 collisions. Each ring is a solid measured from the shipped mesh (public/models/ring_light.glb, normalized like
 * useRingGeometry): in the ring-local XY plane, per 2 deg sector about the ring axis (local Z), the hole radius, the
 * outer radius and the half width of the band, each taken over the sector and its two neighbours and grown by GROW,
 * so the solid is a little bigger than the ring everywhere. Plus its sprue stub (a cylinder, as scene/ring/sprue.ts).
 * Collisions test the real surface points of one body (sampled from the mesh triangles, SPACING apart) against the
 * grown solid of the other, both ways. The empty tree is its trunk, funnel and the four wax stubs (TreeShapes).
 */

/** Small on purpose: on the act 6 tree rings 1 and 3 hang only about 0.007 apart (plate corner to shank). */
const GROW = 0.002
const SECTORS = 180
const SPACING = 0.02
/** A ring "rests on" something closer than this (the stack gap is 0.02). */
const TOUCH = 0.03
const SPRUE_TOP = -RING_HALF + 0.02
const SPRUE_TIP = -(RING_HALF + PRINT.sprue.length)

interface Shape {
  /** Is the ring-local point inside the grown solid? */
  inside(x: number, y: number, z: number): boolean
  /** Distance from the ring-local point to the real-size solid (0 inside). */
  dist(x: number, y: number, z: number): number
}

interface Body {
  name: string
  m: THREE.Matrix4
  inv: THREE.Matrix4
  /** Real surface points, local, packed xyz. */
  pts: Float64Array
  shapes: Shape[]
  /** Bounding sphere in local space. */
  c: THREE.Vector3
  r: number
}

// ---------- the ring, measured from the mesh ----------

/** node:fs without @types/node (the tests run in Node). */
const fs = (globalThis as unknown as { process: { getBuiltinModule(id: 'node:fs'): { readFileSync(p: URL): Uint8Array } } }).process.getBuiltinModule('node:fs')

function readRing(): { pos: Float32Array; idx: Uint32Array } {
  const bytes = Uint8Array.from(fs.readFileSync(new URL('../../public/models/ring_light.glb', import.meta.url)))
  const view = new DataView(bytes.buffer)
  const jsonLen = view.getUint32(12, true)
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLen)))
  const binStart = 20 + jsonLen + 8
  const prim = json.meshes[0].primitives[0]
  const view0 = (accessor: number) => {
    const a = json.accessors[accessor]
    const bv = json.bufferViews[a.bufferView]
    return { a, start: binStart + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0) }
  }
  const p = view0(prim.attributes.POSITION)
  expect(p.a.componentType).toBe(5126)
  const pos = new Float32Array(bytes.buffer.slice(p.start, p.start + p.a.count * 12))
  const ix = view0(prim.indices)
  const idx =
    ix.a.componentType === 5125
      ? new Uint32Array(bytes.buffer.slice(ix.start, ix.start + ix.a.count * 4))
      : Uint32Array.from(new Uint16Array(bytes.buffer.slice(ix.start, ix.start + ix.a.count * 2)))
  return { pos, idx }
}

const sectorOf = (x: number, y: number) => Math.floor(((Math.atan2(y, x) + Math.PI) / (2 * Math.PI)) * SECTORS) % SECTORS

/** Ring-local mesh surface samples (normalized like useRingGeometry) and the sector profile. */
function measureRing() {
  const { pos, idx } = readRing()
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < pos.length; i += 3)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], pos[i + k])
      max[k] = Math.max(max[k], pos[i + k])
    }
  const n = computeNormalization({ min: min as [number, number, number], max: max as [number, number, number] }, 1)
  const v = (i: number, k: number) => (pos[i * 3 + k] + n.offset[k]) * n.scale
  const rIn = new Array(SECTORS).fill(Infinity)
  const rOut = new Array(SECTORS).fill(0)
  const hz = new Array(SECTORS).fill(0)
  const grid = new Map<string, [number, number, number]>()
  const a = [0, 0, 0]
  const b = [0, 0, 0]
  const c = [0, 0, 0]
  for (let t = 0; t < idx.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      a[k] = v(idx[t], k)
      b[k] = v(idx[t + 1], k)
      c[k] = v(idx[t + 2], k)
    }
    const edge = Math.max(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]), Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2]))
    const steps = Math.max(1, Math.ceil(edge / 0.008))
    for (let i = 0; i <= steps; i++)
      for (let j = 0; i + j <= steps; j++) {
        const u = i / steps
        const w = j / steps
        const x = a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * w
        const y = a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * w
        const z = a[2] + (b[2] - a[2]) * u + (c[2] - a[2]) * w
        const s = sectorOf(x, y)
        const r = Math.hypot(x, y)
        rIn[s] = Math.min(rIn[s], r)
        rOut[s] = Math.max(rOut[s], r)
        hz[s] = Math.max(hz[s], Math.abs(z))
        const key = `${Math.round(x / SPACING)},${Math.round(y / SPACING)},${Math.round(z / SPACING)}`
        if (!grid.has(key)) grid.set(key, [x, y, z])
      }
  }
  const nb = (arr: number[], s: number, f: (...v: number[]) => number) => f(arr[(s + SECTORS - 1) % SECTORS], arr[s], arr[(s + 1) % SECTORS])
  const grown = {
    rIn: rIn.map((_, s) => nb(rIn, s, Math.min) - GROW),
    rOut: rOut.map((_, s) => nb(rOut, s, Math.max) + GROW),
    hz: hz.map((_, s) => nb(hz, s, Math.max) + GROW),
  }
  return { surface: [...grid.values()], rIn, rOut, hz, grown }
}

const RING = measureRing()

const ringShape: Shape = {
  inside(x, y, z) {
    const s = sectorOf(x, y)
    const r = Math.hypot(x, y)
    return r > RING.grown.rIn[s] && r < RING.grown.rOut[s] && Math.abs(z) < RING.grown.hz[s]
  },
  dist(x, y, z) {
    const s = sectorOf(x, y)
    const r = Math.hypot(x, y)
    return Math.hypot(Math.max(r - RING.rOut[s], RING.rIn[s] - r, 0), Math.max(Math.abs(z) - RING.hz[s], 0))
  },
}

/** A cylinder along local Y. */
function cylY(radius: number, y0: number, y1: number): Shape {
  return {
    inside: (x, y, z) => Math.hypot(x, z) < radius + GROW && y > y0 - GROW && y < y1 + GROW,
    dist: (x, y, z) => Math.hypot(Math.max(Math.hypot(x, z) - radius, 0), Math.max(y0 - y, y - y1, 0)),
  }
}

/** Surface points of a cylinder along local Y (side and both caps). */
function cylPoints(radius: number, y0: number, y1: number, out: number[]) {
  const around = Math.max(8, Math.ceil((2 * Math.PI * radius) / SPACING))
  const along = Math.max(2, Math.ceil((y1 - y0) / SPACING))
  for (let i = 0; i < around; i++) {
    const a = (i / around) * 2 * Math.PI
    for (let j = 0; j <= along; j++) out.push(radius * Math.cos(a), y0 + ((y1 - y0) * j) / along, radius * Math.sin(a))
    for (const y of [y0, y1]) for (let r = SPACING; r < radius; r += SPACING) out.push(r * Math.cos(a), y, r * Math.sin(a))
  }
  for (const y of [y0, y1]) out.push(0, y, 0)
}

function makeBody(name: string, pts: number[], shapes: Shape[]): Body {
  const box = new THREE.Box3()
  const p = new THREE.Vector3()
  for (let i = 0; i < pts.length; i += 3) box.expandByPoint(p.set(pts[i], pts[i + 1], pts[i + 2]))
  const c = box.getCenter(new THREE.Vector3())
  let r = 0
  for (let i = 0; i < pts.length; i += 3) r = Math.max(r, p.set(pts[i], pts[i + 1], pts[i + 2]).distanceTo(c))
  return { name, m: new THREE.Matrix4(), inv: new THREE.Matrix4(), pts: Float64Array.from(pts), shapes, c, r: r + 2 * GROW }
}

const SPRUE = cylY(PRINT.sprue.radius, SPRUE_TIP, SPRUE_TOP)
const RING_PTS: number[] = RING.surface.flat()
const SPRUE_PTS: number[] = []
cylPoints(PRINT.sprue.radius, SPRUE_TIP, SPRUE_TOP, SPRUE_PTS)

const ringBody = (name: string) => makeBody(name, [...RING_PTS, ...SPRUE_PTS], [ringShape, SPRUE])
/** The ring without its sprue: the part tested against the trunk joint while the sprue still sits in it. */
const shankBody = (name: string) => makeBody(name, RING_PTS, [ringShape])

function place(b: Body, m: THREE.Matrix4): Body {
  b.m.copy(m)
  b.inv.copy(m).invert()
  return b
}

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

// ---------- queries ----------

const rel = new THREE.Matrix4()
const cA = new THREE.Vector3()
const cB = new THREE.Vector3()

/** Number of real surface points of `a` inside the grown solid of `b` (bounding spheres first). */
function pointsInside(a: Body, b: Body): number {
  cA.copy(a.c).applyMatrix4(a.m)
  cB.copy(b.c).applyMatrix4(b.m)
  if (cA.distanceTo(cB) > a.r + b.r) return 0
  const e = rel.copy(b.inv).multiply(a.m).elements
  let n = 0
  const p = a.pts
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i]
    const y = p[i + 1]
    const z = p[i + 2]
    const lx = e[0] * x + e[4] * y + e[8] * z + e[12]
    const ly = e[1] * x + e[5] * y + e[9] * z + e[13]
    const lz = e[2] * x + e[6] * y + e[10] * z + e[14]
    for (const s of b.shapes)
      if (s.inside(lx, ly, lz)) {
        n++
        break
      }
  }
  return n
}

const overlap = (a: Body, b: Body) => pointsInside(a, b) + pointsInside(b, a)

/** World positions of a body's surface points. */
function worldPoints(b: Body): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  for (let i = 0; i < b.pts.length; i += 3) out.push(new THREE.Vector3(b.pts[i], b.pts[i + 1], b.pts[i + 2]).applyMatrix4(b.m))
  return out
}

/** Smallest distance from the surface points of `a` to the real solid of `b`, and the points closer than `touch`. */
function gap(a: Body, b: Body, touch: number): { min: number; contacts: THREE.Vector3[] } {
  const e = rel.copy(b.inv).multiply(a.m).elements
  let min = Infinity
  const contacts: THREE.Vector3[] = []
  const p = a.pts
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i]
    const y = p[i + 1]
    const z = p[i + 2]
    const lx = e[0] * x + e[4] * y + e[8] * z + e[12]
    const ly = e[1] * x + e[5] * y + e[9] * z + e[13]
    const lz = e[2] * x + e[6] * y + e[10] * z + e[14]
    let d = Infinity
    for (const s of b.shapes) d = Math.min(d, s.dist(lx, ly, lz))
    min = Math.min(min, d)
    if (d < touch) contacts.push(new THREE.Vector3(x, y, z).applyMatrix4(a.m))
  }
  return { min, contacts }
}

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

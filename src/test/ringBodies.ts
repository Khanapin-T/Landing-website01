import * as THREE from 'three'
import { computeNormalization } from '../scene/ring/normalize'
import { PRINT, RING_HALF } from '../config/print'

/*
 * Shared real-mesh collision model for tests (not a test file itself). Each ring is a solid measured from the shipped
 * mesh (public/models/ring_light.glb, normalized like useRingGeometry): in the ring-local XY plane, per 2 deg sector
 * about the ring axis (local Z), the hole radius, the outer radius and the half width of the band, each taken over the
 * sector and its two neighbours and grown by GROW, so the solid is a little bigger than the ring everywhere. Plus its
 * sprue (a cylinder, as scene/ring/sprue.ts). Collisions test the real surface points of one body (sampled from the
 * mesh triangles, SPACING apart) against the grown solid of the other, both ways.
 */

/** Small on purpose: on the act 6 tree rings 1 and 3 hang only about 0.007 apart (plate corner to shank). */
export const GROW = 0.002
const SECTORS = 180
export const SPACING = 0.02
const SPRUE_TOP = -RING_HALF + 0.02
export const SPRUE_TIP = -(RING_HALF + PRINT.sprue.length)

export interface Shape {
  /** Is the local point inside the grown solid? */
  inside(x: number, y: number, z: number): boolean
  /** Distance from the local point to the real-size solid (0 inside). */
  dist(x: number, y: number, z: number): number
}

export interface Body {
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
  if (p.a.componentType !== 5126) throw new Error('ring_light.glb: positions are not float32')
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

/** The measured ring (surface samples and the real and grown sector profiles). */
export const RING = measureRing()

export const ringShape: Shape = {
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
export function cylY(radius: number, y0: number, y1: number): Shape {
  return {
    inside: (x, y, z) => Math.hypot(x, z) < radius + GROW && y > y0 - GROW && y < y1 + GROW,
    dist: (x, y, z) => Math.hypot(Math.max(Math.hypot(x, z) - radius, 0), Math.max(y0 - y, y - y1, 0)),
  }
}

/** Surface points of a cylinder along local Y (side and both caps). */
export function cylPoints(radius: number, y0: number, y1: number, out: number[]) {
  const around = Math.max(8, Math.ceil((2 * Math.PI * radius) / SPACING))
  const along = Math.max(2, Math.ceil((y1 - y0) / SPACING))
  for (let i = 0; i < around; i++) {
    const a = (i / around) * 2 * Math.PI
    for (let j = 0; j <= along; j++) out.push(radius * Math.cos(a), y0 + ((y1 - y0) * j) / along, radius * Math.sin(a))
    for (const y of [y0, y1]) for (let r = SPACING; r < radius; r += SPACING) out.push(r * Math.cos(a), y, r * Math.sin(a))
  }
  for (const y of [y0, y1]) out.push(0, y, 0)
}

export function makeBody(name: string, pts: number[], shapes: Shape[]): Body {
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

/** A ring with its sprue (ring-local frame). */
export const ringBody = (name: string) => makeBody(name, [...RING_PTS, ...SPRUE_PTS], [ringShape, SPRUE])
/** The ring without its sprue. */
export const shankBody = (name: string) => makeBody(name, RING_PTS, [ringShape])

/** Sets the body's local -> world matrix (it may carry a uniform scale). */
export function place(b: Body, m: THREE.Matrix4): Body {
  b.m.copy(m)
  b.inv.copy(m).invert()
  return b
}

// ---------- queries ----------

const rel = new THREE.Matrix4()
const cA = new THREE.Vector3()
const cB = new THREE.Vector3()
const sA = new THREE.Vector3()
const sB = new THREE.Vector3()

/** Largest axis scale of a matrix (the world size of a unit local length, at most). */
const maxScale = (m: THREE.Matrix4, v: THREE.Vector3) => {
  const e = m.elements
  return Math.max(v.set(e[0], e[1], e[2]).length(), v.set(e[4], e[5], e[6]).length(), v.set(e[8], e[9], e[10]).length())
}

/** Number of real surface points of `a` inside the grown solid of `b` (bounding spheres first). */
export function pointsInside(a: Body, b: Body): number {
  cA.copy(a.c).applyMatrix4(a.m)
  cB.copy(b.c).applyMatrix4(b.m)
  if (cA.distanceTo(cB) > a.r * maxScale(a.m, sA) + b.r * maxScale(b.m, sB)) return 0
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

/** Points of either body inside the other's grown solid. */
export const overlap = (a: Body, b: Body) => pointsInside(a, b) + pointsInside(b, a)

/** World positions of a body's surface points. */
export function worldPoints(b: Body): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  for (let i = 0; i < b.pts.length; i += 3) out.push(new THREE.Vector3(b.pts[i], b.pts[i + 1], b.pts[i + 2]).applyMatrix4(b.m))
  return out
}

/** Smallest distance from the surface points of `a` to the real solid of `b` (in b-local units), and the points closer than `touch`. */
export function gap(a: Body, b: Body, touch: number): { min: number; contacts: THREE.Vector3[] } {
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

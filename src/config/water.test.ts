import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { FLIP } from './fire'
import { MOLD } from './mold'
import { FLANGE_RADIUS, FLASK_RADIUS } from '../acts/mold/flaskMaterial'
import {
  AWAY,
  BUCKET,
  CAM_WATER,
  DIP_DEPTH,
  FLASK_FLANGE_RADIUS,
  FLASK_TUBE_RADIUS,
  FOOT_END_Y,
  RAW,
  SIDE_FLIP,
  SLIDE,
  TREE_SPAN,
  WATER_Y,
  bucketInnerRadius,
  bucketOffset,
  bucketProfile,
  finalTreeMatrix,
  flaskMatrix,
  flaskOffset,
  rawTreeMatrix,
} from './water'

const at = (m: THREE.Matrix4, x: number, y: number, z = 0) => new THREE.Vector3(x, y, z).applyMatrix4(m)

/** NDC of a world point seen from a camera target (fov 30, like the Stage camera). */
function ndc(cam: { y: number; z: number; look: number }, aspect: number, p: THREE.Vector3): THREE.Vector3 {
  const c = new THREE.PerspectiveCamera(30, aspect, 0.1, 100)
  c.position.set(0, cam.y, cam.z)
  c.lookAt(0, cam.look, 0)
  c.updateMatrixWorld()
  return p.clone().project(c)
}
const ASPECTS = [16 / 9, 1536 / 730]

describe('flask radii', () => {
  it('match the flask geometry', () => {
    expect(FLASK_FLANGE_RADIUS).toBeCloseTo(FLANGE_RADIUS, 9)
    expect(FLASK_TUBE_RADIUS).toBeCloseTo(FLASK_RADIUS, 9)
  })
})

describe('bucket and water', () => {
  it('has the water under the rim and over the floor', () => {
    expect(WATER_Y).toBeLessThan(BUCKET.rimY)
    expect(WATER_Y).toBeGreaterThan(BUCKET.bottomY + BUCKET.wall)
  })

  it('lets the lying flask clear the rim before it goes down', () => {
    expect(FLIP.pivotY - FLASK_FLANGE_RADIUS).toBeGreaterThan(BUCKET.rimY + BUCKET.lip)
  })

  it('puts the dipped flask fully under the water and above the floor', () => {
    const axis = FLIP.pivotY + flaskOffset({ dip: 1, away: 0 }).y
    expect(axis + FLASK_FLANGE_RADIUS).toBeLessThan(WATER_Y)
    expect(axis - FLASK_FLANGE_RADIUS).toBeGreaterThan(BUCKET.bottomY + BUCKET.wall)
  })

  it('fits the lying flask inside the bucket wall in plan view', () => {
    const r = bucketInnerRadius(FLIP.pivotY + flaskOffset({ dip: 1, away: 0 }).y - FLASK_FLANGE_RADIUS)
    // (axial distance from the pivot, radius) of the rim end, the flange and the foot end.
    const parts: [number, number][] = [
      [MOLD.flask.bottomY + MOLD.flask.height - FLIP.pivotY, FLASK_TUBE_RADIUS],
      [MOLD.flask.bottomY - FLIP.pivotY, FLASK_FLANGE_RADIUS],
      [FOOT_END_Y - FLIP.pivotY, FLASK_TUBE_RADIUS],
    ]
    for (const [axial, radius] of parts) expect(Math.hypot(axial, radius)).toBeLessThan(r)
  })

  it('tapers the bucket from the rim to the floor and closes the profile on the axis', () => {
    expect(bucketInnerRadius(BUCKET.rimY)).toBeCloseTo(BUCKET.topRadius - BUCKET.wall, 9)
    expect(bucketInnerRadius(BUCKET.bottomY)).toBeCloseTo(BUCKET.bottomRadius - BUCKET.wall, 9)
    const p = bucketProfile()
    expect(p[0][0]).toBe(0)
    expect(p.at(-1)![0]).toBe(0)
  })

  it('brings the bucket up from below the frame and sends it away with the flask', () => {
    expect(bucketOffset(1, 0)).toEqual({ y: 0, z: 0 })
    expect(bucketOffset(0, 0).y).toBe(BUCKET.dropOffset)
    expect(bucketOffset(1, 1)).toEqual(flaskOffset({ dip: 0, away: 1 }))
    expect(AWAY.back).toBeGreaterThan(0)
  })
})

describe('flask frame', () => {
  it('is the act 5 frame when flipped and at its place', () => {
    const m = flaskMatrix({ dip: 0, away: 0, flip: 1 }, new THREE.Matrix4())
    const p = at(m, 0, MOLD.trunk.topY)
    expect(p.x).toBeCloseTo(0, 9)
    expect(p.y).toBeCloseTo(2 * FLIP.pivotY - MOLD.trunk.topY, 9)
  })

  it('lies on its side with the foot (funnel) end to the right at SIDE_FLIP', () => {
    const m = flaskMatrix({ dip: 0, away: 0, flip: SIDE_FLIP }, new THREE.Matrix4())
    const foot = at(m, 0, FOOT_END_Y)
    expect(foot.x).toBeCloseTo(FLIP.pivotY - FOOT_END_Y, 9)
    expect(foot.y).toBeCloseTo(FLIP.pivotY, 9)
    expect(DIP_DEPTH).toBeGreaterThan(0)
  })
})

describe('raw tree pose', () => {
  const m = new THREE.Matrix4()
  const f = { dip: 0, flip: SIDE_FLIP }

  it('sits exactly in the flask frame before it slides', () => {
    rawTreeMatrix(f, { slide: 0, stand: 0, yaw: 0 }, m)
    const ref = flaskMatrix({ ...f, away: 0 }, new THREE.Matrix4())
    expect(m.equals(ref)).toBe(true)
  })

  it('ignores the flask going away (the tree has left it by then)', () => {
    const a = rawTreeMatrix({ dip: 0, flip: SIDE_FLIP }, { slide: 1, stand: 0.5, yaw: 0.2 }, new THREE.Matrix4())
    const b = rawTreeMatrix({ dip: 0, flip: SIDE_FLIP, away: 1 } as never, { slide: 1, stand: 0.5, yaw: 0.2 }, new THREE.Matrix4())
    expect(a.equals(b)).toBe(true)
  })

  it('is clear of the foot end once it has slid out, funnel first', () => {
    rawTreeMatrix(f, { slide: 1, stand: 0, yaw: 0 }, m)
    const footX = at(flaskMatrix({ ...f, away: 0 }, new THREE.Matrix4()), 0, FOOT_END_Y).x
    expect(at(m, 0, TREE_SPAN.topY).x).toBeGreaterThan(footX)
    // Funnel first: the funnel mouth is farther out than the top.
    expect(at(m, 0, TREE_SPAN.bottomY).x).toBeGreaterThan(at(m, 0, TREE_SPAN.topY).x)
    expect(SLIDE).toBeGreaterThan(TREE_SPAN.topY - FOOT_END_Y)
  })

  it('stands upright, funnel up, centred at RAW when it has stood up', () => {
    rawTreeMatrix(f, { slide: 1, stand: 1, yaw: 0.4 }, m)
    const ref = finalTreeMatrix(0.4, new THREE.Matrix4())
    const funnel = at(m, 0, TREE_SPAN.bottomY)
    const top = at(m, 0, TREE_SPAN.topY)
    expect(funnel.y).toBeGreaterThan(top.y)
    expect(funnel.x).toBeCloseTo(0, 6)
    expect(top.x).toBeCloseTo(0, 6)
    const mid = at(m, 0, (TREE_SPAN.bottomY + TREE_SPAN.topY) / 2)
    expect(mid.y).toBeCloseTo(RAW.y, 6)
    expect(mid.z).toBeCloseTo(RAW.z, 6)
    for (const y of [TREE_SPAN.bottomY, TREE_SPAN.topY]) expect(at(m, 0.3, y, 0.2).distanceTo(at(ref, 0.3, y, 0.2))).toBeLessThan(1e-6)
  })
})

describe('framing', () => {
  it('shows the whole bucket and the flask above it from the bucket view', () => {
    const pts = [
      new THREE.Vector3(0, BUCKET.bottomY, BUCKET.bottomRadius), // bucket floor, front edge
      new THREE.Vector3(0, BUCKET.rimY, -BUCKET.topRadius), // rim, back edge
      new THREE.Vector3(0, FLIP.pivotY + FLASK_FLANGE_RADIUS, 0), // lying flask, top
      new THREE.Vector3(0, MOLD.flask.bottomY + MOLD.flask.height, 0), // upright flask (mid turn), rim end
    ]
    for (const aspect of ASPECTS) for (const p of pts) expect(Math.abs(ndc(CAM_WATER.bucket, aspect, p).y)).toBeLessThan(0.92)
  })

  it('frames the standing tree with a margin', () => {
    const m = finalTreeMatrix(0, new THREE.Matrix4())
    for (const aspect of ASPECTS)
      for (const y of [TREE_SPAN.bottomY, TREE_SPAN.topY]) expect(Math.abs(ndc(CAM_WATER.raw, aspect, at(m, 0, y)).y)).toBeLessThan(0.8)
  })
})

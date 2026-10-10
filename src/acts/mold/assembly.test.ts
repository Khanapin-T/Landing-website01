import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { TOTAL_SCREENS } from '../../config/acts'
import { ASSEMBLY } from '../../config/assembly'
import { MOLD } from '../../config/mold'
import { RING_COUNT } from '../../config/print'
import { focusOffsetX } from '../../scene/cameraMath'
import { ringPlacement } from '../../scene/ring/placement'
import { newPose } from '../../scene/ring/pose'
import { slotPose } from '../../scene/tree/slots'
import { SPRUE_WAX, stubGrowth } from '../../scene/tree/sprueWax'
import { CAM_INITIAL, FLASK_INITIAL, RING_INITIAL, STREAM_INITIAL, story } from '../../story/store'
import { SPRUE_TIP, cylPoints, cylY, makeBody, overlap, place, pointsInside, ringBody, shankBody } from '../../test/ringBodies'
import { registerIdea } from '../idea/timeline'
import { IDEA_INITIAL, idea } from '../idea/state'
import { registerPrint } from '../print/timeline'
import { PRINT_INITIAL, print } from '../print/state'
import { MOLD_BEATS as B } from './beats'
import { registerMold } from './timeline'
import { MOLD_INITIAL, mold } from './state'
import { PRINT as PRINT_CFG } from '../../config/print'

/*
 * Act 3 assembly against the real ring mesh (src/test/ringBodies.ts), driven by the real master timeline (acts 1-3):
 * from the end of the print (the four small rings stand where Act 2 left them) through the base rising with the trunk
 * on it and the four flights straight onto the tree, every 0.0005 screens. No ring may enter another
 * ring (waiting, flying or seated), the trunk (wherever it is on its way up), a seated ring's wax stub, the
 * crucible-former cone or the rubber cup. A ring's own sprue meets the trunk only at the very end of its slide (the
 * joint the wax stub fills): within JOINT of its seat only the ring without its sprue is tested against the trunk.
 */

/** From the start of the lift (supports gone): the rings turn over, spread and grow to full size, then fly. */
const FROM = 3.72
const STEP = 0.0005
/** Distance from the seat below which the sprue end is in the trunk joint (it enters the trunk within the last 0.09). */
const JOINT = 0.12

let tl: gsap.core.Timeline
let offs: (() => void)[] = []

beforeAll(() => {
  Object.assign(idea, IDEA_INITIAL)
  Object.assign(print, PRINT_INITIAL)
  Object.assign(mold, MOLD_INITIAL, { clones: [...MOLD_INITIAL.clones] })
  Object.assign(story.ring, RING_INITIAL)
  Object.assign(story.flask, FLASK_INITIAL)
  Object.assign(story.stream, STREAM_INITIAL)
  Object.assign(story.cam, CAM_INITIAL)
  tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  tl.set({}, {}, TOTAL_SCREENS)
  offs = [registerIdea(tl), registerPrint(tl), registerMold(tl)]
})

afterAll(() => {
  offs.forEach((off) => off())
  tl.kill()
})

// ---------- the scene's bodies ----------

const pose = newPose()
const ONE = new THREE.Vector3(1, 1, 1)
const SLOT_POS = Array.from({ length: RING_COUNT }, (_, k) => slotPose(k).position)

const rings = Array.from({ length: RING_COUNT }, (_, k) => ringBody(`ring ${k}`))
const shanks = Array.from({ length: RING_COUNT }, (_, k) => shankBody(`ring ${k} shank`))
/** Distance of each ring from its seat (for the trunk joint). */
const seatDist = new Array<number>(RING_COUNT).fill(Infinity)

function placeRings() {
  const m = new THREE.Matrix4()
  const s3 = new THREE.Vector3()
  for (let k = 0; k < RING_COUNT; k++) {
    const s = ringPlacement(story.ring, k, pose)
    m.compose(pose.position, pose.quaternion, s3.setScalar(s))
    place(rings[k], m)
    place(shanks[k], m)
    seatDist[k] = pose.position.distanceTo(SLOT_POS[k])
  }
}

/** The whole trunk (the real one tapers to 0.85 of the radius at the top: a full cylinder is stricter); placed by mold.trunk. */
const TRUNK_PTS: number[] = []
cylPoints(MOLD.trunk.radius, MOLD.trunk.bottomY, MOLD.trunk.topY, TRUNK_PTS)
const trunkBody = makeBody('trunk', TRUNK_PTS, [cylY(MOLD.trunk.radius, MOLD.trunk.bottomY, MOLD.trunk.topY)])

// The rubber base (moves with mold.base): the crucible-former cone (a full cylinder of its widest radius, from the cup
// floor up to the trunk bottom) and the cup (a solid cylinder, only ring points against it).
const { base } = MOLD
const floorY = MOLD.baseTopY - base.height + base.floor
const CONE_PTS: number[] = []
cylPoints(base.coneRadius, floorY, MOLD.trunk.bottomY, CONE_PTS)
const cone = makeBody('cone', CONE_PTS, [cylY(base.coneRadius, floorY, MOLD.trunk.bottomY)])
const cupY0 = MOLD.baseTopY - base.height
const R = base.radius
const cup = makeBody('cup', [-R, cupY0, 0, R, MOLD.baseTopY, 0, 0, cupY0, -R, 0, MOLD.baseTopY, R], [cylY(R, cupY0, MOLD.baseTopY)])

/** A seated ring's wax stub (full size: stricter than the growing one), in its slot frame. */
const stubs = Array.from({ length: RING_COUNT }, (_, k) => {
  const pts: number[] = []
  cylPoints(PRINT_CFG.sprue.radius, SPRUE_TIP - SPRUE_WAX.length, SPRUE_TIP, pts)
  const p = slotPose(k)
  return place(
    makeBody(`stub ${k}`, pts, [cylY(PRINT_CFG.sprue.radius, SPRUE_TIP - SPRUE_WAX.length, SPRUE_TIP)]),
    new THREE.Matrix4().compose(p.position, p.quaternion, ONE),
  )
})

const sameMatrix = (a: THREE.Matrix4, b: THREE.Matrix4) => a.elements.every((v, i) => v === b.elements[i])

describe('act 3 assembly (real ring mesh)', () => {
  it(
    'never puts a ring through another ring, the trunk, a stub, the cone or the cup, from the print grid to the last seat',
    () => {
      const faults: string[] = []
      const last = rings.map(() => new THREE.Matrix4().makeScale(0, 0, 0))
      let lastTrunkY = NaN
      let lastBase = NaN
      const baseM = new THREE.Matrix4()
      const end = B.flaskFrom
      for (let t = FROM; t <= end + 1e-9; t += STEP) {
        tl.time(t)
        placeRings()
        const moved = rings.map((r, k) => !sameMatrix(r.m, last[k]))
        rings.forEach((r, k) => last[k].copy(r.m))
        const trunk = mold.trunk > 0.001 ? trunkBody : null
        const trunkY = (1 - mold.trunk) * base.dropOffset
        const trunkChanged = trunkY !== lastTrunkY
        lastTrunkY = trunkY
        if (trunk && trunkChanged) place(trunkBody, new THREE.Matrix4().makeTranslation(0, trunkY, 0))
        const baseY = (1 - mold.base) * base.dropOffset
        const baseChanged = baseY !== lastBase
        lastBase = baseY
        if (baseChanged) {
          baseM.makeTranslation(0, baseY, 0)
          place(cone, baseM)
          place(cup, baseM)
        }
        const at = `t=${t.toFixed(4)}`
        for (let i = 0; i < RING_COUNT; i++) {
          for (let j = i + 1; j < RING_COUNT; j++) {
            if (!moved[i] && !moved[j]) continue
            const n = overlap(rings[i], rings[j])
            if (n) faults.push(`${at}: ring ${i} / ring ${j}: ${n} points`)
          }
          if (trunk && (moved[i] || trunkChanged)) {
            const body = seatDist[i] < JOINT ? shanks[i] : rings[i]
            const n = overlap(body, trunk)
            if (n) faults.push(`${at}: ring ${i} / trunk (${mold.trunk.toFixed(3)}): ${n} points`)
          }
          for (let j = 0; j < RING_COUNT; j++) {
            if (j === i || stubGrowth(story.ring.flight[j]) <= 0) continue
            if (!moved[i] && !moved[j]) continue
            const n = overlap(rings[i], stubs[j])
            if (n) faults.push(`${at}: ring ${i} / stub ${j}: ${n} points`)
          }
          if (moved[i] || baseChanged) {
            const n = overlap(rings[i], cone) + pointsInside(rings[i], cup)
            if (n) faults.push(`${at}: ring ${i} / base: ${n} points`)
          }
        }
      }
      expect(faults.slice(0, 12)).toEqual([])
      // Every flight has run to its seat by then.
      expect([...story.ring.flight]).toEqual([1, 1, 1, 1])
    },
    60_000,
  )

  it('keeps every ring in the frame at 16:9 and at 1536 x 730 while it waits and flies (copy column aside)', () => {
    const views = [
      { w: 1920, h: 1080 },
      { w: 1536, h: 730 },
    ].map(({ w, h }) => {
      const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 100)
      cam.setViewOffset(w, h, focusOffsetX(w), 0, w, h)
      cam.updateProjectionMatrix()
      return cam
    })
    const p = new THREE.Vector3()
    const faults: string[] = []
    for (let t = 4.0; t <= B.flaskFrom + 1e-9; t += 0.005) {
      tl.time(t)
      placeRings()
      for (const cam of views) {
        cam.position.set(0, story.cam.y, story.cam.z)
        cam.lookAt(0, story.cam.look, 0)
        cam.updateMatrixWorld()
        for (let k = 0; k < RING_COUNT; k++) {
          const r = rings[k]
          for (let i = 0; i < r.pts.length; i += 3 * 40) {
            p.set(r.pts[i], r.pts[i + 1], r.pts[i + 2]).applyMatrix4(r.m).project(cam)
            if (Math.abs(p.x) > 1 || Math.abs(p.y) > 1) {
              faults.push(`t=${t.toFixed(3)} ${cam.aspect.toFixed(2)}: ring ${k} out of frame (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`)
              break
            }
          }
        }
      }
    }
    expect(faults.slice(0, 8)).toEqual([])
  })

  it('keeps every ring off the copy column (1920 x 1080) while it waits and flies', () => {
    // The copy column (left): the Act 3 heading down to 38% of the height ends at 31% of the width; below it the
    // paragraphs and the step list of acts 2 and 3 keep clear of 29% (560 px). Screen fractions at 1920 x 1080.
    const w = 1920
    const h = 1080
    const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 100)
    cam.setViewOffset(w, h, focusOffsetX(w), 0, w, h)
    cam.updateProjectionMatrix()
    const p = new THREE.Vector3()
    const faults: string[] = []
    for (let t = 3.97; t <= B.flaskFrom + 1e-9; t += 0.005) {
      tl.time(t)
      placeRings()
      cam.position.set(0, story.cam.y, story.cam.z)
      cam.lookAt(0, story.cam.look, 0)
      cam.updateMatrixWorld()
      for (let k = 0; k < RING_COUNT; k++) {
        const r = rings[k]
        for (let i = 0; i < r.pts.length; i += 3 * 20) {
          p.set(r.pts[i], r.pts[i + 1], r.pts[i + 2]).applyMatrix4(r.m).project(cam)
          const fx = (p.x + 1) / 2
          const fy = (1 - p.y) / 2
          const edge = fy < 0.38 ? 0.31 : 0.29
          if (fx < edge) {
            faults.push(`t=${t.toFixed(3)}: ring ${k} over the copy (${fx.toFixed(3)}, ${fy.toFixed(3)})`)
            break
          }
        }
      }
    }
    expect(faults.slice(0, 8)).toEqual([])
  })

  it('flies the rings in ASSEMBLY.order, each one right after the one before (staggered starts)', () => {
    expect([...ASSEMBLY.order].sort()).toEqual([0, 1, 2, 3])
    for (let i = 1; i < RING_COUNT; i++) {
      const a = ASSEMBLY.order[i - 1]
      const b = ASSEMBLY.order[i]
      tl.time(B.flightFrom + i * B.flightStagger)
      expect(story.ring.flight[b]).toBe(0)
      expect(story.ring.flight[a]).toBeGreaterThan(0)
    }
    // The lower slots are seated before an upper-slot ring starts its slide (the rings interlock there).
    for (let i = 2; i < RING_COUNT; i++) {
      tl.time(B.flightFrom + i * B.flightStagger + ASSEMBLY.curve * B.flightLen)
      for (const j of ASSEMBLY.order.slice(0, 2)) expect(story.ring.flight[j]).toBe(1)
    }
  })
})

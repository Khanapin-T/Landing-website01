import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { RAW, finalTreeMatrix } from './water'
import { slotPose } from '../scene/tree/slots'
import {
  ACID_Y,
  CAM_BIRTH,
  CUT_ORDER,
  FINAL,
  HERO_SLOT,
  JAR,
  JAR_FLOOR_Y,
  LINE,
  LINE_DIR,
  LINE_NORMAL,
  POLISH,
  POLISH_TURN,
  cutRingMatrix,
  heroMatrix,
  jarOffsetY,
  jarProfile,
  mirrorMatrix,
  polishLinePoint,
  polishMatrix,
  restMatrix,
  ringPoints,
  slotMatrix,
  treeMatrix,
} from './birth'

const close = (a: THREE.Matrix4, b: THREE.Matrix4) => a.elements.forEach((v, i) => expect(v).toBeCloseTo(b.elements[i], 6))
const inner = JAR.radius - JAR.wall
const radial = (p: THREE.Vector3) => Math.hypot(p.x, p.z - RAW.z)

/** NDC of a world point seen from a camera target (fov 30, like the Stage camera). */
function ndc(cam: { y: number; z: number; look: number }, aspect: number, p: THREE.Vector3): THREE.Vector3 {
  const c = new THREE.PerspectiveCamera(30, aspect, 0.1, 100)
  c.position.set(0, cam.y, cam.z)
  c.lookAt(0, cam.look, 0)
  c.updateMatrixWorld()
  return p.clone().project(c)
}
const ASPECTS = [16 / 9, 1536 / 730]
const side = (p: THREE.Vector3, line: number) => p.clone().sub(polishLinePoint(line, new THREE.Vector3())).dot(LINE_NORMAL)

describe('jar', () => {
  it('is low: about as wide as the flask and no taller than its diameter', () => {
    expect(JAR.height).toBeLessThanOrEqual(2 * JAR.radius)
    expect(JAR.radius).toBeGreaterThan(1.3)
    expect(JAR.radius).toBeLessThan(1.7)
  })

  it('holds the acid under the rim and over the floor', () => {
    expect(ACID_Y).toBeLessThan(JAR.rimY)
    expect(ACID_Y).toBeGreaterThan(JAR_FLOOR_Y + JAR.wall)
  })

  it('rises from below the frame and sinks away again', () => {
    expect(jarOffsetY(1, 0)).toBe(0)
    expect(jarOffsetY(0, 0)).toBe(JAR.dropOffset)
    expect(jarOffsetY(1, 1)).toBeLessThan(-5)
    const p = jarProfile()
    expect(p[0][0]).toBe(0)
    expect(p.at(-1)![0]).toBe(0)
  })

  it('sits under the whole tree: every ring hangs above the rim', () => {
    for (const slot of [0, 1, 2, 3]) for (const p of ringPoints(slotMatrix(slot, new THREE.Matrix4()))) expect(p.y).toBeGreaterThan(JAR.rimY + 0.3)
  })
})

describe('cut rings', () => {
  it('cuts the hero ring last, so it lies on top', () => {
    expect([...CUT_ORDER].sort()).toEqual([0, 1, 2, 3])
    expect(CUT_ORDER.at(-1)).toBe(HERO_SLOT)
  })

  it('starts on the tree exactly where act 6 left it', () => {
    const tree = finalTreeMatrix(RAW.yawTo, new THREE.Matrix4())
    for (const slot of [0, 1, 2, 3]) {
      const pose = slotPose(slot)
      const ref = tree.clone().multiply(new THREE.Matrix4().compose(pose.position, pose.quaternion, new THREE.Vector3(1, 1, 1)))
      close(cutRingMatrix(slot, 0, 0, new THREE.Matrix4()), ref)
    }
    close(treeMatrix(0, new THREE.Matrix4()), finalTreeMatrix(RAW.yawTo, new THREE.Matrix4()))
  })

  it('ends exactly at its rest pose in the jar', () => {
    for (const slot of [0, 1, 2, 3]) close(cutRingMatrix(slot, 1, 0, new THREE.Matrix4()), restMatrix(slot, 0, new THREE.Matrix4()))
  })

  it('rests inside the jar, on or over the floor, under the acid', () => {
    for (const slot of [0, 1, 2, 3])
      for (const p of ringPoints(restMatrix(slot, 0, new THREE.Matrix4()))) {
        expect(radial(p)).toBeLessThan(inner)
        expect(p.y).toBeGreaterThan(JAR_FLOOR_Y + JAR.wall - 1e-6)
        expect(p.y).toBeLessThan(ACID_Y)
      }
  })

  it('never cuts through the jar wall or the floor on its way down', () => {
    const m = new THREE.Matrix4()
    for (const slot of [0, 1, 2, 3])
      for (let t = 0; t <= 1.0001; t += 0.01)
        for (const p of ringPoints(cutRingMatrix(slot, t, 0, m))) {
          if (p.y < JAR.rimY) expect(radial(p)).toBeLessThan(inner)
          expect(p.y).toBeGreaterThan(JAR_FLOOR_Y + JAR.wall - 1e-6)
        }
  })

  it('lifts the empty tree out of the frame', () => {
    const m = treeMatrix(1, new THREE.Matrix4())
    const low = new THREE.Vector3(0, 1.8, 0).applyMatrix4(m) // the trunk end, lowest point of the upright tree
    expect(ndc(CAM_BIRTH.jar, 16 / 9, low).y).toBeGreaterThan(1)
  })
})

describe('hero ring', () => {
  it('follows its cut pose until it comes out', () => {
    close(heroMatrix({ cut: 1, jar: 1, out: 0, yaw: 0, tilt: 0 }, new THREE.Matrix4()), restMatrix(HERO_SLOT, 0, new THREE.Matrix4()))
  })

  it('comes out upright to the centre and clears the jar wall on its way', () => {
    close(heroMatrix({ cut: 1, jar: 1, out: 1, yaw: 0.3, tilt: 0.1 }, new THREE.Matrix4()), polishMatrix(0.3, 0.1, new THREE.Matrix4()))
    const c = new THREE.Vector3().setFromMatrixPosition(polishMatrix(0, 0, new THREE.Matrix4()))
    expect(c.toArray()).toEqual([POLISH.x, POLISH.y, POLISH.z])
    const m = new THREE.Matrix4()
    for (let t = 0; t <= 1.0001; t += 0.02)
      for (const p of ringPoints(heroMatrix({ cut: 1, jar: 1, out: t, yaw: 0, tilt: 0 }, m))) if (p.y < JAR.rimY) expect(radial(p)).toBeLessThan(inner)
  })

  it('mirrors under FINAL.mirrorY', () => {
    const src = polishMatrix(0, FINAL.tilt, new THREE.Matrix4())
    const p = new THREE.Vector3(0.2, 0.3, 0.1)
    const a = p.clone().applyMatrix4(src)
    const b = p.clone().applyMatrix4(mirrorMatrix(src, new THREE.Matrix4()))
    expect(b.x).toBeCloseTo(a.x, 9)
    expect(b.z).toBeCloseTo(a.z, 9)
    expect((a.y + b.y) / 2).toBeCloseTo(FINAL.mirrorY, 9)
    // The ring body (not the stub: it is polished away before the final) stays clear of the plane.
    for (const q of ringPoints(src).slice(1)) expect(q.y).toBeGreaterThan(FINAL.mirrorY)
  })
})

describe('polish line', () => {
  it('is tilted 60-70 deg and its normal points right, across the line', () => {
    const deg = (Math.atan2(LINE_DIR.y, LINE_DIR.x) * 180) / Math.PI
    expect(deg).toBeGreaterThanOrEqual(60)
    expect(deg).toBeLessThanOrEqual(70)
    expect(LINE_NORMAL.dot(LINE_DIR)).toBeCloseTo(0, 9)
    expect(LINE_NORMAL.x).toBeGreaterThan(0)
    expect(LINE.fromX).toBeGreaterThan(LINE.toX)
  })

  it('starts with the whole ring raw and ends with it polished, whatever its turn', () => {
    for (const yaw of [0, POLISH_TURN / 2, POLISH_TURN]) {
      const pts = ringPoints(polishMatrix(yaw, 0, new THREE.Matrix4()))
      for (const p of pts) expect(side(p, 0)).toBeLessThan(0)
      for (const p of pts) expect(side(p, 1)).toBeGreaterThan(0)
    }
  })

  it('is long enough for the whole ring', () => {
    expect(LINE.length).toBeGreaterThan(1.4)
  })
})

describe('framing', () => {
  it('shows the tree and the whole jar from the jar view', () => {
    const tree = treeMatrix(0, new THREE.Matrix4())
    const pts = [
      new THREE.Vector3(0, -1.4, 0).applyMatrix4(tree), // funnel mouth (top of the upright tree)
      new THREE.Vector3(0, JAR_FLOOR_Y, RAW.z + JAR.radius), // jar floor, front edge
      new THREE.Vector3(0, JAR.rimY, RAW.z - JAR.radius), // jar rim, back edge
    ]
    for (const aspect of ASPECTS) for (const p of pts) expect(Math.abs(ndc(CAM_BIRTH.jar, aspect, p).y)).toBeLessThan(0.92)
  })

  it('frames the ring and the line in the polish view', () => {
    const pts = ringPoints(polishMatrix(0, 0, new THREE.Matrix4()))
    const top = polishLinePoint(0.5, new THREE.Vector3()).addScaledVector(LINE_DIR, LINE.length / 2 + 0.15)
    for (const aspect of ASPECTS) for (const p of [...pts, top]) expect(Math.abs(ndc(CAM_BIRTH.polish, aspect, p).y)).toBeLessThan(0.85)
  })

  it('frames the ring and the visible part of its reflection in the final view', () => {
    const src = polishMatrix(0, FINAL.tilt, new THREE.Matrix4())
    // The reflection fades out FINAL.reflectFade under the mirror plane (polishMaterial.ts), so only the part above that
    // counts. Ring body only (slice(1) drops the stub tip: the stub is polished away and the mirror copy has none).
    const body = (m: THREE.Matrix4) => ringPoints(m).slice(1)
    const pts = [...body(src), ...body(mirrorMatrix(src, new THREE.Matrix4())).filter((p) => p.y > FINAL.mirrorY - FINAL.reflectFade)]
    for (const aspect of ASPECTS) for (const p of pts) expect(Math.abs(ndc(CAM_BIRTH.final, aspect, p).y)).toBeLessThan(0.85)
  })
})

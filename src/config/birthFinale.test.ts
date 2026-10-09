import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { CAM_BIRTH, FINAL, FINAL_LIGHT, LINE, POLISH, WIPE } from './birth'
import { RAW } from './water'

/** NDC of a world point seen from a camera target (fov 30, like the Stage camera). */
function ndc(cam: { y: number; z: number; look: number }, p: THREE.Vector3): THREE.Vector3 {
  const c = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100)
  c.position.set(0, cam.y, cam.z)
  c.lookAt(0, cam.look, 0)
  c.updateMatrixWorld()
  return p.clone().project(c)
}
/** On-screen height (NDC) of the ring's upper half in a camera target. */
const ringSize = (cam: { y: number; z: number; look: number }) =>
  ndc(cam, new THREE.Vector3(POLISH.x, POLISH.y + 0.5, POLISH.z)).y - ndc(cam, new THREE.Vector3(POLISH.x, POLISH.y, POLISH.z)).y

describe('finale', () => {
  it('shows the ring 15-20 percent larger than the first draft of the final view', () => {
    const draft = { y: RAW.y + 0.4, z: RAW.z + 6.4, look: RAW.y - 0.45 }
    const k = ringSize(CAM_BIRTH.final) / ringSize(draft)
    expect(k).toBeGreaterThan(1.15)
    expect(k).toBeLessThan(1.2)
  })

  it('brightens the polished gold in the final frame', () => {
    expect(FINAL.envBoost).toBeGreaterThan(1)
    expect(FINAL.envBoost).toBeLessThan(4)
    // satin polish: broad highlights, but still smoother than the raw cast gold
    expect(FINAL.roughness).toBeGreaterThan(0.1)
    expect(FINAL.roughness).toBeLessThan(0.45)
  })

  it('puts the warm key light upper right in front of the ring and the cool rim behind it', () => {
    const [kx, ky, kz] = FINAL_LIGHT.key.position
    expect(kx).toBeGreaterThan(POLISH.x)
    expect(ky).toBeGreaterThan(POLISH.y)
    expect(kz).toBeGreaterThan(POLISH.z)
    expect(FINAL_LIGHT.rim.position[2]).toBeLessThan(POLISH.z)
    expect(FINAL_LIGHT.rim.intensity).toBeLessThan(FINAL_LIGHT.key.intensity)
    // In front of the camera's near plane path: the key must not sit between the camera and the ring's screen spot.
    expect(kz).toBeLessThan(CAM_BIRTH.final.z - 1)
  })

  it('ends the wipe as a thin full-height line at the left page edge', () => {
    expect(WIPE.half).toBeGreaterThan(1)
    expect(WIPE.width).toBeGreaterThan(0)
    // Not thicker than the 3D polish line in the polish view (about 0.024 half-viewport-heights).
    expect(WIPE.width).toBeLessThan(LINE.width / ((CAM_BIRTH.polish.z - POLISH.z - LINE.zFront) * Math.tan(Math.PI / 12)))
  })
})

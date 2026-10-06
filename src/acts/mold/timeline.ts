import { gsap } from 'gsap'
import { CAM } from '../../config/mold'
import { CAM_INITIAL, story } from '../../story/store'
import { MOLD_BEATS as B } from './beats'
import { mold } from './state'

/**
 * Adds Act 3's scrubbed tweens to `tl` at absolute screens. fromTo + immediateRender:false everywhere, so both
 * scroll directions restore exact values. Act 3 owns `story.ring.tree`, `story.cam` and `mold.*`.
 */
export function registerMold(tl: gsap.core.Timeline): () => void {
  const seg = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } })
  const len = (from: number, to: number) => to - from

  // Camera pulls back to the tree view.
  seg.fromTo(story.cam, { y: CAM_INITIAL.y, z: CAM_INITIAL.z }, { y: CAM.tree.y, z: CAM.tree.z, duration: len(B.camFrom, B.camTo), ease: 'power2.inOut' }, B.camFrom)
  seg.fromTo(mold, { base: 0 }, { base: 1, duration: len(B.baseInFrom, B.baseInTo), ease: 'power2.out' }, B.baseInFrom)

  // The hero ring lands on its slot, the trunk grows up from the cone, the clones pop in.
  seg.fromTo(story.ring, { tree: 0 }, { tree: 1, duration: len(B.heroFrom, B.heroTo), ease: 'power2.inOut' }, B.heroFrom)
  seg.fromTo(mold, { trunk: 0 }, { trunk: 1, duration: len(B.trunkFrom, B.trunkTo), ease: 'power1.out' }, B.trunkFrom)
  B.cloneFrom.forEach((from, i) => {
    seg.fromTo(mold.clones, { [i]: 0 }, { [i]: 1, duration: B.cloneLen, ease: 'back.out(1.6)' }, from)
  })

  // Flask, tape, investment.
  seg.fromTo(mold, { flask: 0 }, { flask: 1, duration: len(B.flaskFrom, B.flaskTo), ease: 'power2.in' }, B.flaskFrom)
  seg.fromTo(mold, { tape: 0 }, { tape: 1, duration: len(B.tapeFrom, B.tapeTo) }, B.tapeFrom)
  seg.fromTo(mold, { fill: 0 }, { fill: 1, duration: len(B.fillFrom, B.fillTo) }, B.fillFrom)

  // Vacuum: the surface boils (ramps up and down), the camera pushes in on the top and comes back.
  const ramp = 0.05
  seg.fromTo(mold, { boil: 0 }, { boil: 1, duration: ramp }, B.boilFrom)
  seg.fromTo(mold, { boil: 1 }, { boil: 0, duration: ramp }, B.boilTo - ramp)
  seg.fromTo(
    story.cam,
    { y: CAM.tree.y, z: CAM.tree.z },
    { y: CAM.vacuum.y, z: CAM.vacuum.z, duration: len(B.vacuumCamFrom, B.vacuumCamTo), ease: 'power2.inOut' },
    B.vacuumCamFrom,
  )

  // Tape off, camera back to the tree view, the base drops out of the frame.
  seg.fromTo(mold, { tape: 1 }, { tape: 0, duration: len(B.unwrapFrom, B.unwrapTo) }, B.unwrapFrom)
  seg.fromTo(
    story.cam,
    { y: CAM.vacuum.y, z: CAM.vacuum.z },
    { y: CAM.tree.y, z: CAM.tree.z, duration: len(B.camBackFrom, B.camBackTo), ease: 'power2.inOut' },
    B.camBackFrom,
  )
  seg.fromTo(mold, { base: 1 }, { base: 0, duration: len(B.baseOutFrom, B.baseOutTo), ease: 'power2.in' }, B.baseOutFrom)

  tl.add(seg, 0)
  return () => {
    seg.kill()
  }
}

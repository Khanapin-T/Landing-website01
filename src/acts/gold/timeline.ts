import { gsap } from 'gsap'
import { FIRE_END_HEAT } from '../../config/fire'
import { story } from '../../story/store'
import { GOLD_BEATS as B } from './beats'
import { gold } from './state'

/** Half of what the furnace leaves, for the pour. */
const HEAT_POUR = FIRE_END_HEAT * 0.5

/**
 * Adds Act 5's scrubbed tweens to `tl` at absolute screens. fromTo + immediateRender:false everywhere, so both scroll
 * directions restore exact values. Act 5 owns `gold.*` and `story.flask.{xray, fill, cool, heat}` from 9.2 on (Act 4
 * leaves flip = 1, burn = 1, heat = FIRE_END_HEAT) and never touches the camera. Act 6 takes `story.flask` over after 11.5.
 */
export function registerGold(tl: gsap.core.Timeline): () => void {
  const seg = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } })
  const len = (from: number, to: number) => to - from

  // The vacuum chamber slides up onto the flask, then the needle falls to full vacuum.
  seg.fromTo(gold, { chamber: 0 }, { chamber: 1, duration: len(B.chamberFrom, B.chamberTo), ease: 'power2.out' }, B.chamberFrom)
  seg.fromTo(gold, { vacuum: 0 }, { vacuum: 1, duration: len(B.vacuumFrom, B.vacuumTo), ease: 'power2.inOut' }, B.vacuumFrom)

  // X-ray on, the pour and the solid fill, the cooling, X-ray off after the flash.
  seg.fromTo(story.flask, { xray: 0 }, { xray: 1, duration: len(B.xrayInFrom, B.xrayInTo) }, B.xrayInFrom)
  seg.fromTo(story.flask, { fill: 0 }, { fill: 1, duration: len(B.fillFrom, B.fillTo) }, B.fillFrom)
  seg.fromTo(story.flask, { cool: 0 }, { cool: 1, duration: len(B.coolFrom, B.coolTo), ease: 'power1.out' }, B.coolFrom)
  seg.fromTo(story.flask, { xray: 1 }, { xray: 0, duration: len(B.xrayOutFrom, B.xrayOutTo) }, B.xrayOutFrom)

  // The heat is halved for the pour and gone before the rest; the rest timer runs on the cooled flask.
  seg.fromTo(gold, { rest: 0 }, { rest: 1, duration: len(B.restFrom, B.restTo) }, B.restFrom)
  seg.fromTo(story.flask, { heat: FIRE_END_HEAT }, { heat: HEAT_POUR, duration: len(B.heatPourFrom, B.heatPourTo) }, B.heatPourFrom)
  seg.fromTo(story.flask, { heat: HEAT_POUR }, { heat: 0, duration: len(B.heatOutFrom, B.heatOutTo) }, B.heatOutFrom)

  tl.add(seg, 0)
  return () => {
    seg.kill()
  }
}

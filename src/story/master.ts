import { gsap } from 'gsap'
import { TOTAL_SCREENS } from '../config/acts'

/**
 * Master timeline. 1 second of timeline time = 1 screen of scroll.
 * Never played: ScrollDirector sets its time from the scroll position.
 * Acts add tweens at absolute positions in screens: master.to(target, vars, window.start + offset).
 */
export const master = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
master.set({}, {}, TOTAL_SCREENS)

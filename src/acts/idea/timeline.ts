import { gsap } from 'gsap'
import { story } from '../../story/store'
import { IDEA_BEATS as B } from './beats'
import { idea } from './state'

/**
 * Adds Act 1's scrubbed tweens to `tl` (the master timeline in the app) at absolute positions in screens.
 * fromTo + immediateRender:false everywhere: values are correct in both scroll directions and nothing renders
 * before the playhead reaches a tween.
 */
export function registerIdea(tl: gsap.core.Timeline): () => void {
  const seg = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } })
  const len = (from: number, to: number) => to - from

  seg.fromTo(idea, { draw: 0 }, { draw: 1, duration: len(B.drawFrom, B.drawTo), ease: 'power1.inOut' }, B.drawFrom)
  seg.fromTo(idea, { dims: 0 }, { dims: 1, duration: len(B.dimsFrom, B.dimsTo) }, B.dimsFrom)
  seg.fromTo(idea, { dimsOpacity: 1 }, { dimsOpacity: 0, duration: len(B.dimsOutFrom, B.dimsOutTo) }, B.dimsOutFrom)
  seg.fromTo(story.ring, { yaw: 0 }, { yaw: Math.PI * 2, duration: len(B.turnFrom, B.turnTo), ease: 'sine.inOut' }, B.turnFrom)
  seg.fromTo(story.ring, { fill: 0 }, { fill: 1, duration: len(B.fillFrom, B.fillTo) }, B.fillFrom)

  // Dissolve: surfaces and edges go, points take over and stream down.
  const fade = 0.15
  seg.fromTo(story.ring, { fill: 1 }, { fill: 0, duration: fade }, B.dissolveFrom)
  seg.fromTo(idea, { edges: 1 }, { edges: 0, duration: fade }, B.dissolveFrom)
  seg.fromTo(idea, { points: 0 }, { points: 1, duration: 0.06 }, B.dissolveFrom)
  seg.fromTo(idea, { dissolve: 0 }, { dissolve: 1, duration: len(B.dissolveFrom, B.dissolveTo) }, B.dissolveFrom)
  seg.fromTo(idea, { grid: 1 }, { grid: 0, duration: len(B.gridOutFrom, B.gridOutTo) }, B.gridOutFrom)
  seg.fromTo(idea, { points: 1 }, { points: 0, duration: len(B.pointsOutFrom, B.pointsOutTo) }, B.pointsOutFrom)

  tl.add(seg, 0)
  return () => {
    seg.kill()
  }
}

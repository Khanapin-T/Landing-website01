import { afterEach, describe, expect, it } from 'vitest'
import { ACTS, TOTAL_SCREENS, actWindows } from '../config/acts'
import { GOLD_BEATS } from '../acts/gold/beats'
import { MOLD_BEATS } from '../acts/mold/beats'
import { actRate, autoplayRate, getAutoplay, resetAutoplay, setAutoplay, stepAutoplay, subscribeAutoplay } from './autoplay'

const WINDOWS = actWindows()

/** Seconds autoplay needs to cross [from, to], starting a little before `from` so the pace has settled. */
function secondsAcross(from: number, to: number): number {
  let s = { screen: from - 0.6, rate: autoplayRate(from - 0.6) }
  let t = 0
  let entered = 0
  while (s.screen < to) {
    s = stepAutoplay(s, 1 / 120)
    t += 1 / 120
    if (!entered && s.screen >= from) entered = t
  }
  return t - entered
}

describe('autoplayRate', () => {
  it('is the act length divided by its autoplay seconds, away from the slowed and sped-up moments', () => {
    ACTS.forEach((act, i) => {
      const w = WINDOWS[i]
      expect(actRate(w.start + 0.1)).toBeCloseTo(act.screens / act.autoplaySeconds, 6)
      expect(autoplayRate(w.start + 0.1)).toBeCloseTo(act.screens / act.autoplaySeconds, 6)
    })
  })

  it('lingers while the investment hardens before the tape comes off', () => {
    const mid = (MOLD_BEATS.restFrom + MOLD_BEATS.restTo) / 2
    expect(autoplayRate(mid)).toBeLessThan(actRate(mid) / 3)
    // Held for several seconds instead of about a second.
    expect(secondsAcross(MOLD_BEATS.restFrom, MOLD_BEATS.restTo)).toBeGreaterThan(2.5)
  })

  it('runs the gold fill 1.7 times faster than the act pace', () => {
    const mid = (GOLD_BEATS.fillFrom + GOLD_BEATS.fillTo) / 2
    expect(autoplayRate(mid)).toBeCloseTo(actRate(mid) * 1.7, 6)
    const plain = (GOLD_BEATS.fillTo - GOLD_BEATS.fillFrom) / actRate(mid)
    expect(secondsAcross(GOLD_BEATS.fillFrom, GOLD_BEATS.fillTo)).toBeLessThan(plain / 1.4)
  })

  it('uses the first act before the start and the last act after the end', () => {
    const first = ACTS[0]
    const last = ACTS.at(-1)!
    expect(autoplayRate(-3)).toBeCloseTo(first.screens / first.autoplaySeconds, 6)
    expect(autoplayRate(TOTAL_SCREENS + 3)).toBeCloseTo(last.screens / last.autoplaySeconds, 6)
  })
})

describe('stepAutoplay', () => {
  it('eases up from rest: the first frame moves less than the target rate would', () => {
    const next = stepAutoplay({ screen: 1, rate: 0 }, 1 / 60)
    const target = autoplayRate(1)
    expect(next.screen).toBeGreaterThan(1)
    expect(next.screen - 1).toBeLessThan(target / 60)
    expect(next.rate).toBeGreaterThan(0)
    expect(next.rate).toBeLessThan(target)
  })

  it('converges on the target rate and stays on it', () => {
    let s = { screen: 1, rate: 0 }
    for (let i = 0; i < 300; i++) s = stepAutoplay({ screen: 1, rate: s.rate }, 1 / 60)
    expect(s.rate).toBeCloseTo(autoplayRate(1), 3)
  })

  it('changes the rate gradually across an act boundary instead of jumping', () => {
    const boundary = WINDOWS[2].start
    const before = autoplayRate(boundary - 0.01)
    const after = autoplayRate(boundary + 0.01)
    expect(before).not.toBeCloseTo(after, 3) // the test only means something if the two acts differ
    const first = stepAutoplay({ screen: boundary + 0.001, rate: before }, 1 / 60)
    expect(first.rate).not.toBeCloseTo(after, 3)
    expect(Math.abs(first.rate - before)).toBeLessThan(Math.abs(after - before))
    expect(Math.sign(first.rate - before)).toBe(Math.sign(after - before))
  })

  it('does not depend on the frame rate', () => {
    const run = (dt: number) => {
      let s = { screen: 1, rate: 0 }
      for (let t = 0; t < 1 - 1e-9; t += dt) s = stepAutoplay(s, dt)
      return s.screen
    }
    expect(run(1 / 30)).toBeCloseTo(run(1 / 120), 1)
  })

  it('clamps dt, so a hidden tab does not leap through the story', () => {
    const next = stepAutoplay({ screen: 1, rate: autoplayRate(1) }, 30)
    expect(next.screen - 1).toBeLessThan(0.1)
  })

  it('stops at the end of the track and says it is done', () => {
    const next = stepAutoplay({ screen: TOTAL_SCREENS - 0.0001, rate: 1 }, 1 / 60)
    expect(next.screen).toBe(TOTAL_SCREENS)
    expect(next.done).toBe(true)
    expect(stepAutoplay({ screen: 1, rate: 0 }, 1 / 60).done).toBe(false)
  })
})

describe('autoplay store', () => {
  afterEach(resetAutoplay)

  it('toggles and notifies only on a change', () => {
    let calls = 0
    const off = subscribeAutoplay(() => calls++)
    expect(getAutoplay()).toBe(false)
    setAutoplay(true)
    setAutoplay(true)
    expect(getAutoplay()).toBe(true)
    setAutoplay(false)
    expect(calls).toBe(2)
    off()
    setAutoplay(true)
    expect(calls).toBe(2)
  })
})

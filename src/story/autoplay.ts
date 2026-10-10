import { useSyncExternalStore } from 'react'
import { GOLD_BEATS } from '../acts/gold/beats'
import { MOLD_BEATS } from '../acts/mold/beats'
import { ACTS, TOTAL_SCREENS, actAt } from '../config/acts'

/** Seconds the pace takes to settle on a new value: eases the start and every act boundary. */
const RATE_TAU = 0.3
/** A hidden tab or a long hitch must not leap through the story. */
const MAX_DT = 0.1

/**
 * Moments that need their own pace inside an act: `speed` multiplies the act pace between `from` and `to` (screens).
 * Tied to the acts' beats, so retuning a beat moves its pace with it. Tune by eye.
 */
const SEGMENTS: readonly { from: number; to: number; speed: number }[] = [
  /** Mold: the investment hardens with the tape still on (the rest timer). A short stretch of scroll, so it is held 4x slower. */
  { from: MOLD_BEATS.restFrom, to: MOLD_BEATS.restTo, speed: 0.25 },
  /** Gold: the molten gold fills the form (bottom up), 1.7x faster. */
  { from: GOLD_BEATS.fillFrom, to: GOLD_BEATS.fillTo, speed: 1.7 },
]

/** Pace of the act at `screen`, in screens per second (act length / its autoplay seconds). */
export function actRate(screen: number): number {
  const id = actAt(screen).id
  const act = ACTS.find((a) => a.id === id)!
  return act.screens / act.autoplaySeconds
}

/** Target autoplay pace at `screen`, in screens per second: the act pace, scaled inside a segment. */
export function autoplayRate(screen: number): number {
  const seg = SEGMENTS.find((s) => screen >= s.from && screen < s.to)
  return actRate(screen) * (seg?.speed ?? 1)
}

export interface AutoplayStep {
  /** Position in screens. */
  screen: number
  /** Current (eased) pace in screens per second. */
  rate: number
}

/** One frame of autoplay: eases the pace toward the act's pace, then advances. `done` once the end is reached. */
export function stepAutoplay(from: AutoplayStep, dt: number): AutoplayStep & { done: boolean } {
  const step = Math.min(Math.max(dt, 0), MAX_DT)
  const rate = from.rate + (autoplayRate(from.screen) - from.rate) * (1 - Math.exp(-step / RATE_TAU))
  const screen = Math.min(from.screen + rate * step, TOTAL_SCREENS)
  return { screen, rate, done: screen >= TOTAL_SCREENS }
}

let playing = false
const listeners = new Set<() => void>()

export function getAutoplay(): boolean {
  return playing
}

/** Notifies only when the value changes. The scroll loop reads `getAutoplay()`, React only re-renders on this. */
export function setAutoplay(next: boolean): void {
  if (next === playing) return
  playing = next
  listeners.forEach((l) => l())
}

export function subscribeAutoplay(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAutoplay(): boolean {
  return useSyncExternalStore(subscribeAutoplay, getAutoplay)
}

/** Test helper. */
export function resetAutoplay(): void {
  playing = false
  listeners.clear()
}

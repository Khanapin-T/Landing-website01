import { useSyncExternalStore } from 'react'
import type { ActId } from '../config/acts'
import { CURE_OFF } from '../config/print'

/** The persistent hero ring, driven by acts through `master`. */
export interface RingState {
  /** Turn around Y, radians. */
  yaw: number
  /** Surface opacity 0..1 (alpha-hashed). 0 = only act props such as edge lines are visible. */
  fill: number
  /** Material state: 0 polished gold, 1 CAD surface. */
  cad: number
  /** World Y offset of the ring's center. */
  y: number
  /** Rotation around Z (screen plane), radians. PI = upside down. */
  flip: number
  /** Material state: 1 = castable resin (mixed over gold/CAD). */
  resin: number
  /** 1 = the sprue is attached (from the print until the cut in Act 6). */
  sprue: number
  /** World Y of the print cure plane; the ring is clipped below it. CURE_OFF = no clip. */
  cureY: number
}

export const RING_INITIAL: Readonly<RingState> = { yaw: 0, fill: 0, cad: 1, y: 0, flip: 0, resin: 0, sprue: 0, cureY: CURE_OFF }

/** Scroll-driven values. Mutated by ScrollDirector every scroll frame; read in useFrame. Never put this in React state. */
export interface Story {
  /** Scroll position in screens, 0..TOTAL_SCREENS. */
  screen: number
  act: ActId
  /** 0..1 progress inside the current act. */
  actProgress: number
  /** Frame temperature for the grade, 0..1. */
  temperature: number
  /** Hero ring values. */
  ring: RingState
}

export const story: Story = { screen: 0, act: 'intro', actProgress: 0, temperature: 0, ring: { ...RING_INITIAL } }

const actListeners = new Set<() => void>()

/** Changes the current act and notifies subscribers only when it actually changes. */
export function setAct(id: ActId): void {
  if (story.act === id) return
  story.act = id
  actListeners.forEach((l) => l())
}

export function subscribeAct(listener: () => void): () => void {
  actListeners.add(listener)
  return () => actListeners.delete(listener)
}

/** Re-renders only on act changes (a few times per full scroll). */
export function useCurrentAct(): ActId {
  return useSyncExternalStore(subscribeAct, () => story.act)
}

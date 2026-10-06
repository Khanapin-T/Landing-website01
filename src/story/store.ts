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
  /** 0..1 blend from the pose above into tree slot 0 (Act 3). */
  tree: number
}

export const RING_INITIAL: Readonly<RingState> = { yaw: 0, fill: 0, cad: 1, y: 0, flip: 0, resin: 0, sprue: 0, cureY: CURE_OFF, tree: 0 }

/** Camera rig: world Y and Z of the camera (x stays 0) and the world Y of the point on the Y axis it looks at (look == y: straight down -Z). */
export interface CamState {
  y: number
  z: number
  look: number
}

/** Must equal the Stage camera position. */
export const CAM_INITIAL: Readonly<CamState> = { y: 0.15, z: 4.2, look: 0.15 }

/** The resin stream (one particle system across acts 1-2): the ring dissolves into it and is printed from it. */
export interface StreamState {
  /** 0..1: points pour from the dissolving ring into the resin bed (Act 1). */
  fall: number
  /** 0..1: print progress; each point flies to its spot on the ring as the cure front reaches it (Act 2). */
  feed: number
  opacity: number
}

export const STREAM_INITIAL: Readonly<StreamState> = { fall: 0, feed: 0, opacity: 0 }

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
  /** Resin stream particles. */
  stream: StreamState
  /** Camera dolly (Act 3). */
  cam: CamState
}

export const story: Story = {
  screen: 0,
  act: 'intro',
  actProgress: 0,
  temperature: 0,
  ring: { ...RING_INITIAL },
  stream: { ...STREAM_INITIAL },
  cam: { ...CAM_INITIAL },
}

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

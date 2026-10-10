import { useSyncExternalStore } from 'react'
import type { ActId } from '../config/acts'
import { CURE_OFF } from '../config/print'

/** The four persistent rings (one shared state while they print; ring 0 is Act 1's CAD ring), driven by acts through `master`. */
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
  /**
   * Print grid: 0 = every ring at the origin (Act 1, one ring), 1 = ring k at its grid spot (ringPrintX(k),
   * ringPrintZ(k), set at the Act 2 ring switch); from 1 to PRINT.grid.liftSpread the front two move outward while the
   * rings turn over (gridX in config/print.ts).
   */
  spread: number
  /**
   * Per ring 0..1 (Act 3): 0 = where Act 2 left it (the pose above), 1 = seated on tree slot k (slotPose(k)). Its
   * drawn size goes from `scale` to 1 with it (src/scene/ring/placement.ts). The array is a GSAP tween target: never
   * replace it at runtime, only its values.
   */
  flight: [number, number, number, number]
  /** Uniform size of the rings and their sprues (Act 2 prints them at PRINT.scale and grows them back to 1 while they turn over). */
  scale: number
}

/**
 * `flight` is a getter: every spread or Object.assign of RING_INITIAL gets its own fresh array, so the initial values
 * are never shared with (and mutated through) the live tween target.
 */
export const RING_INITIAL: Readonly<RingState> = {
  yaw: 0,
  fill: 0,
  cad: 1,
  y: 0,
  flip: 0,
  resin: 0,
  sprue: 0,
  cureY: CURE_OFF,
  spread: 0,
  get flight(): [number, number, number, number] {
    return [0, 0, 0, 0]
  },
  scale: 1,
}

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

/** The flask and what happens to it in the furnace (Acts 4-5), written by those acts' tweens and read by the flask owner. */
export interface FlaskState {
  /** 0..1 furnace heat: coils glow, steel reddens, haze. */
  heat: number
  /** 0..1 X-ray: the opaque flask dissolves into a cyan shell. */
  xray: number
  /** 0..1 burnout: the front sweeps the tree top to bottom (config/fire.ts), points then flow out through the funnel. */
  burn: number
  /** 0..1 flip: 0 funnel down, 1 turned 180 degrees about Z (funnel up); Act 6 takes it to 0.5 (on its side, funnel end to +X). */
  flip: number
  /** 0..1 metal fill (Act 5): the stream arrives, then the solid front rises (config/gold.ts). */
  fill: number
  /** 0..1 cooling of the gold after the fill: white-orange to yellow gold. */
  cool: number
  /** 0..1 Act 6: 0 = at its place, 1 = lowered into the bucket, under the water (config/water.ts DIP_DEPTH). */
  dip: number
  /** 0..1 Act 6: the investment has dissolved in the water (> 0.5 = gone, the raw tree shows). */
  wash: number
  /** 0..1 Act 6: the flask and the bucket recede back and sink out of the frame. */
  away: number
}

export const FLASK_INITIAL: Readonly<FlaskState> = { heat: 0, xray: 0, burn: 0, flip: 0, fill: 0, cool: 0, dip: 0, wash: 0, away: 0 }

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
  /** Furnace state (Acts 4-5). */
  flask: FlaskState
}

export const story: Story = {
  screen: 0,
  act: 'intro',
  actProgress: 0,
  temperature: 0,
  ring: { ...RING_INITIAL },
  stream: { ...STREAM_INITIAL },
  cam: { ...CAM_INITIAL },
  flask: { ...FLASK_INITIAL },
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

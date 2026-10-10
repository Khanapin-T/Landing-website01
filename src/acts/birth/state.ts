import { WIPE } from '../../config/birth'

/** Scroll-scrubbed Act 7 values, written by the master timeline and read by the birth scene and the HUD. */
export interface BirthState {
  /** 0 = jar below the frame, 1 = in place (config/birth.ts jarOffsetY). */
  jar: number
  /** 0 = on the tree, 1 = at rest in the jar: one per slot (config/birth.ts cutRingMatrix). */
  cut0: number
  cut1: number
  cut2: number
  cut3: number
  /** 0..1 the empty tree goes up out of the frame. */
  treeUp: number
  /** 0..1 of the acid timer (00:00 to 10:00). */
  rest: number
  /** 0..1 the hero ring comes out of the jar to the centre. */
  out: number
  /** 0..1 the jar with the other rings goes down out of the frame. */
  jarAway: number
  /** 0..1 the polish line from right to left. */
  line: number
  /** Turn of the hero ring about Y while it is polished, radians. */
  turn: number
  /** 1 = the whole ring is polished (after the line has passed). */
  all: number
  /** Final tilt of the ring, radians. */
  tilt: number
  /** 0..1 the final frame: slow ambient spin, the lights, the brighter gold. */
  finale: number
  /** 0..1 the ring's mirror reflection fades in (after the sweep, over the black page). */
  reflect: number
  /** 0..1 the line from the end of its pass to a full-height vertical line at the left page edge (config/birth.ts WIPE). */
  edge: number
  /** NDC x of the vertical wipe line while it sweeps left to right (WIPE.leftX = not started, WIPE.rightX = done). */
  wipeX: number
}

export const BIRTH_INITIAL: Readonly<BirthState> = {
  jar: 0,
  cut0: 0,
  cut1: 0,
  cut2: 0,
  cut3: 0,
  treeUp: 0,
  rest: 0,
  out: 0,
  jarAway: 0,
  line: 0,
  turn: 0,
  all: 0,
  tilt: 0,
  finale: 0,
  reflect: 0,
  edge: 0,
  wipeX: WIPE.leftX,
}

export const birth: BirthState = { ...BIRTH_INITIAL }

/** The cut progress of slot `slot`. */
export function cutOf(b: BirthState, slot: number): number {
  return slot === 0 ? b.cut0 : slot === 1 ? b.cut1 : slot === 2 ? b.cut2 : b.cut3
}

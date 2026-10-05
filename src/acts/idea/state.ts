/** Scroll-scrubbed Act 1 values, written by the master timeline and read in useFrame. */
export interface IdeaState {
  /** Edge-line draw progress 0..1. */
  draw: number
  /** Edge-line opacity. */
  edges: number
  /** Dimension-line draw progress 0..1. */
  dims: number
  /** Dimension-line opacity. */
  dimsOpacity: number
  /** Particle stream progress 0..1. */
  dissolve: number
  /** Particle opacity. */
  points: number
  /** Blueprint grid strength 0..1. */
  grid: number
}

export const IDEA_INITIAL: Readonly<IdeaState> = { draw: 0, edges: 1, dims: 0, dimsOpacity: 1, dissolve: 0, points: 0, grid: 1 }

export const idea: IdeaState = { ...IDEA_INITIAL }

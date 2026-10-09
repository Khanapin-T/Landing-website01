import { WIPE } from '../../config/birth'

/**
 * A line on screen in "S" units: x = ndc.x * aspect, y = ndc.y (1 = half the viewport height, square pixels).
 * `angle` from the horizontal (PI/2 = vertical, the far end up), `half` = half its length.
 */
export interface ScreenLine {
  x: number
  y: number
  angle: number
  half: number
}

/**
 * Where the finale wipe is: `idle` before the polish pass, `line` from the polish pass to the left page edge (the line
 * erases the copy column), `sweep` while the vertical line crosses the page, `done` once it is off the right edge.
 */
export type WipePhase = 'idle' | 'line' | 'sweep' | 'done'

export function wipePhase(line: number, wipeX: number): WipePhase {
  if (wipeX >= WIPE.rightX) return 'done'
  if (wipeX > WIPE.leftX) return 'sweep'
  return line > 0 ? 'line' : 'idle'
}

/** The screen line through two projected end points (NDC), `b` the upper end. */
export function screenLineFromEnds(ax: number, ay: number, bx: number, by: number, aspect: number, out: ScreenLine): ScreenLine {
  const dx = (bx - ax) * aspect
  const dy = by - ay
  out.x = ((ax + bx) / 2) * aspect
  out.y = (ay + by) / 2
  out.angle = Math.atan2(dy, dx)
  out.half = Math.hypot(dx, dy) / 2
  return out
}

/**
 * The drawn line: `start` (the projected 3D polish line) carried to the left page edge by `edge` 0..1 (upright, full
 * height), then, once the sweep has started, upright at NDC x = wipeX.
 */
export function wipeLineAt(start: ScreenLine, edge: number, wipeX: number, aspect: number, out: ScreenLine): ScreenLine {
  if (wipeX > WIPE.leftX) {
    out.x = wipeX * aspect
    out.y = 0
    out.angle = Math.PI / 2
    out.half = WIPE.half
    return out
  }
  const k = Math.min(Math.max(edge, 0), 1)
  out.x = start.x + (WIPE.leftX * aspect - start.x) * k
  out.y = start.y * (1 - k)
  out.angle = start.angle + (Math.PI / 2 - start.angle) * k
  out.half = start.half + (WIPE.half - start.half) * k
  return out
}

const r1 = (v: number) => Math.round(v * 10) / 10

/** CSS px x of NDC x on a viewport `w` wide. */
export const ndcToPx = (x: number, w: number) => ((x + 1) / 2) * w

/**
 * clip-path that keeps only what lies LEFT of the (infinite) screen line on a w x h viewport (px, y down): the copy
 * column the line erases as it moves left. The far left corners are pushed out so the polygon never self-intersects.
 */
export function eraseClip(l: ScreenLine, aspect: number, w: number, h: number): string {
  const px = ((l.x / aspect + 1) / 2) * w
  const py = ((1 - l.y) / 2) * h
  // S -> px scales both axes by h / 2 (y flipped): the direction in px is (cos, -sin).
  const sin = Math.max(Math.sin(l.angle), 0.1)
  const slope = Math.cos(l.angle) / -sin // dx per dy (px, y down)
  const x0 = px + (0 - py) * slope
  const xh = px + (h - py) * slope
  return `polygon(-10000px 0px, ${r1(x0)}px 0px, ${r1(xh)}px ${r1(h)}px, -10000px ${r1(h)}px)`
}

/** clip-path that keeps only what lies left of NDC x (the final block behind the sweeping line). */
export function revealClip(wipeX: number, w: number): string {
  return `inset(0px ${r1(Math.max(0, w - ndcToPx(wipeX, w)))}px 0px 0px)`
}

/** clip-path that keeps only what lies right of NDC x (the copy scrim: left of the line the page is black). */
export function scrimClip(wipeX: number, w: number): string {
  return `inset(0px 0px 0px ${r1(Math.max(0, ndcToPx(wipeX, w)))}px)`
}

export const HIDE_ALL = 'inset(0px 100% 0px 0px)'

/** How a DOM layer follows the wipe: the old copy is erased, the final block revealed, the scrim pushed right. */
export type WipeMode = 'erase' | 'reveal' | 'scrim'

export interface WipeView {
  phase: WipePhase
  line: ScreenLine
  aspect: number
  width: number
  height: number
  wipeX: number
}

/** clip-path and visibility of a layer for the current wipe ('' = no inline style). */
export function wipeStyle(mode: WipeMode, v: WipeView): { clip: string; visibility: string } {
  const { phase } = v
  if (mode === 'erase') {
    if (phase === 'idle') return { clip: '', visibility: '' }
    if (phase === 'line') return { clip: eraseClip(v.line, v.aspect, v.width, v.height), visibility: '' }
    return { clip: HIDE_ALL, visibility: 'hidden' }
  }
  if (mode === 'reveal') {
    if (phase === 'done') return { clip: '', visibility: '' }
    if (phase === 'sweep') return { clip: revealClip(v.wipeX, v.width), visibility: '' }
    return { clip: HIDE_ALL, visibility: 'hidden' }
  }
  if (phase === 'done') return { clip: HIDE_ALL, visibility: 'hidden' }
  if (phase === 'sweep') return { clip: scrimClip(v.wipeX, v.width), visibility: '' }
  return { clip: '', visibility: '' }
}

/** A final link is shown (focusable, clickable) once the sweep has passed its right edge `right` (px). */
export function linkShown(v: WipeView, right: number): boolean {
  if (v.phase === 'done') return true
  if (v.phase !== 'sweep') return false
  return ndcToPx(v.wipeX, v.width) >= right
}

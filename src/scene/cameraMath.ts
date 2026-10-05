/** Horizontal position of the focus object on screen (0 left, 1 right). */
export const FOCUS_X = 0.58

/**
 * x for camera.setViewOffset: a negative offset shifts the visible window left,
 * so the scene center lands at FOCUS_X of the width.
 */
export function focusOffsetX(width: number, focus = FOCUS_X): number {
  return -(focus - 0.5) * width
}

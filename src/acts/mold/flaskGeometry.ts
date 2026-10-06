import * as THREE from 'three'

const SEGMENTS = 96

/**
 * Open cylinder at radius r over a flask-local span (SHELL for the outer surface; INNER_SHELL for the inner one).
 */
export function createShellGeometry(r: number, span: { height: number; center: number }): THREE.CylinderGeometry {
  const g = new THREE.CylinderGeometry(r, r, span.height, SEGMENTS, 1, true)
  g.translate(0, span.center, 0)
  return g
}

/** Lathe of an (x = radius, y = height) profile around Y. */
export function createLatheGeometry(pts: [number, number][]): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    SEGMENTS,
  )
}

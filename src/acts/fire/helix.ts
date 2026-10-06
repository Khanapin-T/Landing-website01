import * as THREE from 'three'
import { COILS } from '../../config/fire'

const TAU = Math.PI * 2

/** Spring around the local Y axis, centered at the origin. */
class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly length: number,
    private readonly turns: number,
    private readonly radius: number,
  ) {
    super()
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const a = t * this.turns * TAU
    return target.set(this.radius * Math.cos(a), (t - 0.5) * this.length, this.radius * Math.sin(a))
  }
}

/** A heating-coil spring of the given length (turns follow COILS.pitch), along the Y axis or the X axis. */
export function createHelixGeometry(length: number, axis: 'x' | 'y'): THREE.BufferGeometry {
  const turns = Math.max(1, Math.round(length / COILS.pitch))
  const curve = new HelixCurve(length, turns, COILS.coilRadius)
  const g = new THREE.TubeGeometry(curve, turns * COILS.stepsPerTurn, COILS.tubeRadius, COILS.radialSegments, false)
  if (axis === 'x') g.rotateZ(-Math.PI / 2)
  return g
}

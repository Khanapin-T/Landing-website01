import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { focusOffsetX } from './cameraMath'

/** Keeps the scene center at 58% of the width (room for the copy column on the left). */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)

  useLayoutEffect(() => {
    camera.setViewOffset(size.width, size.height, focusOffsetX(size.width), 0, size.width, size.height)
    camera.updateProjectionMatrix()
    return () => {
      camera.clearViewOffset()
    }
  }, [camera, size.width, size.height])

  return null
}

import { useLayoutEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { focusOffsetX } from './cameraMath'
import { story } from '../story/store'

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

  useFrame(() => {
    camera.position.y = story.cam.y
    camera.position.z = story.cam.z
    // look == y keeps the camera level (identical to the default -Z view); a higher camera tilts down at the target.
    camera.lookAt(0, story.cam.look, 0)
  })

  return null
}

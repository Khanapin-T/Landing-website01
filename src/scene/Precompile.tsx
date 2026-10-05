import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { setError, setReady } from '../story/appState'

/**
 * Mounted after all suspending content. Compiles every visible material, then waits two frames
 * (post-processing shaders compile on first render) before declaring the app ready.
 */
export function Precompile() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    let alive = true
    gl.compileAsync(scene, camera)
      .then(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => alive && setReady()))
      })
      .catch((e: unknown) => setError(String(e)))
    return () => {
      alive = false
    }
  }, [gl, scene, camera])

  return null
}

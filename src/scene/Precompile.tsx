import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { WebGLRenderTarget } from 'three'
import { setError, setReady } from '../story/appState'

/**
 * Mounted after all suspending content. Compiles every material in the scene, then waits two frames
 * (post-processing shaders compile on first render) before declaring the app ready.
 * Act sessions: keep act lights visible during loading, otherwise the light count changes later and
 * forces recompiles mid-scroll.
 */
export function Precompile() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    let alive = true
    // three keys a program's output color space on the bound render target. The composer draws the scene
    // into a linear target, so bind one while compileAsync() runs its synchronous compile() pass.
    const target = new WebGLRenderTarget(1, 1)
    const previous = gl.getRenderTarget()
    gl.setRenderTarget(target)
    const compiling = gl.compileAsync(scene, camera)
    gl.setRenderTarget(previous)
    compiling
      .then(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => alive && setReady()))
      })
      .catch((e: unknown) => setError(String(e)))
      .finally(() => target.dispose())
    return () => {
      alive = false
    }
  }, [gl, scene, camera])

  return null
}

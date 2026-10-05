export function hasWebGL2(make: () => HTMLCanvasElement = () => document.createElement('canvas')): boolean {
  try {
    const gl = make().getContext('webgl2')
    if (!gl) return false
    // Release the probe context right away; the app creates its own.
    try {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      // A context that cannot be released is still a working WebGL 2 context.
    }
    return true
  } catch {
    return false
  }
}

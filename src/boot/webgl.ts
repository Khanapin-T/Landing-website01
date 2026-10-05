export function hasWebGL2(make: () => HTMLCanvasElement = () => document.createElement('canvas')): boolean {
  try {
    return Boolean(make().getContext('webgl2'))
  } catch {
    return false
  }
}

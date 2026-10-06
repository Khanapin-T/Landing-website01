import { createRingMaterial, type RingMaterialHandle } from './ringMaterial'

let handle: RingMaterialHandle | undefined

/** One ring material for the hero and every clone: same program, same uniforms (written once per frame by HeroRing). */
export function getRingMaterial(): RingMaterialHandle {
  return (handle ??= createRingMaterial())
}

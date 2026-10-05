import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { getAppState } from '../../story/appState'
import { master, syncMaster } from '../../story/master'
import { story } from '../../story/store'
import { shouldRender } from '../../story/visibility'
import { registerPlaceholder } from '../placeholder'
import { PRINT_BEATS } from './beats'
import { BuildPlate } from './BuildPlate'
import { registerPrint } from './timeline'
import { Vat } from './Vat'

/** Act 2: resin vat and build plate. The ring itself (resin state, clip, sprue) is the persistent HeroRing. */
export function PrintScene() {
  useLayoutEffect(() => {
    const offs = [registerPrint(master), registerPlaceholder(master)]
    syncMaster()
    return () => offs.forEach((off) => off())
  }, [])

  const root = useRef<Group>(null)
  useFrame(() => {
    if (root.current) {
      root.current.visible = shouldRender(getAppState().phase, story.screen, PRINT_BEATS.windowFrom, PRINT_BEATS.windowTo)
    }
  })

  return (
    <group ref={root}>
      <Vat />
      <BuildPlate />
    </group>
  )
}

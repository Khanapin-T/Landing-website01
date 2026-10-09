import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { getAppState } from '../../story/appState'
import { master, syncMaster } from '../../story/master'
import { story } from '../../story/store'
import { shouldRender } from '../../story/visibility'
import { PRINT_BEATS } from './beats'
import { BuildPlate } from './BuildPlate'
import { registerPrint } from './timeline'
import { CureBed } from './CureBed'
import { Supports } from './Supports'

/** Act 2: cure light under the resin bed and the build plate (the bed itself is ResinStream's points). The ring itself (resin state, clip, sprue) is the persistent HeroRing. */
export function PrintScene() {
  useLayoutEffect(() => {
    const offs = [registerPrint(master)]
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
      <CureBed />
      <BuildPlate />
      <Supports />
    </group>
  )
}

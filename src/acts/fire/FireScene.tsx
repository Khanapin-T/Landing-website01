import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { getAppState } from '../../story/appState'
import { master, syncMaster } from '../../story/master'
import { story } from '../../story/store'
import { shouldRender } from '../../story/visibility'
import { FIRE_BEATS } from './beats'
import { BurnoutCloud } from './BurnoutCloud'
import { Coils } from './Coils'
import { HeatBackdrop } from './HeatBackdrop'
import { registerFire } from './timeline'

/**
 * Act 4: heating coils and the burnout particles inside the act's window, plus the molten backdrop (which keeps its
 * glow until a later act cools the heat down). The flask itself, its X-ray shell, the cavity and the flip live in
 * MoldScene (the flask owner) and follow story.flask.
 */
export function FireScene() {
  useLayoutEffect(() => {
    const off = registerFire(master)
    syncMaster()
    return off
  }, [])

  const root = useRef<Group>(null)
  useFrame(() => {
    if (root.current) {
      root.current.visible = shouldRender(getAppState().phase, story.screen, FIRE_BEATS.windowFrom, FIRE_BEATS.windowTo)
    }
  })

  return (
    <>
      <HeatBackdrop />
      <group ref={root}>
        <Coils />
        <BurnoutCloud />
      </group>
    </>
  )
}

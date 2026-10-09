import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { getAppState } from '../../story/appState'
import { master, syncMaster } from '../../story/master'
import { story } from '../../story/store'
import { shouldRender } from '../../story/visibility'
import { WATER_BEATS } from './beats'
import { Bucket } from './Bucket'
import { Drips } from './Drips'
import { RawTree } from './RawTree'
import { Steam } from './Steam'
import { registerWater } from './timeline'
import { WaterSurface } from './WaterSurface'

/**
 * Act 6: the bucket with the water and the steam, the drips and the raw tree. The flask itself lives in MoldScene
 * (the flask owner) and follows story.flask (dip, wash, away); the copy column and the timer are DOM (WaterHud).
 */
export function WaterScene() {
  useLayoutEffect(() => {
    const off = registerWater(master)
    syncMaster()
    return off
  }, [])

  const root = useRef<Group>(null)
  useFrame(() => {
    if (root.current) root.current.visible = shouldRender(getAppState().phase, story.screen, WATER_BEATS.windowFrom, WATER_BEATS.windowTo)
  })

  return (
    <group ref={root}>
      <Bucket>
        <WaterSurface />
        <Steam />
      </Bucket>
      <Drips />
      <RawTree />
    </group>
  )
}

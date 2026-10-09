import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { FLIP } from '../../config/fire'
import { MOLD, tapeSpin } from '../../config/mold'
import { Cavity } from '../../scene/furnace/Cavity'
import { heatColor } from '../../scene/furnace/heat'
import { heatUniforms, xrayUniform } from '../../scene/furnace/uniforms'
import { getAppState } from '../../story/appState'
import { master, syncMaster } from '../../story/master'
import { story } from '../../story/store'
import { shouldRender } from '../../story/visibility'
import { Tree } from '../../scene/tree/Tree'
import { MOLD_BEATS } from './beats'
import { Bubbles } from './Bubbles'
import { Flask } from './Flask'
import { FlaskXray } from './FlaskXray'
import { Investment } from './Investment'
import { RubberBase } from './RubberBase'
import { mold } from './state'
import { Tape } from './Tape'
import { registerMold } from './timeline'

const glow: [number, number, number] = [0, 0, 0]

/**
 * Act 3: rubber base, wax tree with the clone rings, then the flask (steel, tape, investment, bubbles) that comes
 * down over it. The hero ring itself is the persistent HeroRing (it blends into tree slot 0). The scene stays
 * after the act. This component is also the flask owner for the furnace (Acts 4-5): it writes the shared furnace
 * uniforms from story.flask, mounts the flask's X-ray shell and the cavity outline, and turns the whole flask over.
 */
export function MoldScene() {
  useLayoutEffect(() => {
    const off = registerMold(master)
    syncMaster()
    return off
  }, [])

  const root = useRef<Group>(null)
  const rig = useRef<Group>(null)
  const flipper = useRef<Group>(null)
  const spinner = useRef<Group>(null)
  useFrame(() => {
    const loading = getAppState().phase === 'loading'
    if (root.current) {
      root.current.visible = shouldRender(getAppState().phase, story.screen, MOLD_BEATS.windowFrom, MOLD_BEATS.windowTo)
    }
    if (rig.current) {
      rig.current.visible = loading || mold.flask > 0.001
      rig.current.position.y = (1 - mold.flask) * MOLD.flask.dropHeight
    }
    // The flask turns while the tape is laid, so the lay point stays facing the camera. The unwind runs on a
    // still flask (6 turns in 0.2 screens would strobe against the hole pattern); tapeSpin(1) is a whole number
    // of turns, so the hand-over at tapeTo is seamless.
    if (spinner.current) spinner.current.rotation.y = story.screen <= MOLD_BEATS.tapeTo ? tapeSpin(mold.tape) : 0

    // Furnace: shared uniforms for the flask and investment shaders, and the flip about the flask middle.
    xrayUniform.value = story.flask.xray
    heatUniforms.uHeat.value = story.flask.heat
    heatColor(story.flask.heat, glow)
    heatUniforms.uHeatColor.value.setRGB(glow[0], glow[1], glow[2])
    if (flipper.current) flipper.current.rotation.z = story.flask.flip * Math.PI
  })

  return (
    <group ref={root}>
      <RubberBase />
      <Tree />
      <group ref={rig}>
        {/* Pivot at the flask middle (including the foot): rotate there, then undo the offset for the contents.
            GoldFill and PourCloud (src/acts/gold) reproduce this flip as a fixed Rz(pi) about FLIP.pivotY at the scene
            root, so a change here must be mirrored there. */}
        <group ref={flipper} position-y={FLIP.pivotY}>
          <group position-y={-FLIP.pivotY}>
            <group ref={spinner}>
              <Flask />
              <Tape />
            </group>
            <Investment />
            <Bubbles />
            <FlaskXray />
            <Cavity />
          </group>
        </group>
      </group>
    </group>
  )
}

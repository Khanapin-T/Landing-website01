import { Environment, Lightformer } from '@react-three/drei'

/** Cheap reflections for the gold: a few light cards rendered into a cube map once (frames={1}). */
export function StudioEnvironment() {
  return (
    <Environment frames={1} resolution={256}>
      <Lightformer form="rect" intensity={3} position={[0, 4, 2]} rotation-x={Math.PI / 2} scale={[6, 2, 1]} />
      <Lightformer form="rect" intensity={1.5} position={[-4, 1, 1]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#bcd4ff" position={[4, 0.5, -1]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
      <Lightformer form="ring" intensity={2} position={[0, 1, -5]} scale={3} />
    </Environment>
  )
}

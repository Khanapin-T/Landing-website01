import {
  Scene,
  Group,
  Color,
  DirectionalLight,
  HemisphereLight,
  PointLight,
  PMREMGenerator,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Fixed light set: lights are never added or removed later (no shader recompiles).
// `accent` stays at intensity 0 until a scene needs a glow (furnace, molten metal).
export function createScene(renderer) {
  const scene = new Scene();
  const world = new Group();
  world.name = 'world';
  scene.add(world);

  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envMap = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  scene.environment = envMap;
  pmrem.dispose();

  const key = new DirectionalLight(new Color(0xfff0dc), 2);
  key.position.set(4, 6, 5);
  const fill = new HemisphereLight(new Color(0xbcc8e0), new Color(0x2a2420), 0.4);
  const accent = new PointLight(new Color(0xff8a3c), 0, 0, 2);
  accent.position.set(0, 0, 2);
  scene.add(key, fill, accent);

  return { scene, world, lights: { key, fill, accent }, envMap };
}

import { Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const FILES = {
  hero: '/models/ring.glb',
  light: '/models/ring_light.glb',
};

// Fallback sizes (bytes) for progress when Content-Length is missing or the response is compressed.
export const ASSET_BYTES = {
  '/models/ring.glb': 2964200,
  '/models/ring_light.glb': 1317796,
};

const TARGET_HEIGHT = 2.48;

// Centres the bbox, scales to the target height along Y, keeps Y-up. The glb material is ignored.
export function normalizeGeometry(geo, targetHeight = TARGET_HEIGHT) {
  geo.computeBoundingBox();
  const center = geo.boundingBox.getCenter(new Vector3());
  geo.translate(-center.x, -center.y, -center.z);
  geo.computeBoundingBox();
  const height = geo.boundingBox.max.y - geo.boundingBox.min.y;
  const k = targetHeight / height;
  geo.scale(k, k, k);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function extractGeometry(gltf) {
  let geometry = null;
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (geometry || !(o instanceof Mesh)) return;
    geometry = o.geometry.clone();
    geometry.applyMatrix4(o.matrixWorld); // bake node transforms
  });
  if (!geometry) throw new Error('No mesh found in glb');
  // Materials/textures of the glb are not used.
  gltf.scene.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    o.geometry.dispose();
    [].concat(o.material).forEach((m) => m && m.dispose());
  });
  return normalizeGeometry(geometry);
}

// onProgress(fraction 0..1, loadedBytes, totalBytes)
export async function loadAssets(onProgress = () => {}) {
  const loader = new GLTFLoader();
  const keys = Object.keys(FILES);
  const loaded = {};
  const totals = {};
  for (const k of keys) totals[FILES[k]] = ASSET_BYTES[FILES[k]];
  const report = () => {
    let l = 0;
    let t = 0;
    for (const k of keys) {
      const url = FILES[k];
      l += Math.min(loaded[url] || 0, totals[url]);
      t += totals[url];
    }
    onProgress(t ? l / t : 0, l, t);
  };

  const gltfs = await Promise.all(
    keys.map((k) =>
      loader.loadAsync(FILES[k], (e) => {
        const url = FILES[k];
        loaded[url] = e.loaded;
        if (e.lengthComputable && e.total && e.loaded <= e.total) totals[url] = e.total;
        report();
      }),
    ),
  );
  for (const k of keys) loaded[FILES[k]] = totals[FILES[k]];
  report();

  const [heroGeo, lightGeo] = gltfs.map(extractGeometry);
  return { heroGeo, lightGeo };
}

// App bootstrap. Builds the frozen `ctx` that scenes and the timeline build on:
// ctx = { renderer, scene, camera, world, lights, rig, background, postfx, quality, loop }
import { MeshStandardMaterial, Mesh, SphereGeometry, BoxGeometry } from 'three';
import { createRenderer } from './core/renderer.js';
import { createScene } from './core/scene.js';
import { createBackground } from './core/background.js';
import { createRig } from './core/rig.js';
import { createLoop } from './core/loop.js';
import { detectTier, createAdaptive } from './core/quality.js';

const params = new URLSearchParams(location.search);

async function boot() {
  // Dev harness first, so errors during boot are captured.
  const debug = params.has('debug') ? await import('./core/debug.js') : null;

  const canvas = document.getElementById('gl');
  const { renderer, setDpr, getDpr } = createRenderer(canvas);
  const tier = detectTier(renderer.getContext(), params.get('tier'));
  setDpr(Math.min(window.devicePixelRatio || 1, tier.dprMax));

  const { scene, world, lights } = createScene(renderer);
  const background = createBackground(scene);
  const rig = createRig();
  const postfx = null; // added by the post pass task

  const ctx = { renderer, scene, camera: rig.camera, world, lights, rig, background, postfx, quality: null, loop: null };

  const loop = createLoop({
    render: () => {
      renderer.info.reset();
      renderer.render(scene, rig.camera);
    },
  });
  ctx.loop = loop;

  function applySize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    rig.resize(w, h);
    background.resize(w, h);
    loop.markDirty();
  }

  const adaptive = createAdaptive({
    tier,
    getDpr,
    setDpr: (dpr) => {
      setDpr(dpr);
      applySize();
    },
  });
  ctx.quality = { tier, adaptive, getDpr, setDpr };
  loop.onFrame((ms, now) => adaptive.frame(ms, now));

  loop.add(() => {
    if (rig.update()) loop.markDirty();
    if (background.update()) loop.markDirty();
  });

  window.addEventListener('resize', applySize);
  applySize();

  let resolveReady;
  const ready = new Promise((r) => (resolveReady = r));
  if (params.has('demo')) addDemo(ctx);
  if (debug) debug.initDebug(ctx, { ready });

  loop.renderNow();
  resolveReady();
}

// DEV ONLY (?demo): a few test meshes to check lighting, view offset and the post pass.
// Later tasks replace this with the real hero; it is not part of the product.
function addDemo(ctx) {
  const gold = new Mesh(
    new SphereGeometry(1.2, 64, 32),
    new MeshStandardMaterial({ color: 0xd9a560, metalness: 1, roughness: 0.25 }),
  );
  const box = new Mesh(new BoxGeometry(1.4, 1.4, 1.4), new MeshStandardMaterial({ color: 0x8892a8, metalness: 0.2, roughness: 0.6 }));
  box.position.set(-3, -0.6, -1);
  const glow = new Mesh(
    new SphereGeometry(0.45, 32, 16),
    new MeshStandardMaterial({ color: 0x331100, emissive: 0xff7a2a, emissiveIntensity: 6 }),
  );
  glow.position.set(2.8, 0.7, 0);
  ctx.world.add(gold, box, glow);
  ctx.demo = { gold, box, glow };
  ctx.rig.followTarget = gold;
  ctx.loop.add((dt) => {
    box.rotation.y += dt * 0.5;
    box.rotation.x += dt * 0.2;
    ctx.loop.markDirty();
  });
  ctx.loop.markDirty();
}

boot();

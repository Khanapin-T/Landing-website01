// App bootstrap. Builds the frozen `ctx` that scenes and the timeline build on:
// ctx = { renderer, scene, camera, world, lights, rig, background, postfx, quality, loop, hero }
import { MeshStandardMaterial, Mesh, SphereGeometry, BoxGeometry } from 'three';
import { createRenderer } from './core/renderer.js';
import { createScene } from './core/scene.js';
import { createBackground } from './core/background.js';
import { createRig } from './core/rig.js';
import { createLoop } from './core/loop.js';
import { createPostFx } from './core/postfx.js';
import { detectTier, createAdaptive } from './core/quality.js';
import { loadAssets } from './core/assets.js';
import { createHero } from './hero.js';

const params = new URLSearchParams(location.search);

async function boot() {
  // Dev harness first, so errors during boot are captured.
  const debug = params.has('debug') ? await import('./core/debug.js') : null;

  const canvas = document.getElementById('gl');
  const { renderer, setDpr, getDpr } = createRenderer(canvas);
  const tier = detectTier(renderer.getContext(), params.get('tier'));
  if (params.has('msaa')) tier.post = { ...tier.post, samples: Number(params.get('msaa')) }; // A/B only

  const { scene, world, lights } = createScene(renderer);
  const background = createBackground(scene);
  const rig = createRig();
  const postfx = createPostFx(renderer, tier, { onDirty: () => loop.markDirty() });
  postfx.enabled = params.get('post') !== '0'; // ?post=0 renders directly (A/B)

  const ctx = { renderer, scene, camera: rig.camera, world, lights, rig, background, postfx, quality: null, loop: null, hero: null };

  const loop = createLoop({
    render: () => {
      renderer.info.reset();
      postfx.render(scene, rig.camera);
    },
  });
  ctx.loop = loop;

  // Effective DPR: device ratio capped by the tier and by the adaptive quality steps.
  let dprCap = Infinity;
  const targetDpr = () => Math.min(window.devicePixelRatio || 1, tier.dprMax, dprCap);

  function applySize() {
    setDpr(targetDpr());
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    rig.resize(w, h);
    background.resize(w, h);
    postfx.setSize(w, h, getDpr());
    loop.markDirty();
  }

  function capDpr(dpr) {
    dprCap = dpr;
    applySize();
  }

  const adaptive = createAdaptive({
    tier,
    getDpr,
    setPost: (p) => postfx.setQuality(p),
    setDpr: capDpr,
  });
  ctx.quality = { tier, adaptive, getDpr, setDpr: capDpr };
  loop.onFrame((ms, now) => adaptive.frame(ms, now));

  loop.add(() => {
    if (rig.update()) loop.markDirty();
    if (background.update()) loop.markDirty();
  });

  window.addEventListener('resize', applySize);
  applySize();

  const { heroGeo } = await loadAssets();
  const hero = createHero(ctx, heroGeo);
  // Foundation default view (three-quarter, honeycomb visible) until the timeline drives the hero.
  hero.spin.rotation.y = -0.6;
  rig.state.dist = 9.5;
  rig.state.pitch = 0.2;
  if (import.meta.env.DEV && params.has('hero')) hero.setState(params.get('hero')); // ?hero=cad|resin|rawGold|polished (screenshots)

  let resolveReady;
  const ready = new Promise((r) => (resolveReady = r));
  if (import.meta.env.DEV && params.has('demo')) addDemo(ctx);
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
  ctx.demo = { gold, box, glow, spin: !params.has('still') };
  ctx.rig.followTarget = gold;
  ctx.loop.add((dt) => {
    if (!ctx.demo.spin) return;
    box.rotation.y += dt * 0.5;
    box.rotation.x += dt * 0.2;
    ctx.loop.markDirty();
  });
  ctx.loop.markDirty();
}

boot();

// The one persistent hero ring. Hierarchy (never reparented, never reloaded):
//   ctx.world > carrier > holder > anchor > spin > body > mesh
// carrier/holder/anchor are pose groups tweened by the timeline (see poses.js); `spin` is the
// turn around the vertical axis; `body` is a static offset slot; props that ride the ring
// (tree, flask) are added to `holder` through hero.attach(obj).
import { Group, Mesh } from 'three';
import { look, createHeroMaterial, createPrintMaterial, createFollower, plane, setLook } from './materials.js';

export function createHero(ctx, geo) {
  const carrier = new Group();
  const holder = new Group();
  const anchor = new Group();
  const spin = new Group();
  const body = new Group();
  carrier.name = 'hero-carrier';
  holder.name = 'hero-holder';
  anchor.name = 'hero-anchor';
  spin.name = 'hero-spin';
  body.name = 'hero-body';
  carrier.add(holder);
  holder.add(anchor);
  anchor.add(spin);
  spin.add(body);

  const envMap = ctx.scene.environment;
  const material = createHeroMaterial(envMap);
  const printMaterial = createPrintMaterial(envMap);
  const mesh = new Mesh(geo, material);
  mesh.name = 'hero-ring';
  body.add(mesh);
  ctx.world.add(carrier);

  const params = { fade: 1 }; // opacity multiplier, tweened by the timeline
  const followers = [];
  const prev = new Float64Array(12);
  const cur = new Float64Array(12);

  // Writes `look` and `params.fade` into the material. Cheap: skips the work when nothing
  // changed. Returns true when it did change (the loop hook then marks the frame dirty).
  function apply() {
    const l = look;
    cur[0] = l.r; cur[1] = l.g; cur[2] = l.b;
    cur[3] = l.roughness; cur[4] = l.metalness; cur[5] = l.opacity;
    cur[6] = l.er; cur[7] = l.eg; cur[8] = l.eb;
    cur[9] = l.emissiveIntensity; cur[10] = l.envMapIntensity;
    cur[11] = params.fade;
    let changed = false;
    for (let i = 0; i < 12; i++) {
      if (cur[i] !== prev[i]) {
        changed = true;
        prev[i] = cur[i];
      }
    }
    if (!changed) return false;
    material.color.setRGB(l.r, l.g, l.b);
    material.roughness = l.roughness;
    material.metalness = l.metalness;
    material.emissive.setRGB(l.er, l.eg, l.eb);
    material.emissiveIntensity = l.emissiveIntensity;
    material.envMapIntensity = l.envMapIntensity;
    material.opacity = l.opacity * params.fade;
    mesh.visible = params.fade > 0.01;
    for (let i = 0; i < followers.length; i++) followers[i]();
    return true;
  }

  const hero = {
    carrier, holder, anchor, spin, body, mesh,
    look, params, material, printMaterial, plane,
    apply,
    // Props that ride the ring (tree, flask, tweezers...) are added to `holder`.
    attach: (obj) => {
      holder.add(obj);
      return obj;
    },
    // Material for clones that copies the hero look each time it changes (own opacity kept).
    createFollower: () => {
      const f = createFollower(material);
      followers.push(f.sync);
      return f;
    },
    setState: (name) => {
      setLook(name);
      apply();
      ctx.loop.markDirty();
    },
    // Screen position of the ring: { x, y, h } as fractions of the viewport.
    project: () => ctx.rig.project(mesh),
  };

  apply();
  ctx.loop.add(() => {
    if (apply()) ctx.loop.markDirty();
  });
  ctx.rig.followTarget = body;
  ctx.hero = hero;
  return hero;
}

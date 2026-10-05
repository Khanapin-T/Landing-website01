// Ring materials. ONE hero material whose values are driven by `look` (a plain tweenable
// object, linear colors) so scenes can move between the four looks on the scroll timeline.
// `transparent` is true for the whole life of the material and never changed at runtime
// (no shader recompiles); `opacity = look.opacity * hero.params.fade` is written by hero.apply().
import { MeshStandardMaterial, Color, DoubleSide, FrontSide, Plane, Vector3 } from 'three';
import gsap from 'gsap';

// Look states. Colors are sRGB hex (like CSS); the look object stores them linear.
// Tuned by eye against assets/reference (rhino_4_views_red, ring_render_gold_a/b, ring_polished_photo).
export const STATES = {
  cad: { color: 0xc75b57, roughness: 0.9, metalness: 0, opacity: 1, emissive: 0x000000, emissiveIntensity: 0, envMapIntensity: 0.3 },
  resin: { color: 0xc3dda6, roughness: 0.4, metalness: 0, opacity: 0.9, emissive: 0xcfe6b3, emissiveIntensity: 0.1, envMapIntensity: 0.5 },
  rawGold: { color: 0x9c5a40, roughness: 0.7, metalness: 1, opacity: 1, emissive: 0x000000, emissiveIntensity: 0, envMapIntensity: 0.6 },
  polished: { color: 0xe6a97f, roughness: 0.18, metalness: 1, opacity: 1, emissive: 0x000000, emissiveIntensity: 0, envMapIntensity: 1.4 },
};

const _c = new Color();

// Plain numbers (linear colors) for a state: this is what gsap tweens.
function valuesOf(name) {
  const s = STATES[name];
  if (!s) throw new Error(`Unknown look state "${name}"`);
  _c.set(s.color);
  const out = { r: _c.r, g: _c.g, b: _c.b, roughness: s.roughness, metalness: s.metalness, opacity: s.opacity };
  _c.set(s.emissive);
  out.er = _c.r;
  out.eg = _c.g;
  out.eb = _c.b;
  out.emissiveIntensity = s.emissiveIntensity;
  out.envMapIntensity = s.envMapIntensity;
  return out;
}

// The one hero look. The hero ring is a single persistent object, so this is a module singleton:
// timelines tween it through tweenLook() and hero.apply() copies it into the material.
export const look = valuesOf('cad');

// Jump to a state (no animation).
export function setLook(name) {
  Object.assign(look, valuesOf(name));
}

// Adds a tween of the hero look to state `name` to timeline `tl`, starting at `at`, lasting `len`
// (timeline units). Scrubbed timelines use the linear default ease.
export function tweenLook(tl, name, at, len, ease = 'none') {
  tl.to(look, { ...valuesOf(name), duration: len, ease }, at);
  return tl;
}

function applyLook(material, l) {
  material.color.setRGB(l.r, l.g, l.b);
  material.roughness = l.roughness;
  material.metalness = l.metalness;
  material.emissive.setRGB(l.er, l.eg, l.eb);
  material.emissiveIntensity = l.emissiveIntensity;
  material.envMapIntensity = l.envMapIntensity;
}

// `envMap` is set explicitly: with scene.environment only, three ignores material.envMapIntensity.
export function createHeroMaterial(envMap) {
  const m = new MeshStandardMaterial({ transparent: true, side: FrontSide, envMap });
  m.name = 'hero';
  applyLook(m, look);
  return m;
}

// Material for tree clones: copies the hero look every sync(), but keeps its own opacity
// (set it directly, e.g. for pop-in). transparent stays true, never toggled.
export function createFollower(heroMat) {
  const material = new MeshStandardMaterial({ transparent: true, side: FrontSide, envMap: heroMat.envMap });
  material.name = 'follower';
  const sync = () => {
    material.color.copy(heroMat.color);
    material.roughness = heroMat.roughness;
    material.metalness = heroMat.metalness;
    material.emissive.copy(heroMat.emissive);
    material.emissiveIntensity = heroMat.emissiveIntensity;
    material.envMapIntensity = heroMat.envMapIntensity;
  };
  sync();
  return { material, sync };
}

// Clipping plane of the print reveal (scene 4), in world space. Fragments with a negative signed
// distance are clipped: with normal (0,1,0) everything above y = -constant stays visible, so the
// scene tweens plane.constant (it may also set the normal). Starts with nothing clipped.
export const plane = new Plane(new Vector3(0, 1, 0), 100);

// Resin material for the printed ring (grows layer by layer, clipped by `plane`). DoubleSide so the
// clipped cross-section shows the inside surface instead of a hole. Fixed resin look.
export function createPrintMaterial(envMap) {
  const m = new MeshStandardMaterial({ transparent: true, side: DoubleSide, clippingPlanes: [plane], envMap });
  m.name = 'print';
  applyLook(m, valuesOf('resin'));
  m.opacity = STATES.resin.opacity;
  return m;
}

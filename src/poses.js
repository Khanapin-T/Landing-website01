// Hand-off pose table (DRAFT). POSES[i] is the pose at the START of scene i (0-based, in the
// order of STAGES in config.js); POSES[14] is the end of the last scene. Scene i tweens the hero
// from POSES[i] to POSES[i+1]; inside its own segment a scene may do anything, but at both
// boundaries the hero must be exactly in these poses, so scenes hand off without a jump.
// Stage tasks may refine the poses of their own i -> i+1 boundary only after controller approval.
//
// Pose shape (all angles in radians, Euler XYZ; scale is uniform):
//   anchor, holder, carrier: { pos: [x, y, z], rot: [x, y, z], scale: number }
//     carrier > holder > anchor > spin > body > mesh is the hero hierarchy (see hero.js);
//     the anchor is the ring itself, the holder carries props that ride the ring (tree, flask),
//     the carrier carries the whole assembly through the scene.
//   fade:  0..1, hero opacity multiplier (hero.params.fade)
//   look:  'cad' | 'resin' | 'rawGold' | 'polished' (STATES in materials.js)
//   rig:   camera rig state { follow, dist, yaw, pitch, ox, oy, oz } (see core/rig.js)
//
// Story: 0 catalog (ring is a drawn item, hero hidden) | 1 rhino (assembled from particles) |
// 2 printer (dissolved into particles) | 3 platform (hangs upside down, resin) | 4 tree (upright
// at a slot on the tree) | 5 flask | 6 foundry (ring inside the flask) | 7 vacuum (hidden by
// the investment) | 8 furnace | 9 casting | 10 water | 11 cut (raw gold, upright) |
// 12 processing (raw -> polished) | 13 final (polished, tilted ~10 deg, centered).

const V0 = [0, 0, 0];

const xf = (pos = V0, rot = V0, scale = 1) => ({ pos, rot, scale });

function pose({ anchor, holder, carrier, fade = 1, look = 'cad', rig = {} }) {
  return {
    anchor: anchor || xf(),
    holder: holder || xf(),
    carrier: carrier || xf(),
    fade,
    look,
    rig: { follow: 1, dist: 12, yaw: 0, pitch: 0, ox: 0, oy: 0, oz: 0, ...rig },
  };
}

const UPRIGHT = xf(); // signet plate up, finger axis along Z
const THREE_QUARTER = xf(V0, [0, -0.6, 0]); // honeycomb side visible
const HANGING = xf(V0, [Math.PI, 0, 0]); // upside down under the build plate
const TILT = xf(V0, [0.175, 0, 0]); // ~10 deg
const IN_FLASK = xf([0, 1.4, 0], V0, 0.8); // ring on its slot of the tree inside the flask

export const POSES = [
  /* 0  catalog start    */ pose({ anchor: UPRIGHT, fade: 0, look: 'cad', rig: { dist: 12 } }),
  /* 1  rhino start      */ pose({ anchor: THREE_QUARTER, fade: 0, look: 'cad', rig: { dist: 10, yaw: 0.2, pitch: 0.18 } }),
  /* 2  printer start    */ pose({ anchor: THREE_QUARTER, fade: 0, look: 'cad', rig: { dist: 12 } }),
  /* 3  platform start   */ pose({ anchor: HANGING, fade: 0, look: 'resin', rig: { dist: 11, pitch: 0.12 } }),
  /* 4  tree start       */ pose({ anchor: HANGING, fade: 1, look: 'resin', rig: { dist: 11, pitch: 0.12 } }),
  /* 5  flask start      */ pose({ anchor: IN_FLASK, fade: 1, look: 'resin', rig: { dist: 14, pitch: 0.12 } }),
  /* 6  foundry start    */ pose({ anchor: IN_FLASK, fade: 1, look: 'resin', rig: { dist: 15, pitch: 0.1 } }),
  /* 7  vacuum start     */ pose({ anchor: IN_FLASK, fade: 0, look: 'resin', rig: { dist: 15, pitch: 0.1 } }),
  /* 8  furnace start    */ pose({ anchor: IN_FLASK, fade: 0, look: 'resin', rig: { dist: 15, pitch: 0.1 } }),
  /* 9  casting start    */ pose({ anchor: IN_FLASK, fade: 0, look: 'resin', rig: { dist: 15, pitch: 0.1 } }),
  /* 10 water start      */ pose({ anchor: IN_FLASK, fade: 0, look: 'rawGold', rig: { dist: 15, pitch: 0.1 } }),
  /* 11 cut start        */ pose({ anchor: UPRIGHT, fade: 1, look: 'rawGold', rig: { dist: 12, pitch: 0.1 } }),
  /* 12 processing start */ pose({ anchor: UPRIGHT, fade: 1, look: 'rawGold', rig: { dist: 10, pitch: 0.1 } }),
  /* 13 final start      */ pose({ anchor: TILT, fade: 1, look: 'polished', rig: { dist: 9 } }),
  /* 14 end              */ pose({ anchor: TILT, fade: 1, look: 'polished', rig: { dist: 9 } }),
];

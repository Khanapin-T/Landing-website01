// Scene lengths and draft backgrounds. Pure data (no browser or three imports), so it can be
// imported from node. TIERS (quality) stay in core/quality.js.

export const LAYOUT = {
  focusX: 0.59, // focus object sits right of centre (the text panel is on the left)
};

// `bg` feeds ctx.background (sRGB hex, converted to linear by background.setColors):
// { top, bottom, glow, glowX, glowY, glowStrength, glowRadius }. Scenes may refine their own.
const bg = (top, bottom, glow, glowStrength = 0.35, glowX = 0.59, glowY = 0.5, glowRadius = 0.6) => ({
  top, bottom, glow, glowX, glowY, glowStrength, glowRadius,
});

// 14 scenes in scroll order; `vh` = length in screens of scroll. Sum = 19.9.
export const STAGES = [
  { id: 'catalog', vh: 1.2, bg: bg('#d8ccb6', '#a48f78', '#fff0d2', 0.3) }, // paper on a warm desk
  { id: 'rhino', vh: 2.0, bg: bg('#eceef0', '#bcc0c7', '#ffffff', 0.2) }, // light grey Rhino viewport
  { id: 'printer', vh: 1.2, bg: bg('#1d2736', '#0a0e15', '#3f5a7d') }, // clean dark blue-grey lab
  { id: 'platform', vh: 1.2, bg: bg('#1d2736', '#0a0e15', '#3f5a7d') },
  { id: 'tree', vh: 1.2, bg: bg('#1d2736', '#0a0e15', '#3f5a7d') },
  { id: 'flask', vh: 1.2, bg: bg('#1c1c20', '#08080a', '#3a3a42', 0.3) }, // dark neutral
  { id: 'foundry', vh: 1.5, bg: bg('#2b2019', '#0c0806', '#7a4a28', 0.4) }, // dark warm foundry
  { id: 'vacuum', vh: 1.2, bg: bg('#1c1c20', '#08080a', '#3a3a42', 0.3) },
  { id: 'furnace', vh: 2.5, bg: bg('#100908', '#030202', '#ff5a1f', 0.5, 0.59, 0.45, 0.5) }, // very dark, warm glow
  { id: 'casting', vh: 2.5, bg: bg('#2a1710', '#0b0605', '#ff7a2a', 0.55, 0.59, 0.4, 0.55) }, // dark warm, orange glow
  { id: 'water', vh: 1.2, bg: bg('#0f2a33', '#050f14', '#2a7f94', 0.4) }, // dark teal-blue
  { id: 'cut', vh: 1.2, bg: bg('#1c1c20', '#08080a', '#3a3a42', 0.3) },
  { id: 'processing', vh: 0.8, bg: bg('#151517', '#050506', '#6b5a48', 0.25) },
  { id: 'final', vh: 1.0, bg: bg('#0b0b0d', '#000000', '#3a2c22', 0.2) }, // near-black, soft glow
];

export const TOTAL_VH = STAGES.reduce((sum, s) => sum + s.vh, 0);

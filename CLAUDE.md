# Project: Lost-wax casting scrollytelling (working title: "From CAD to Gold")

Single-page **scrollytelling** (story told through scrolling) site. It shows how a **red-gold men's signet ring** is made, from CAD model to the finished ring. Portfolio piece of a jewelry designer (first website of the author). Site language: **English**.

## How to talk to the user
- Chat with the user in **Russian**, short and direct. Code, comments, UI text, commit messages: **English**.
- Rate ideas honestly (x/10) when asked. Say clearly when unsure. Do not guess about hardware/process facts: ask.
- Do not run deploy/publish commands or install global tools without asking first.

## Golden rules (from the author, highest priority)
1. **Simple, fast, beautiful.** Each stage is a few seconds of simple motion. Stylized primitives, NOT photorealism. Most things just *appear* (fade / scale / slide). No complex physics, no complex scenes, no long detailed animations.
2. **The ring (or the object holding it: tree, flask) is always the center of attention during the whole scroll.** One persistent `heroRing` object, never reloaded; its position/material/rotation are driven by the timeline.
3. Layout: full-screen fixed WebGL canvas as the "3D background"; a **small text panel on the left** explains what is happening. Because of the panel, shift the scene so the focus object sits at ~58-60% of the width on desktop (use `camera.setViewOffset` or shift the root group). Centered on mobile (panel becomes a bottom sheet).
4. Backgrounds change per stage (smooth color/gradient transitions), the text panel stays readable on all of them (dark glass panel, white text).
5. Finale: scroll ends, background goes **black**, the polished ring can be **rotated by dragging**.

## Stack and environment
- **Vite (vanilla JS, no React) + three.js + GSAP (+ScrollTrigger)**. Run `npm view three version` / `npm view gsap version` and use current stable. Import three as ES module from npm, not from a CDN.
- Author's machine: Windows 11 (PowerShell), laptop with **AMD integrated graphics only (Radeon 740M), 16 GB RAM**. Node.js LTS (>= 20).
- Deploy target: **Vercel** (static Vite build: `npm run build` -> `dist`). Do not deploy before the user confirms.
- Dev commands (Windows): `npm create vite@latest . -- --template vanilla`, `npm i three gsap`, `npm run dev`.

## Performance budget (integrated GPU!)
- Target >= 45 fps (60 ideal) at 1080p on integrated graphics. `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))`; adaptive quality: if average fps < 40 for 2 s, lower pixel ratio step by step.
- No `MeshPhysicalMaterial.transmission`, no real refraction, no heavy post-processing, no large shadow maps. Glass = plain transparent material + fresnel rim. Fake contact shadows with a soft blob texture.
- Reflections for gold: `PMREMGenerator` + `RoomEnvironment` (cheap procedural environment).
- Use `ring_light.glb` (40k tris, 1.3 MB) for tree clones; `ring.glb` (100k tris, 3 MB) only for the hero ring. Reuse geometry, use `InstancedMesh` for repeats (bubbles, sparks).
- Total initial download target < 10 MB. Loading screen with progress.

## Assets in this repo
- `public/models/ring.glb` — hero ring, **final model exported by the author from Rhino and optimized** (946k -> 100k triangles, 29 MB -> 3 MB, max deviation from the original < 0.07 mm, sharp edges preserved). `public/models/ring_light.glb` — same ring, 40k triangles, for clones. Both: one mesh, one primitive, positions + normals only (no UVs, no textures).
  - Single mesh, **Y up**, **1 unit = 1 cm**. Bounding box ≈ 2.35 (x) × 2.48 (y) × 1.03 (z) cm.
  - The ring stands upright like worn on a finger pointing along **Z**: finger hole axis = Z, **signet plate on top (+Y)**, honeycomb pattern on the inside of the shank. Plate top ≈ 1.41 × 0.91 cm; shank is ~1.03 cm wide near the plate and tapers to ~0.57 cm at the bottom; finger hole Ø ≈ 2.0-2.1 cm (approx.). Four stepped horizontal bands ("jubilee" look) on both sides of the plate.
  - **Replacement contract:** if the author re-exports the ring later, the code must **auto-normalize on load** (center the bounding box, scale to a target height, keep Y-up) so swapping the file needs no code change. The glb's material is ignored; materials are defined in code. A new export from Rhino can be 25+ MB: reduce it to <= 100k triangles / <= 5 MB first (for example `npx @gltf-transform/cli` simplify + compression; check flags with `--help`, and add the matching Draco/Meshopt decoder if you use compression).
  - Ignore any fingerprint texture seen in photos: the final plate is **smooth and mirror-like**.
- `assets/reference/*` — the author's photos/renders. **Modeling references only; do NOT ship them on the site** unless the author asks for photo cards later (then list them in `src/content.js`).

| File | Use it for |
|---|---|
| `rhino_4_views_red.jpeg` | Look of stage 1: white Rhino viewport, red shaded model, 4 views |
| `ring_render_gold_a/b.jpeg` | Target look of the final gold (soft studio light, warm gold) |
| `ring_polished_photo.png` | Real finished ring on dark fabric (mood for the finale) |
| `printer_gem3max.png` | NOVA3D GEM3 MAX shape: white body, black front panel with small screen, translucent blue hood |
| `print_in_progress_inverted.jpeg` | Resin print hangs UPSIDE DOWN from the build plate on thin vertical supports; pale green resin |
| `tree_with_resin_rings.jpeg` | Tree: dark red-brown central sprue, branches, rings attached with small connectors |
| `flask_empty_steel_perforated.png`, `flask_filled_investment.png` | Flask: steel tube with round perforations, black rubber base; filled with white investment |
| `vacuum_table_glass_dome.png` | Vacuum table: flat base + clear dome (rounded top) with a small port |
| `furnace_hot_glow.png` | Furnace: box with a front opening, interior glows pink-orange, the flask glows |
| `raw_tree_red_gold_matte.png`, `raw_tree_cast_detail.png` | Raw cast tree: matte, rough, slightly dark red gold |

## Materials and palette (define in `src/materials.js`, tweak by eye)
- **Red gold** (the author casts red gold): base `#c9795a`-ish, metalness 1.
- States of the hero ring (one material, values animated by the timeline):
  - `cad`: flat matte Rhino-red `#c75b57`, roughness 0.9, metalness 0 (like `rhino_4_views_red.jpeg`)
  - `resin`: pale green translucent `#cfe6b3`, opacity ~0.9, slight emissive
  - `rawGold`: matte, dark, rough red gold, roughness ~0.7, color a bit darker/oxidized
  - `polished`: roughness ~0.18, brighter, strong env reflections
- Tree sprue: dark red-brown `#7a1f24`. Flask steel: brushed grey. Investment: warm white `#efe8dc`. Molten gold: emissive orange-pink.

## Stages (scroll sections)
Master timeline = one GSAP timeline bound to ScrollTrigger (`scrub: 1`) over a tall `#track` element; every stage owns a labeled segment. Suggested lengths in screens (vh) are in brackets, make them constants in `src/config.js`. Show a progress indicator (11 dots, clickable, `n / 11`).

| # | Stage | Background | Scene / motion (keep it SIMPLE) | Panel text (English) |
|---|---|---|---|---|
| 1 | **Design** [2] | Rhino viewport look: light grey gradient, thin ground grid (minor lines light, major lines darker, X axis red, Y axis green), tiny "Perspective" label top-left, axes widget bottom-left | Ring is built in 5 quick steps, each one simply appears (pop/fade), thin dark edge lines for the CAD feel: (1) solid blind signet blank (disc + plate block); (2) sides trimmed from top to bottom (tapered shank); (3) stepped cylinder bands added on both sides; (4) finger-size cylinder cut out; (5) inside opened up and replaced by honeycomb = the real `ring.glb` cross-fades in. Steps 1-4 are primitive approximations (Cylinder/Box geometry), no CSG needed. Small step caption: Blank, Trim, Bands, Finger size, Honeycomb | "Designed in Rhino: a solid blank, trimmed, stepped bands added, the finger size cut, and the inside opened into a honeycomb." |
| 2 | **Print** [1.5] | Clean dark blue-grey lab gradient | A small UI chip "Sending to printer..." (HTML overlay) -> stylized **GEM3 MAX** (white box, black front panel, translucent blue hood, vat). Build platform hangs from above; ring hangs **upside down** under it with a few thin support pillars. **Layers grow downward**: reveal the ring with an animated clipping plane (platform side first). Pale green resin material | "Sent to a resin printer (NOVA3D GEM3 MAX). The ring grows layer by layer, hanging from the build plate on thin supports." |
| 3 | **Wash & cure** [1] | Same lab, then violet tint during UV | Simple jar with translucent liquid: ring dips in (isopropyl alcohol), a few bubbles; then a UV box: violet emissive pulse around the ring | "Washed in isopropyl alcohol to remove liquid resin, then UV-cured to full hardness." |
| 4 | **Tree** [1.2] | Dark neutral bench | Round base + dark red-brown central sprue; branches with small connectors; **hero ring in the middle + 2-4 clones** (`ring_light.glb`, max 5 rings total). Pop-in by scale, slow rotation | "Several prints are attached to a central sprue, the "tree", so many pieces can be cast at once." |
| 5 | **Flask** [1.5] | Dark neutral | Steel perforated flask (perforation via alphaMap/canvas texture) with black rubber base slides down over the tree. A **tape band wraps around the flask** (animated 0 -> 360° ring segment), **investment pours in** (warm-white cylinder rising + thin pour stream), then the tape **fades away** | "The tree goes into a steel flask. Tape wraps around it, and investment (jewelry casting plaster) is poured in." |
| 6 | **Vacuum** [1.2] | Dark neutral | Flask moves onto a flat **vacuum table**; a **clear glass dome** covers it (transparent + fresnel rim). The investment **boils**: instanced bubbles rise and pop + slight wobble of the top surface. Dome lifts/fades | "Under vacuum the investment boils as trapped air escapes, so the mold has no bubbles." |
| 7 | **Burnout** [2] | Furnace: very dark with warm glow | Furnace (box, front opening, light refractory interior). Sequence: door open -> flask inside (sprue hole down) -> **door closes** -> **camera zooms into the flask** -> **heating**: chamber + flask emissive ramps black -> dull red -> orange, point light grows -> **quick X-RAY switch** (flask becomes translucent fresnel shell; ring inside darkens, shrinks/dissolves with soft smoke sprites, leaving a dark **hollow cavity** in the shape of the ring) -> X-ray off, flask glowing again -> zoom back -> door opens -> **flask flips 180°** | "In the furnace the flask glows red-hot. The resin burns out and leaves a perfect hollow copy of the ring inside the mold." |
| 8 | **Casting** [2] | Cross-fade to a "casting workshop": dark warm gradient, soft orange glow, faint drifting sparks | Flipped flask (opening on top) is set on top of a **metal cylinder** (the vacuum casting cylinder: brushed steel + rubber seal ring). A simple crucible tilts above and a **molten red-gold stream** (emissive, tapering cylinder) pours into the funnel; the funnel glows. A small timer chip counts fast "00:00 -> 10:00" (rest 5-15 min), then the flask goes into water | "The flask is flipped and set on a vacuum cylinder. Molten red gold is poured in. After resting for 5-15 minutes the flask goes into water." |
| 9 | **Devesting** [1.2] | Dark teal-blue | Simple water tank (translucent box + water surface plane with tiny ripples). Flask dips in, steam sprites, investment **dissolves** (flask fades into milky particles). The flask stays in the water; only the **raw gold tree** is lifted out: matte, rough, dark red gold | "In water the investment dissolves, and the raw gold tree comes out, still matte and rough." |
| 10 | **Finish** [1.2] | Dark neutral | Simple cutter shape snaps the ring's branch (tiny flash). Ring separates and moves to the center, tree and other rings fade out. Material animates `rawGold -> polished` (roughness 0.7 -> 0.18) with one sweeping highlight and a sparkle sprite. A couple of seconds only | "The ring is cut off the tree, then filed and polished to its final finish." |
| 11 | **Final** [end] | **Black** (subtle radial `#0b0b0d` -> `#000`) | Scroll stops. `OrbitControls` enabled: drag to rotate, damping on, no pan, limited zoom, slow autorotate until the first interaction. Polished ring with env reflections, soft ground glow/reflection | "Red gold signet ring. Drag to rotate." + contact links (placeholders in `src/content.js`: name, email, Instagram/Telegram) |

Process facts to keep correct: resin is **not** wax; it burns out in the furnace (do not show wax dripping out). Order is wash in alcohol first, UV cure second. The flask is flipped after the furnace. After pouring, gold rests 5-15 min, then the flask goes into water and stays there; only the gold tree is taken out. No gemstones in this ring.

## Suggested structure
```
index.html
src/main.js            // bootstrap, loader, render loop, adaptive quality
src/config.js          // stage lengths, colors, quality tiers
src/content.js         // ALL user-visible text (stage titles/copy, links, labels)
src/materials.js       // ring material states + helpers
src/hero.js            // loads/normalizes ring.glb, exposes heroRing
src/timeline.js        // master GSAP timeline + ScrollTrigger, stage registry
src/background.js      // per-stage background/gradient transitions
src/ui.js              // text panel, progress dots, chips (timer, "Sending to printer")
src/stages/01-design.js ... 11-final.js   // each exports build(ctx) -> { group, addToTimeline(tl) }
src/props/*.js         // printer, jar, uv-box, flask, dome, furnace, crucible, tank (primitives only)
```
Keep each stage independent so one can be reworked without touching others.

## Responsive and accessibility
- < 768 px: text panel as bottom sheet, focus object centered in the upper area, lower pixel ratio and fewer particles.
- `prefers-reduced-motion`: shorter transitions, no autorotate, no particles.
- Normal page scroll must keep working (keyboard, trackpad, touch). Do not hijack scroll.

## How to work
- You (Claude Code) have your own planning and sub-agent workflow from plan to deploy: **start in plan mode**, read this file and `assets/reference/`, propose your plan and architecture (you may deviate from the suggested file structure above if you have a better one), then build and verify yourself. Do not wait for step-by-step instructions.
- Treat the stage table as the product spec, not as an implementation recipe. Choose the implementation that is simplest and fastest.
- Verify in a real browser (screenshots or Playwright if available), including fps on a low-end GPU profile and a phone viewport. Fix errors before reporting.
- `git init`, small commits. Do not add dependencies beyond `three` and `gsap` (and dev tooling such as Vite) without asking.
- Ask the author only when blocked or when a creative decision is needed; report progress in a few lines. **Do not deploy or publish anything (Vercel, GitHub) without asking first.**

## Definition of done
Smooth scroll through all 11 stages without jumps; hero ring never disappears or snaps; >= 45 fps on integrated graphics; text readable on every background; works on a phone; final black screen lets the user rotate the ring; all copy lives in `src/content.js`.

## Agreed decisions (override the sections above where they conflict)
The author's later prompt and answers take priority over the original brief.

**Ambition.** The goal is an Awwwards-level site: strong art direction, rich but light motion, 45+ fps on the Radeon 740M. "Simple" applies to code and geometry (stylized primitives), not to the visual result. Reference sites: igloo.inc (scene-to-texture shader transitions, particles, HUD labels), orano.group innovation slider (technical HUD overlay, wireframe look, RGB-split glitch), en.manayerbamate.com (product reacts to scroll, tactile motion). Take techniques, never copy their code, assets or layout.

**Flow (14 scenes, length in screens of scroll).** Loader (ring photo on dark fabric, progress bar, "We'll start in a minute") -> 1 Catalog notebook [1.2] -> 2 Rhino: particles from all sides assemble the ring, 360 deg turn, dissolve [2.0] -> 3 Printer: particles queue into it [1.2] -> 4 Platform: ring grows top to bottom with ONE small sprue [1.2] -> 5 Tree: tweezers move the ring onto the tree [1.2] -> 6 Flask: rubber base from below, flask from above [1.2] -> 7 Foundry: tape bottom to top, investment poured to the top [1.5] -> 8 Vacuum: lid, investment boils, lid off [1.2] -> 9 Furnace: flask in, door closes, zoom inside, heating springs, flask red, X-Ray: tree turns to particles and evaporates, half of the main sprue runs down and evaporates, only the hollow outline stays, camera back out [2.5] -> 10 Casting: door opens, long tongs take the flask, flip, tongs vanish, metal vacuum cylinder from below, SVG pressure gauge in a corner for ~2 s (needle to full vacuum in ~1 s), camera up 50-70 deg, crucible pours [2.5] -> 11 Water: cylinder off, flask into a boiling water bucket, flask taken out empty, gold tree taken out [1.2] -> 12 Cut: tree sprue-down, ring cut off, raw ring spins 360 deg on scroll [1.2] -> 13 "Processing": diagonal right-to-left wipe with that word [0.8] -> 14 Final: polished ring on dark fabric, tilted 5-15 deg, endless horizontal auto-rotation, NO drag [1.0]. Wash/UV is skipped. Total ~20 screens; 14 progress dots.

**Rules.**
- Constant on all scenes: lightweight bloom + edge vignette blur (+ subtle chromatic aberration) in ONE low-res post pass. If fps drops, lower the effect resolution/quality, never accept low fps.
- Scroll-scrubbed animation; micro-motions (boil, sparks, final rotation) are time-based. Native page scroll, no hijack.
- Scene changes: short crossfade with a bloom flash; scene-to-texture shader transitions where cheap.
- The pressure gauge is redrawn as SVG; do not ship the author's third-party gauge photo. The catalog pages use procedurally drawn ring sketches.
- **Desktop only.** No mobile layout, no bottom sheet, no mobile quality tier, no touch/phone testing. A phone or tablet (touch-primary device, `(hover: none) and (pointer: coarse)`, or a mobile user agent) sees only a static full-screen message instead of the site: "This experience is built for desktop. Please open it on a computer." There is NO viewport-width threshold: any desktop browser window size loads the site. The gate runs before any heavy asset is requested (no 3D models, no WebGL init). The brief's "Responsive and accessibility" mobile rules are cancelled; keep `prefers-reduced-motion` and keyboard access.
- Turns of the ring are around the vertical (Y) axis.
- Stop for the author's review after every stage (screenshots + short report in Russian).
- Commits are authored by the user only; never add Co-Authored-By or any AI attribution. Work runs in short sessions of 1-2 scenes (see `docs/superpowers/plans/2026-10-05-ring-scrollytelling.md`): each session works on its own branch `sNN-<name>`; at the end commit, `git push -u origin <branch>`, report, and STOP. The author opens the pull request and merges it on GitHub himself; never merge, never push to `main` after the initial setup commit, and start the next session from an up-to-date `main`. Never deploy (Vercel or elsewhere) without asking.

## Delegation
- Plan and make hard design/architecture decisions in the main session.
- Delegate simple mechanical edits to `quick-worker`.
- Delegate implementation of approved plan steps to `implementer`.
- Delegate the final whole-branch review and hard debugging to `reviewer` (read-only, Opus).
- Run subagents in parallel when tasks are independent.
- If a subagent fails twice on a task, take it back and do it in the main session.

# "From CAD to Gold" scrollytelling — implementation plan

Spec = root `CLAUDE.md` ("Agreed decisions" override the original brief). Desktop only. Stack: Vite (vanilla JS) + three 0.186.1 + gsap 3.15.0 (ScrollTrigger). No other runtime deps.

## Global constraints (every task)
- 45+ fps at 1080p on the Radeon 740M; DPR cap 1.5; adaptive quality lowers the post-effect resolution first, then DPR. No transmission, no real refraction, no shadow maps, no heavy post.
- Native page scroll only (no scroll hijack). Animation scrubbed by scroll (`scrub: 1`); micro-motions (boil, sparks, final spin) are time-based.
- One persistent hero ring (never reloaded); `ring.glb` normalized on load (center bbox, target height, Y-up); the glb material is ignored.
- All user-visible text lives in `src/content.js`. Code, comments, UI, commits in English.
- Stage module contract: `export default { id, build(ctx) -> { group, timeline(stl, seg), update(dt, t, local), dispose() } }`. Only `to` tweens (or `fromTo` with `immediateRender:false`); no overlapping tweens on one property; no runtime changes of `transparent`/`side`/clipping; no new lights; budget <= 40 draw calls and <= 60k extra triangles per scene; a stage owns only its own files.
- Discrete state (visibility, material swaps, panel text, dots) is derived every frame from `tl.time()`, never from callbacks, so scrubbing backwards works.
- Verification via `playwright-cli` + `?debug` harness (`window.__app`: `whenReady`, `state`, `seek(id, frac)`, `frameStats`, `byStage`, `maxJump` < 40 px, `checkHandoffs` = [], `errors`, `gpu`). Real fps is measured in headed Chrome on this machine (Radeon 740M).
- Commits authored by the user only, no AI attribution. One branch per session, pushed at the end, the author opens the PR. No deploy.

## Architecture (short)
- Hero chain `scene > carrier > holder > anchor > spin > body > mesh`; props (tree, flask) ride `holder`/`carrier`. `hero.look` (color, roughness, metalness, opacity, emissive, envMapIntensity) is tweened between states `cad / resin / rawGold / polished`; `hero.params.fade` is a separate opacity multiplier.
- `src/poses.js`: frozen hand-off pose table; scene i tweens from `POSES[i]` to `POSES[i+1]`.
- Camera rig follows the hero; desktop `setViewOffset` puts the focus at ~59% of the width (the small text panel sits on the left).
- **Post pass (`src/core/postfx.js`)**: scene renders into one render target; bright-pass + separable blur at 1/4 resolution; ONE full-res composite shader adds bloom, edge-vignette blur (reusing the same low-res blur texture), subtle chromatic aberration and the transition effect. Tiers lower the blur resolution/taps.
- **Scene transitions**: the composite shader plays a short cover effect (bloom flash + noise/glitch + radial blur); the scene swap happens under its peak. Dual-scene render-to-texture only for 1-2 hero transitions, if the budget allows.
- **Particles (`src/lib/particles.js`)**: GPU `Points` + custom shader. Targets are sampled from the ring surface at load (area-weighted, ~24k points). Per-particle delay gives the "queue" effect. Reused for printer inflow, X-ray evaporation, steam/boil, sparks.
- **Desktop gate (`src/gate.js`)**: touch-primary or mobile-UA devices get a static message; nothing else loads.
- Final scene: no OrbitControls; `spin` auto-rotates around Y, ring tilted 5-15 deg, dark fabric (procedural twill texture).

## Sessions and branches
| Session | Branch | Tasks |
|---|---|---|
| 0 | `main` | Setup commit: brief, plan, agents, gitignore (pushed once to create `main`) |
| 1 | `s01-foundation` | T1-T5 |
| 2 | `s02-skeleton` | T6-T10 |
| 3 | `s03-catalog-rhino` | T11-T12 |
| 4 | `s04-printer-platform` | T13-T14 |
| 5 | `s05-tree-flask` | T15-T16 |
| 6 | `s06-foundry-vacuum` | T17-T18 |
| 7 | `s07-furnace` | T19 |
| 8 | `s08-casting` | T20 |
| 9 | `s09-water-cut` | T21-T22 |
| 10 | `s10-processing-final` | T23-T24 |
| 11 | `s11-polish` | T25-T28 |

Every session ends with: `npm run build` passes, no console errors, screenshots of the new scenes, ledger updated, commit, push of the session branch, short report in Russian, STOP.

## Tasks

### Task 1: Scaffold and desktop gate
Files: `package.json` (hand-written: three 0.186.1, gsap 3.15.0, vite ^8), `vite.config.js` (port 5173, HMR off when `VITE_NO_HMR`), `index.html`, `src/styles.css`, `src/gate.js`, `public/models/ring.glb`, `public/models/ring_light.glb` (copied from `ring-scrollytelling/public/models`), self-hosted OFL font in `public/fonts/`.
Done when: `npm i`, `npm run dev`, `npm run build` work; on a touch/mobile UA (emulated) only the gate message shows and no model is requested; on desktop of any width the app boots.
Verify: `curl -sI localhost:5173/models/ring.glb`; `playwright-cli open --device "Pixel 7"` shows the gate and `requests` has no `.glb`.

### Task 2: Core engine
Files: `src/core/{renderer,scene,rig,loop,quality,assets,debug}.js`.
Done when: renderer (NeutralToneMapping, alpha canvas), PMREM + RoomEnvironment, fixed light set (key, hemisphere, accent point at 0), rig with `setViewOffset` at 59%, `gsap.ticker` loop rendering only when dirty, `normalizeGeometry`, tier detection + adaptive quality, `?debug` overlay and `window.__app`.
Verify: `__app.state().heroScreen.x` is 0.59 +/- 0.03 at 1920x1080; `?slow=30` makes the adaptive step trigger within 5 s.

### Task 3: Post pass
Files: `src/core/postfx.js`.
Done when: bloom + edge-vignette blur + subtle chromatic aberration in the structure described above, tier-scaled; a `transition(amount)` uniform exists for Task 7.
Verify: screenshot on a dark and on a light background; frame time delta with/without the pass < 3 ms on the Radeon 740M (headed Chrome).

### Task 4: Hero ring and materials
Files: `src/hero.js`, `src/materials.js`.
Done when: hierarchy as in Architecture, 4 look states with `tweenLook`, follower material for clones, `printMaterial` with a clipping plane, blob shadow texture helper.
Verify: screenshots of the ring in each look state.

### Task 5: Config, content, poses, loader
Files: `src/config.js` (14 scenes with `vh` and `bg`), `src/content.js` (all copy for 14 scenes, loader text "We'll start in a minute", contacts), `src/poses.js`, loader UI (ring photo on dark fabric as light WebP ~100 KB in `public/img/`, progress bar), `src/main.js` bootstrap with `compileAsync` warm-up.
Done when: loader shows the photo and real byte progress, then reveals the scene; stage lengths sum to 19.9.
Verify: `node -e` sum of `vh`; loader screenshot at 0%, 60%, 100%.

### Task 6: Timeline, panel, dots, backgrounds
Files: `src/timeline.js`, `src/background.js`, `src/ui.js`, `index.html` markup.
Done when: master GSAP timeline + ScrollTrigger on `#track` (14 sections, `svh` heights), small dark-glass text panel on the left, 14 clickable dots + `n / 14` counter, CSS gradient backgrounds crossfaded by the timeline, `seek` and `goTo`.
Verify: seek every scene, `state().stage` matches; dot click scrolls to the scene; `checkHandoffs()` = [].

### Task 7: Scene transitions and stage registry
Files: `src/stages/index.js` (`import.meta.glob`, stub fallback), `src/stages/_stub.js`, `src/stages/_helpers.js`, transition driver in `src/timeline.js`.
Done when: every scene boundary plays the cover transition under which the group visibility swap happens; `?only=N` builds scene N for real and stubs the rest.
Verify: frame capture around a boundary shows flash peak then new scene, no pop-in visible outside the cover.

### Task 8: Particle library
Files: `src/lib/particles.js`, `src/lib/textures.js`.
Done when: ring-surface sampling, scatter-to-ring morph with per-particle delay, round soft points, `intensity` scaling by tier; demo hook through `__app`.
Verify: screenshots at morph 0, 0.5, 1; sampling time < 60 ms.

### Task 9: Final scene (scene 14), draft
Files: `src/stages/14-final.js`, `src/lib/fabric.js`.
Done when: polished ring on a procedural dark twill fabric, tilted 5-15 deg, endless horizontal auto-rotation (time-based), constant post effect, contacts in the panel, no drag.
Verify: screenshot; `state().spin` changes over time with no input.

### Task 10: Milestone 1 gate
Done when: full scroll run (wheel) from loader to final with stub scenes: no errors, no hero jumps (`maxJump` < 40 px), fps table per scene from headed Chrome, `npm run build` ok.

### Task 11: Scene 1 Catalog notebook
Files: `src/stages/01-catalog.js`, `src/props/notebook.js`, `src/lib/sketches.js`.
Beats: the notebook opens (cover, then spread), pages show procedurally drawn pencil-style ring sketches (canvas textures), ours is the rendered one and gets highlighted, then the cover transition leads to Rhino.
Done when: no external images; the hero ring is the highlighted catalog item.

### Task 12: Scene 2 Rhino and particles
Files: `src/stages/02-rhino.js`, `src/props/rhino-grid.js`, `src/stages/02-rhino.css`.
Beats: Rhino viewport look (grey gradient, grid with red/green axes, "Perspective" label, axes widget); particles from all sides assemble the ring; on scroll a fast 360 deg turn around Y; the ring dissolves into particles.

### Task 13: Scene 3 Printer
Files: `src/stages/03-printer.js`, `src/props/printer.js`.
Beats: stylized GEM3 MAX (white body, black panel with screen, translucent blue hood); particles fly in as a queue; chip "Sending to printer...".

### Task 14: Scene 4 Platform
Files: `src/stages/04-platform.js`.
Beats: build platform from above; the ring appears top to bottom (clipping-plane reveal, resin look) hanging on ONE small sprue, no supports.

### Task 15: Scene 5 Tree
Files: `src/stages/05-tree.js`, `src/props/tree.js`, `src/props/tweezers.js`.
Beats: tweezers lift the ring off the platform and place it on the tree (sprue, branches, small connectors; hero + 2-3 clones as one `InstancedMesh` of `ring_light`).

### Task 16: Scene 6 Flask
Files: `src/stages/06-flask.js`, `src/props/flask.js`.
Beats: rubber base rises from below, perforated steel flask lowers from above over the tree.

### Task 17: Scene 7 Foundry
Files: `src/stages/07-foundry.js`, `src/props/tape.js`, `src/props/pour.js`.
Beats: foundry background; tape wraps the flask bottom to top (draw-range trick); investment is poured and fills to the top.

### Task 18: Scene 8 Vacuum
Files: `src/stages/08-vacuum.js`, `src/props/vacuum-table.js`, `src/props/dome.js`.
Beats: flask on the vacuum table, lid/dome on, investment boils (instanced bubbles, surface wobble), boiling stops, lid off.

### Task 19: Scene 9 Furnace and X-Ray
Files: `src/stages/09-furnace.js`, `src/props/furnace.js`, `src/props/xray.js`.
Beats: flask into the furnace centre, door closes; camera zooms in through the door; heating springs glow, flask turns red; X-Ray: the tree turns to particles and evaporates, half of the main sprue runs down and evaporates, only the hollow outline stays; X-Ray off; camera back out.

### Task 20: Scene 10 Casting
Files: `src/stages/10-casting.js`, `src/props/tongs.js`, `src/props/vacuum-cylinder.js`, `src/props/crucible.js`, `src/props/gauge.js` (SVG).
Beats: door opens, long tongs take the flask, flip, zoom, tongs vanish; metal vacuum cylinder rises from below; SVG pressure gauge in a corner ~2 s, needle to full vacuum in ~1 s, then gone; camera tilts up 50-70 deg; crucible pours molten metal.

### Task 21: Scene 11 Water
Files: `src/stages/11-water.js`, `src/props/bucket.js`.
Beats: cylinder off; flask goes into a bucket of boiling water (instanced bubbles, steam sprites); the empty flask comes out, then the raw gold tree is taken out.

### Task 22: Scene 12 Cut
Files: `src/stages/12-cut.js`, `src/props/cutter.js`.
Beats: tree set sprue-down, cutter snaps the ring off, focus on the ring; raw (matte) ring spins 360 deg on scroll.

### Task 23: Scene 13 "Processing" wipe
Files: `src/stages/13-processing.js`, `src/stages/13-processing.css`.
Beats: diagonal right-to-left wipe with the word "Processing"; under it the ring look goes rawGold -> polished with a highlight sweep (environment rotation).

### Task 24: Scene 14 final art direction
Files: `src/stages/14-final.js` (polish).
Beats: final render look: fabric, vignette bloom/blur, tilt, rotation speed, contact block; tune by eye with the author.

### Task 25: Performance pass
Real-GPU table per scene (avg fps >= 45, p10 >= 40); tune tiers and particle counts.

### Task 26: Accessibility and reduced motion
sr-only copy per scene, dot `aria-label`/`aria-current`, keyboard navigation, `prefers-reduced-motion` (no particles/auto-rotate, instant transitions), no-WebGL fallback article.

### Task 27: Final review
Process-fact checklist (resin burns out; flask flipped after the furnace; no gems; the ring is always in focus), all copy only in `content.js`, whole-branch review by `reviewer` (Opus).

### Task 28: Build and meta
`npm run build`, `dist` size check (initial download < 10 MB), `npm run preview` smoke test, meta/OG tags, favicon. No deploy.

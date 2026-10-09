# Ring site v2 design: "Blueprint to fire"

Date: 2026-10-05. Status: draft for the author's review.
Replaces the vanilla-JS build and the 14-scene flow (old plan: `docs/superpowers/plans/2026-10-05-ring-scrollytelling.md`, to be archived).

## 1. Purpose

The author is a jewelry designer and caster. When someone asks "what do you do in jewelry?", he opens this site on his laptop, scrolls, and talks over it. The site shows one gold signet ring going from CAD model to the polished piece through lost-wax (resin burnout) casting.

Consequences:
- **The person scrolling sets the pace.** Every act must hold a good-looking frame when scrolling stops. Scroll-scrubbed motion carries the story; only small ambient motion (steam, sparks, boil, final rotation) runs on time.
- **Minimal text.** The author narrates; on-screen copy is short HUD-style captions.
- **Quality bar:** Awwwards-level art direction and smoothness ("site of the year" as the aspiration, Site of the Day quality as the realistic target).
- **No sound** (it would compete with the author's voice).

## 2. Hard constraints

- **Desktop only.** Touch-primary devices (`(hover: none) and (pointer: coarse)` or a mobile user agent) get a static full-screen message: "This experience is built for desktop. Please open it on a computer." No viewport-width threshold. The gate runs before React, three.js or any model is requested.
- **Performance:** >= 45 fps (60 target) at 1080p on the author's laptop (AMD Radeon 740M iGPU, 16 GB RAM). Never trade fps for effects: lower effect quality first.
- **Native scroll**, no hijacking. Keyboard scrolling must work. `prefers-reduced-motion`: shorter transitions, fewer particles, slower ambient motion.
- **Process facts must stay correct:** printed resin (not wax) burns out in the furnace; tape is wrapped around the perforated flask before the investment is poured (author: mandatory); investment is de-aired under vacuum; the flask is flipped after the furnace; vacuum casting; the gold rests 5-15 min before quenching in water; the investment dissolves in water and the raw tree comes out. No gemstones. Act 6/7 detail (author 2026-10-09): the flask goes into a blue plastic bucket of water **on its side**; the water boils only for the first moments, turns **white**, and the flask lies 10 minutes in the calm white water; it comes out clean and the tree comes out of its **funnel end**; the ring is pinched off the tree and goes into a jar of acid for 10 minutes; then processing and polishing. **Cast metal is strongly matte and rough** until polishing (never shiny before the polish line); tarnish only as one small patch on the sprue. Tongs and the ultrasonic cleaner are real but not shown (author: "others don't need to know").
- **Metal: yellow gold** (author's decision after Session 1, replaces "red gold" from the original brief).
- **Never invent facts** in copy (dimensions only from the model data below; contacts are placeholders until the author provides them).
- Print facts from the author (2026-10-06): the real print is angled on many supports (the animation's single upside-down sprue is a stylization, do not claim it in copy); a print usually takes about 4 hours.
- Model facts usable in HUD copy: ring size 20.5 = inner diameter 20.5 mm, EU 64 (circumference pi x 20.5 = 64.4 mm) (from the author; act 1 spec list starts with "Ring size 20.5 (EU 64)"); bounding box 2.35 x 2.48 x 1.03 cm (23.5 x 24.8 x 10.3 mm); max deviation of the optimized model from the original < 0.07 mm; honeycomb pattern inside the shank.

## 3. Story: seven acts (about 17 screens of scroll)

The camera stays on the ring. The world around it and the ring's own material change. The world **heats up** from a cold blueprint to gold.

| Act | Length (screens) | World / color | What happens |
|---|---|---|---|
| 0 Intro | loader + 0.5 | deep blueprint navy, grid | Loader: a thin dimension line draws the ring height "24.8 mm"; the line length is the load progress. Loader copy: "We'll start in a minute". Then the title draws in (stroke, then fill). |
| 1 Idea | 2.0 | blueprint: navy + white lines | The ring draws itself as edge lines; dimension call-outs and HUD labels decode in; the ring turns 360 deg around Y with scroll. Lines fill into surfaces, then the model breaks into points that stream down. |
| 2 Print | 1.5 | navy + green resin glow | Only the build plate descends (no full printer). The ring grows upside down, layer by layer, on one sprue; the growth front glows. Translucent pale-green resin. The ring flips upright at the end. |
| 3 Mold | 2.5 | cool blue-grey | The ring lands on the tree, 2-3 more rings pop in (`ring_light.glb`). Rubber base from below, perforated steel flask from above. **Tape wraps the flask bottom to top.** Investment pours to the top; the front half of the flask is semi-transparent so the rings stay visible. Short vacuum beat: the investment surface boils. Tape comes off. |
| 4 Fire | 2.5 | black to dark red to orange | The camera returns to a level view. **Twelve heating coils** (3 per side of the frame: left, right, top, bottom) fade in along the walls of a tunnel in perspective, the farther rows smaller. They heat from cold steel to orange; the flask reddens with them and the frame gets a heat haze (author 2026-10-06: coils instead of a furnace model). **X-ray (only here):** the flask becomes a cyan fresnel shell, the resin tree burns away from the top down and its points flow down the trunk and **out through the funnel** (author 2026-10-06), leaving a **glowing outline of the hollow cavity**. X-ray turns off. The flask flips 180 deg (funnel up). |
| 5 Gold | 2.5 | first warm full-frame color | Still X-ray. SVG vacuum gauge in a corner, needle drops to full vacuum. Molten gold pours in from the top and **fills the cavity** (sprue first, then the ring) with a moving meniscus; color cools from white-orange to gold; bloom flash when full. Timer chip "00:00 -> 10:00" (rest). |
| 6 Water | 2.5 | neutral, water and steam | A blue plastic bucket rises into a side, slightly high view. The flask turns 90 deg onto its side (funnel to the right) and goes down into the water. Short boil and steam, the water turns milky white. Calm white water, timer chip "00:00 -> 10:00". The flask rises out on its own, clean (no investment left), milky drips fall from it (third particle moment). The raw tree slides out of the funnel end, moves to the foreground and stands upright (funnel up) while the flask and bucket recede and dissolve. Raw metal: strongly matte and rough, one small tarnish patch on the sprue. |
| 7 Birth | 3.0 incl. final | warm off-black studio | The ring is pinched off the standing tree, falls (short, a little spin) into a jar of transparent pale-green acid; timer "00:00 -> 10:00". The ring comes out to the frame center, a line labelled "processing and polishing" passes and turns matte into mirror polish. **Final:** polished ring tilted 5-15 deg, endless slow Y rotation (no drag), soft reflection below, name, promo block and contact links (placeholders until the author writes them last). |

Removed from the old flow: catalog notebook, full printer, tweezers, tongs, ultrasonic cleaner, separate "Processing" wipe. The water bucket is back (author 2026-10-09). Vacuum and gauge survive as short beats inside acts 3 and 5.

Reusable lengths live in one config (`ACTS` with screen lengths); total is tuned by eye later.

## 4. Visual language

Design read (design-taste-frontend): desktop scrollytelling portfolio of a jewelry designer, shown live to listeners, technical HUD language that heats into gold. Dials: variance 7, motion 8, density 3.

- **Theme:** one dark theme for the whole site. Base is a cold blueprint navy, never pure black.
- **UI color:** monochrome white and blue-grey. **One accent: gold, and it is earned**: no gold in the UI before act 5. Resin green and furnace heat are scene light, not UI accents.
- **Heat as one mechanism:** a single "frame temperature" uniform in the post pass grades the whole image from cold to hot along the scroll, instead of separate per-act backgrounds.
- **Type:** one sans display + one mono for HUD. Candidates shown live in the first build session (for example Geist + Geist Mono, Space Grotesk + JetBrains Mono); no serif, no Inter. Self-hosted, `font-display: swap`.
- **Layout:** no glass panel. Copy sits on the scene in a left column over a soft dark scrim. Focus object at about 58% of the width. Right edge: a thin vertical scale with one tick per act, clickable, keyboard reachable.
- **Post-processing, one pass on every screen:** bloom (half resolution), film grain, subtle chromatic aberration, edge blur + vignette, temperature grade. Act 4 adds heat haze inside the same pass.
- **Banned (design-taste-frontend):** custom cursor, "scroll" cue, em-dashes in site copy, decorative dots, section-number eyebrows.
- **Signature technique: particles.** One particle system appears in three key moments (CAD dissolves into points, resin burns out in X-ray, investment dissolves in water) and ties the story together.

## 5. Effects map and library sources

React Bits and Magic UI are used as **technique sources**: their React code is copied and adapted (React Bits license: MIT + Commons Clause, use inside a website is allowed; Magic UI: MIT). Rules:
- Only GSAP-based or dependency-free components are used directly. Motion (`motion/react`) is not added: one animation engine only.
- Components that create their own WebGL context (ogl / three) are **never mounted as-is**; their shaders are ported into the single R3F canvas.
- Magic UI's shadcn install flow is not used; ideas are reimplemented with GSAP.

| Where | Effect | Source |
|---|---|---|
| Loader | Dimension line draw, percent shuffle | SVG + GSAP; React Bits `Shuffle` |
| Title, final heading | Stroke-then-fill title; gold showing through letters | React Bits `StrokeText`, `MaskedHeading` |
| Act titles | Split reveal | React Bits `SplitText` (GSAP SplitText) |
| HUD labels | Decode / scramble in | React Bits `ScrambledText` (GSAP ScrambleText) |
| Numbers (dimensions, temperature, timer) | Ticker | Magic UI `NumberTicker` idea, GSAP |
| "Sending to printer" chip | Typing + light running along the border | React Bits `TextType`; Magic UI `BorderBeam` idea |
| Act 1 | Edge-line draw, infinite grid, dimension lines, points dissolve | Custom shader on `EdgesGeometry`; drei `Grid`, `Line`; `MeshSurfaceSampler` |
| Act 2 | Layer growth with glowing front; resin rim light | Custom ring material uniforms |
| Act 3 | Tape unwrap, investment level, vacuum bubbles | Shader reveal on a cylinder; `InstancedMesh` |
| Act 4 | Heating coils, molten heat background, heat haze, X-ray shell, burnout particles | Coils: `TubeGeometry` helices; background: full-screen shader in the spirit of React Bits `MoltenMetal`; haze inside the lens effect (no extra pass); fresnel shell shader |
| Act 5 | Cavity fill with meniscus, cooling color, gauge | Fill-level shader; SVG + GSAP |
| Act 6 | Bucket, boiling/milky water surface, steam sprites, milky drip particles, raw matte tree | Lathe geometry; surface shader (`boil`, `milk`); instanced billboards; points; `TreeShapes` with a raw-gold material |
| Act 7 | Acid jar, polish sweep, environment reflections, contact links | Fresnel/alpha jar (no transmission); drei `Environment` with Lightformers rendered once; React Bits `Magnet` |

## 6. Architecture

**Stack:** Vite + React + TypeScript; `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`; `gsap` + `@gsap/react` (ScrollTrigger, SplitText, ScrambleText); `lenis`; Tailwind v4 via `@tailwindcss/vite`; Vitest for unit tests. Exact versions are pinned in the plan after `npm view`.

**Boot:**
1. `index.html` loads a tiny `gate` script. Touch device -> static message, stop. Desktop -> dynamic import of the app chunk.
2. The app mounts the loader, fetches models and fonts, then **pre-compiles every act's shaders** (`gl.compile` with all acts mounted) and uploads textures before the loader hides. No shader compiles happen during scroll.

**Runtime units (each with one job):**
- `story` store: a plain mutable object holding scroll-driven values (act progress, uniforms, camera targets). Written by GSAP, read in `useFrame`. **No React state changes during scroll.**
- `ScrollDirector`: Lenis + ScrollTrigger + one master GSAP timeline scrubbed over a tall track element; each act registers its own labeled segment.
- `Stage`: the single fixed full-screen `<Canvas>`; camera rig with view offset for the 58% focus position.
- `HeroRing`: the one persistent ring mesh, loaded once and auto-normalized (center bbox, scale to target height, keep Y up). One custom material with uniforms covering every state: CAD lines, resin, void outline, molten fill, raw gold, polished gold.
- `Particles`: one points system whose targets morph between sampled shapes.
- `PostFX`: one EffectComposer with merged effects and the temperature grade.
- `acts/Act0Intro ... Act7Birth`: each owns its props, its timeline segment and its HUD copy. Outside its scroll window an act is hidden (no draw calls). Acts do not import each other.
- `hud/*`: DOM overlay components (titles, labels, chips, gauge, act scale), animated by GSAP through refs.
- `content.ts`: all user-visible text.
- `quality`: drei `PerformanceMonitor` driving steps: DPR 1.5 -> 1.25 -> 1.0, then particle count. Post-processing settings (MSAA, bloom) stay constant: changing them rebuilds the composer and recompiles shaders mid-scroll.

**Assets:** `ring.glb` (100k tris) for the hero only; `ring_light.glb` (40k) for clones. Initial download < 10 MB. Gzipped JS estimated at 400-450 KB (to verify at build).

**Errors:** no WebGL or lost context -> clean static fallback screen; asset load failure -> loader error state with retry.

## 7. Verification

- Unit tests (Vitest) for pure logic: device gate, act windows / timeline mapping, quality stepping, model normalization math.
- Per act: screenshots at fixed scroll positions through Playwright MCP, reviewed by the author before the next act.
- **FPS measured on the author's laptop** (the real Radeon 740M), with a debug overlay (`?debug`), scrolling through every act. Pass: >= 45 fps average and no frame spikes from shader compiles.
- Final whole-branch review by the `reviewer` agent; `web-design-guidelines` audit before release.

## 8. Workflow

- Superpowers process: spec -> plan -> one short session per 1-2 acts, each on its own branch `sNN-<name>`, committed, pushed with `git push -u origin <branch>`, then stop for review. The author opens and merges PRs; never push to `main`, never merge, never deploy without asking. No AI attribution anywhere.
- Session 00 (`s00-restart`): archive the old plan, delete the vanilla `src/`, rewrite `CLAUDE.md` for the v2 decisions, scaffold the new stack, commit `.mcp.json`, `.gitignore`, `.vercelignore`, and the `magic-ui` project skill.
- Browser checks use Playwright MCP, not `playwright-cli`.

## 9. Out of scope

Mobile/tablet layouts, sound, custom cursor, drag-to-rotate finale, photo cards from `assets/reference/`, CMS, analytics, i18n.

## 10. Act 6 Water: design (s06, approved by the author 2026-10-09)

**Beats** (2.5 screens, act id `water` between `gold` and `birth`, frame temperature 0.45, chapter name "Water"):
1. Act 5 copy and rest chip leave (`GOLD_BEATS.copyOut` moves to the water start). The camera reframes to a side, slightly high view; the blue bucket rises in from below, seen whole.
2. The flask turns 90 deg onto its side (funnel to the right, away from the copy column) and goes down into the water.
3. Short boil with steam (a few scroll moments); the water turns milky white fast.
4. Calm white water, faint steam fading; rest chip "00:00 -> 10:00".
5. The flask rises out on its own, still on its side and clean: no investment, **no gold glint through the holes** (cast metal is matte). Milky drip particles fall from it.
6. The raw tree slides out of the funnel end along the flask axis, then moves to the foreground and stands upright (funnel up, rings hanging) while the flask and bucket recede and dissolve (screen-door, like the X-ray).
7. Hold: the raw tree centered, slowly turning with scroll around Y. Act 7 continues from here.

**Copy (draft for the author):** heading "Then it meets the water"; caption "The flask goes into a bucket of water on its side. The water boils for a moment and turns white as the investment breaks down. Ten minutes later the flask comes out clean and the gold tree slides out of it."; steps Water / Rest / Tree out.

**Architecture:**
- `story.flask` gains `dip` (into and out of the bucket), `wash` (investment gone), `away` (flask recedes and dissolves); `flip` continues 1 -> 1.5 (on its side). One pure flask-pose function is shared by `MoldScene` (the flask owner) and the raw tree, so the tree inside the flask matches it exactly.
- `src/acts/water/`: `WaterScene` (timeline registration, act window), `Bucket` (blue plastic lathe, screen-door fade), `WaterSurface` (opaque disk; `boil`, `milk` uniforms; no transmission), `Steam` (about 80 soft billboards; amount scroll-driven, drift on time), `Drips` (milky points), `RawTree` (`TreeShapes` + raw-gold material: roughness about 0.85, slightly duller than polished; one small tarnish patch on the trunk only; pose from a pure, tested function: in the flask frame, slide out funnel first, blend to the upright foreground pose), `WaterHud` (copy column, step list, shared `RestChip`).
- Camera: two targets (bucket view, foreground tree).
- Performance: everything compiles in the loader; the raw tree costs the same as the Act 5 gold fill, which is hidden by then; steam and drips are cheap.
- Verification: Vitest for act windows, flask and tree poses, and the act timeline restoring state on scrub-back; Playwright look pass at 1920x1080 and 1536x730; fps with `?debug`.

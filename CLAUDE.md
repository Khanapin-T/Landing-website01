# Project: "From CAD to Gold" v2 ("Blueprint to fire")

Desktop-only scrollytelling site: one gold signet ring goes from CAD model to polished piece through resin-burnout casting. The author (jewelry designer and caster) opens it on his laptop and talks over it while scrolling. Site language: **English**.

**Source of truth:** `docs/superpowers/specs/2026-10-05-ring-site-v2-design.md` (story, visual language, effects map, architecture). The plan lives in `docs/superpowers/plans/`. If this file and the spec disagree, the spec wins; if the author says otherwise in chat, the author wins.

`ring-scrollytelling/` (git-ignored, local only) holds the author's original inputs: `BRIEF-v1-superseded.md` and `PROMPT.md` are the OLD v1 brief and are superseded, do not follow them. Only `ring-scrollytelling/assets/reference/` (photos) and the source models there are still useful.

## How to talk to the author
- Chat in **Russian**, short and direct. Code, comments, UI text, commit messages, docs: **English**.
- Rate ideas honestly (x/10) when asked. Say clearly when unsure. Do not guess hardware/process facts: ask.
- Never invent facts in site copy (stats, prices, awards, dimensions not listed below). Contacts stay placeholders until the author provides them.

## Stack
Vite + React + TypeScript; three + @react-three/fiber + @react-three/drei + @react-three/postprocessing; GSAP (+ @gsap/react, ScrollTrigger, SplitText, ScrambleText); Lenis; Tailwind v4 (`@tailwindcss/vite`); Vitest. No Motion (`motion/react`), no shadcn, no second animation engine.
- React Bits / Magic UI are **technique sources**: copy and adapt GSAP-based or dependency-free components; port shaders of ogl/three components into the single R3F canvas. Never mount a component that creates its own WebGL context.
- Ask before adding any dependency not listed here.

## Author's machine and performance budget
- Windows 11 (PowerShell), AMD Radeon 740M integrated GPU, 16 GB RAM. This is also the machine Claude works on, so FPS is measured on the real target GPU.
- >= 45 fps (60 target) at 1080p. Never trade fps for effects: step down DPR (1.5 -> 1.25 -> 1.0), then particle count. Never change post-processing settings at runtime (it rebuilds the composer and recompiles shaders).
- No React state updates during scroll (scroll values live in a mutable store read in `useFrame`). Pre-compile all shaders during the loader. One canvas, one post-processing pass. No transmission/refraction materials, no large shadow maps.
- Initial download < 10 MB.

## Assets
- `public/models/ring.glb`: hero ring, 100k tris, 3 MB, exported by the author from Rhino and optimized (max deviation < 0.07 mm). `public/models/ring_light.glb`: same ring, 40k tris, for clones. One mesh, positions + normals only, materials defined in code.
  - Y up, 1 unit = 1 cm, bounding box 2.35 x 2.48 x 1.03 cm. Finger-hole axis = Z, signet plate on top (+Y), honeycomb pattern inside the shank, four stepped bands on both sides of the plate.
  - **Replacement contract:** auto-normalize on load (center bbox, scale to target height, keep Y up) so a re-exported file needs no code change. Large Rhino exports must be reduced first (<= 100k tris, <= 5 MB, e.g. `npx @gltf-transform/cli`).
- `public/fonts/`: Archivo (variable, width + weight axes; headings at `font-stretch: 125%`) and IBM Plex Mono 400/500 for the HUD. Chosen by the author 2026-10-05. OFL licenses next to the files.
- Reference photos in `ring-scrollytelling/assets/reference/` are for modeling/mood only. **Never ship them.**

## Process facts (must stay correct)
Printed resin (not wax) burns out in the furnace. Tape is wrapped around the perforated flask before investment is poured (author: mandatory on screen). Investment is de-aired under vacuum. The flask is flipped after the furnace. Vacuum casting. Gold rests 5-15 min, then the flask is quenched in water, the investment dissolves, the raw tree comes out. The metal is **yellow gold**. No gemstones.

## Rules
- **Desktop only.** Touch-primary devices (`(hover: none) and (pointer: coarse)` or mobile UA) get a static message: "This experience is built for desktop. Please open it on a computer." No width threshold. The gate runs before React/three/models load.
- Native scroll, no hijack; keyboard works; honor `prefers-reduced-motion`.
- No sound, no custom cursor, no "scroll" cue, no em-dashes in site copy, no drag-to-rotate in the finale.
- Turns of the ring are around the vertical (Y) axis.

## Tools
- Process: `superpowers` skills (brainstorming, plans, TDD, debugging, review, verification).
- Design: project skills `design-taste-frontend` (leads), `frontend-design`, `web-design-guidelines` (final audit), `magic-ui` (reference for Magic UI components; its shadcn install flow is not used here).
- Browser checks: **Playwright MCP** (project `.mcp.json`), not the global `playwright-cli` skill.
- Library docs: **Context7 MCP** (project `.mcp.json`). Before writing code against drei, @react-three/postprocessing, postprocessing, R3F, Lenis, GSAP or Tailwind v4 APIs, look up the current docs for the pinned version instead of relying on memory. Subagents must do the same.
- GitHub: `gh` CLI is installed and logged in (account Khanapin-T). If `gh` is not on PATH in an old shell, call `"C:\Program Files\GitHub CLI\gh.exe"`.

## Workflow
- Short sessions of 1-2 acts. Each session on its own branch `sNN-<name>`, started from an up-to-date `main`. At the end: commit, `git push -u origin <branch>`, report in Russian with screenshots, STOP.
- The author opens and merges PRs himself. Never merge, never push to `main`, never deploy (Vercel: project `from-cad-to-gold`) without asking.
- Commits are authored by the user only. **No AI attribution anywhere** (no Co-Authored-By, no "generated with").
- Stop dev servers by their own PID, never `taskkill /IM node.exe`.

## Delegation
- Plan and make hard design/architecture decisions in the main session.
- New code (plan tasks: config, timelines, components, shaders) -> `implementer` on Sonnet, or with the Opus model override for shaders and hard scene work (author 2026-10-10). Haiku (`quick-worker`) only for truly simple edits and small bug fixes. Final whole-branch review and hard debugging -> `reviewer` (Opus, read-only).
- Run subagents in parallel when tasks are independent. If a subagent fails twice, take the task back.

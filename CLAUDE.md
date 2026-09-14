# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Human Atlas: a single-page 3D anatomy explorer (React 19 + Three.js + shadcn/ui, built with Vite). It renders the BodyParts3D 4.0 adult male reference (2,234 meshes, 15 systems, 3,432 named concepts) from prebuilt binary geometry in `public/models/`. Educational only; not a clinical tool.

## Commands

Requires Node.js >= 22.13 (the validation scripts import `.ts` files directly and rely on Node's built-in type stripping).

```sh
npm ci
npm run dev                              # Vite dev server on http://localhost:3016
npm run build                            # static site -> dist/
npm run check                            # tsc --noEmit
node scripts/validate-atlas.mjs          # verifies atlas.json against the .bin buffers (counts, indices, triangles)
node scripts/validate-interactions.mjs   # exploded-layout packing, WebMCP tool contracts, PointerTap
```

There is no test runner; the two `validate-*.mjs` scripts are the test suite and use `node:assert`. Run `npm run check` plus both scripts before considering a change done. `oxlint`/`oxfmt` are installed but have no config and no npm script.

Deploy is Vercel via `vercel.json` (Vite framework, `npm ci`, `npm run build`, `dist`). Any static host works.

## Layout quirks

- Vite `root` is `web/` (entry `web/index.html` -> `web/main.tsx`), but almost all code lives in `app/`. `publicDir` is the repo-level `public/`, and `@/` aliases the repo root (so `@/components/ui/...`).
- `app/` is NOT a Next.js app directory despite the name; `main.tsx` mounts `app/page.tsx` with `createRoot`. tsconfig still lists Next-style includes and `vinext` types; ignore them.
- Source files in `app/` and `scripts/` are written in a dense, minimal-whitespace style (one-space indent, long lines). Match it when editing rather than reformatting.
- `components/ui/` is stock shadcn (Base UI flavour). Only a handful are used (`button`, `badge`, `slider`, `switch`, `sheet`, `combobox`).

## Architecture

**Data model** (`app/anatomy.ts`): `SYSTEMS` is the ordered list of 15 system ids with display color and description; the order matters because the scene uses a system's index for the radial explode angle. `Atlas` is the shape of `public/models/atlas.json`: `parts` (one per source mesh, with byte offsets into a chunk `.bin`), `concepts` (FMA concept -> list of part ids; a concept may span many meshes), and `chunks` (`.bin` plus optional `.gz`). `DEFAULT_VISIBLE` omits `integumentary` (skin is rendered translucent and is excluded from picking when any solid part is visible).

**State** (`app/page.tsx`): one `SceneState` object owned by `Home` (`explode` 0..1, `visible` systems, `selected` part ids, `isolate`, `view`, `rotate`, `reset` counter). All UI panels mutate it with `setState`; the scene reads it via a ref every frame. `reset` is a monotonically increasing counter used to force camera refits. Search matches concept names/ids and selection is stored as the concept's `elements` (part ids).

**Renderer** (`app/scene.tsx`): a single `useEffect` keyed on `atlas` that builds the whole Three.js scene imperatively and tears it down on cleanup. Key mechanics:
- Geometry for each system is merged into one draw call per system per chunk. Per-part translation + visibility live in a float `DataTexture` (`partTexture`, RGBA = xyz offset + visible flag) and selection in a second texture; a `partIndex` vertex attribute indexes them in a patched `MeshStandardMaterial` shader (`onBeforeCompile`). Changing visibility/selection/explode only rewrites those textures, never the geometry.
- Unmerged per-part `pickers` meshes (not added to the scene) are used for raycast picking, with a box pre-test.
- Explode is a two-phase animation: below 0.45 parts fan radially by system; above it they lerp into a packed 2D grid from `createExplosionLayout` (`app/explosion-layout.ts`), which lays out only visible parts and is recomputed when the visible set or aspect changes. Above 0.75 dot markers appear and 2D screen-space `targets` enable hover tooltips and tolerant tapping; above 0.8 orbit becomes pan.
- Rendering is dirty-flagged: the RAF loop only calls `renderer.render` when controls moved or state changed.
- Camera fitting (`fit` and the isolate branch) hardcodes reserved UI space (panel widths, header/sheet heights, 768px mobile breakpoint, landscape <=600px). If you change panel sizes in `app/globals.css`, adjust these numbers too.
- Chunks are fetched 3 at a time; `app/model-download.ts` handles hosts that serve `.gz` either raw or with Content-Encoding.

**Input** (`app/pointer-tap.ts`): `PointerTap` distinguishes a tap from drag/pinch/cancel so orbiting never selects. Thresholds differ for touch vs mouse.

**WebMCP** (`app/agent-tools.ts`): optionally registers `find_anatomy` and `inspect_anatomical_structure` on `document.modelContext` if the browser provides it. Pure `atlasTools()` is what the validation script exercises; keep it side-effect free apart from the injected `inspect` callback.

## Geometry pipeline (optional, offline)

Prebuilt output is committed. To regenerate: download and extract the NASA "ISS complete 2011" package into `work/iss/` (see `docs/iss-explorer-plan.md`), then `python scripts/convert-station.py` (needs numpy; reads `scripts/station.json` for names, systems, and split overrides) -> `node scripts/optimize-anatomy.mjs` (meshoptimizer, 0.2% relative error, refuses to run twice on the same manifest) -> `node scripts/compress-models.mjs` (writes `.gz` next to each `.bin` and records them in `atlas.json`). `validate-atlas.mjs` takes its expected counts from the manifest's `scene.objects` list and cross-checks the `.lws` file when `work/iss/` is present.

## Licensing

App code is MIT. The anatomy data is CC BY 4.0 (BodyParts3D); keep `public/ATTRIBUTION.md` intact and accurate when touching the models or credits.

## ISS Explorer plan

`docs/iss-explorer-plan.md` plans a fork of this viewer for NASA's ISS model. Run `/iss-plan` to see the phase commands (`/iss-1-convert` through `/iss-5-textures`) and which model to use for each.

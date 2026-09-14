---
name: iss-6-polish
description: Phase 6. Fix blown-out whites, panel contrast, exploded-grid overflow, and small leftovers found in the 2026-09-14 review.
disable-model-invocation: true
model: claude-opus-5
---

Recommended: Opus 5 (`claude-opus-5`), medium effort. Runs in the station fork. Phases 1-4 are complete and all checks pass; this is tuning and small fixes, not new architecture. Do the steps in order, screenshot after each visual step with the Playwright plugin at 1440x900 and 390x844, and keep screenshots out of the repo (scratchpad only).

Findings this phase fixes (review of 2026-09-14, dev server at 1440x900 and 390x844):

- Model whites clip. `app/scene.tsx` uses one sun at intensity 3.4 with ACES exposure 1.12, and the two palest systems (`us-modules` `#ece7da`, `truss` `#c3cad3` in `app/anatomy.ts`) render as flat pure white with no shading. Isolating US modules in the exploded view is a wall of white discs.
- UI panels are the Human Atlas light theme (`#f3f4f4` panels, `white` hover, `#ffffff` cards) sitting on a `#05070c` space background. The contrast between panel and stage is harsh, and the pale system dots (`.system-dot`) are nearly invisible on the white panel. Grey copy on the black stage (`#7c8793` hints, the "382 modeled pieces" line) is below 4.5:1.
- Exploded grid overflows the chrome on desktop. At 100% explode and 1440x900 the last rows sit behind the bottom dock and the "STATION INVENTORY" caption, and the right column runs under the camera rail. `validate-interactions.mjs` checks packing, not screen fit, so it passes.
- Console warning on load: "Base UI: Slider `max` must be greater than `min`". The assembly slider in `app/page.tsx` has `max={timelineDays}`, which is 0 until the atlas loads.
- `package.json` `name` is still `anatomy-studio`.
- `three` and `@types/three` are at 0.159; latest is 0.186. The shader patch in `onBeforeCompile` and the `DataTexture` setup are the version-sensitive parts.

Steps:

1. **Lighting and material.** In `app/scene.tsx` lower the sun to roughly 2.0-2.4, add a dim `HemisphereLight` (sky slightly blue, ground near black, intensity about 0.25) so shadowed faces still read, raise `roughness` toward 0.7, and keep ACES. In `app/anatomy.ts` darken `us-modules` to about `#d9d4c6` and `truss` to about `#aab3bd` so both stay "white" against the palette but shade. Done when a screenshot of the default view and of US-modules-only at 100% explode shows visible cylinder shading on every module and under 2% of stage pixels at full white (check with a small Node script over the PNG, or by eye if that is quicker). Solar arrays must still read dark blue-black.
2. **Panel theme.** Pick one direction and apply it in `app/globals.css`: either (a) dark glass panels (background about `#12161dd9`, border `#ffffff14`, text `#e6e9ee`, muted `#9aa4b0`) so the UI sits in the scene, or (b) keep light panels but drop them to about `#e9ecefe6` with a soft outer glow. Default to (a); it removes the white-on-black problem rather than softening it. Update the shadcn tokens in `:root` so `button`, `badge`, `slider`, `switch`, `sheet`, and `combobox` follow. Give `.system-dot` a 1px `#ffffff30` ring or a minimum size of 7px so pale colors stay visible. Raise stage-text greys so every string on the black stage passes 4.5:1 (check `#7c8793`, `#87929d`, `#75818d`, `#74818e`, `#73808c`). Done when the default, exploded, selected-part sheet, search, and about views look consistent at both sizes and no panel is pure white.
3. **Exploded framing.** In `scene.tsx` `fit()` and the `reservedHeight`/side-reserve numbers (desktop 270 tall, 340 wide; mobile 410 tall, 40 wide), account for the dock, caption, and the right camera rail at 100% explode so the grid's last row clears the dock and its last column clears the rail. Adjust the caption offsets at the end of `globals.css` to match, as `CLAUDE.md` notes. Done when at 1440x900, 1280x720, and 390x844 no exploded part is behind any panel with all systems visible.
4. **Slider guard.** In `app/page.tsx` give the assembly slider `max={Math.max(1,timelineDays)}` (or render it only when the atlas is loaded) so the Base UI warning stops. Done when the console is clean on load.
5. **Housekeeping.** Rename `package.json` `name` to `station-atlas`. Add `.playwright-mcp/` and `*.png` at the repo root to `.gitignore`. Leave `dist/` alone (already ignored).
6. **Optional: three upgrade.** In a separate commit, bump `three` and `@types/three` to the latest 0.18x, run `npm run check`, and confirm the patched shader still compiles (watch for the `onBeforeCompile` chunk names and `DataTexture` `needsUpdate` behaviour). Revert the commit if picking or the explode textures break and note it in the commit message.
7. Run `npm run check`, `node scripts/validate-atlas.mjs`, `node scripts/validate-interactions.mjs`, `npm run build`, then commit with one commit per step 1-5 and a separate one for step 6.

Out of scope: the model itself. The 2011 scene cannot show Prichal, Bishop, iROSA, or Axiom, and the about panel, README, and ATTRIBUTION already say so. Adding those would be new geometry, not polish. Phase 5 (textures) remains optional and separate.

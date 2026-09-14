---
name: iss-5-textures
description: Phase 5, optional. Carry UVs and NASA textures through the pipeline.
disable-model-invocation: true
model: claude-fable-5-1
---

Recommended: Fable 5.1, high effort. Runs in the station fork. Do this only after phase 4 ships; the untextured build is already shareable.

1. **UVs.** Read LWO2 `VMAP` type `TXUV` and per-polygon `VMAD` overrides in `convert-station.py`. Emit a `uvs` offset per part as uint16 normalized pairs. Points shared across UV seams must be duplicated. Done when every part has a `uvs` offset and `validate-atlas.mjs` checks its length.
2. **Optimizer.** `optimize-anatomy.mjs` must carry the UV attribute through simplification: pass it to meshoptimizer's `simplifyWithAttributes` with a low weight. Done when simplified parts still have a matching `uvs` length.
3. **Surfaces.** Read each LWO `SURF` chunk for its color and image map, and build a texture atlas of the referenced JPG/TIF/TGA images per system, capped at 4096x4096, using `sharp`. Write the image and per-part UV offset and scale into the manifest. Done when total texture download is under 12 MB.
4. **Shader.** Add a `uv` attribute and per-part atlas rect (in the part state texture's spare channels or a third texture) to the patched material. Fall back to the system color where a surface has no map. Done when the Destiny flag decal and the solar cell grid are visible.
5. Verify phone frame rate is unchanged, run all checks, commit.

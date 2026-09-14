---
name: iss-1-convert
description: Phase 1. Fork the repo, write the Lightwave converter, produce the first untextured ISS build.
disable-model-invocation: true
model: claude-fable-5-1
---

Recommended: Fable 5.1, high effort. Reference: `docs/iss-explorer-plan.md` (source URL, format notes, systems). Read it fully before step 1.

1. **Fork.** `git clone` this repo into a sibling directory named `station-atlas`, remove `public/models/*`, and do all remaining work there. Done when `git status` in the fork is clean apart from the removed models.
2. **Fetch.** Download the 7z from the plan into `work/iss/` (gitignored) and extract with py7zr. Done when `work/iss/Scenes/ISS complete_2011.lws` exists.
3. **Reader.** Write `scripts/convert-station.py` replacing `convert-anatomy.py`: parse every LWO the scene references, split into parts by layer, and by surface tag where a file has one layer. Bake each part's world transform from the scene's motion channels and parent chain, convert to right-handed Y-up, triangulate, compute area-weighted vertex normals, quantize to int16, and write the same `atlas.json` and chunk `.bin` layout the viewer already reads. Assign `system` from the plan's table, with a `station.json` map for overrides. Done when the script runs end to end and prints part count, triangle count, and any file it skipped.
4. **Optimize and compress.** Run `optimize-anatomy.mjs` then `compress-models.mjs` unchanged. Done when `.gz` chunks exist and `atlas.json` records them.
5. **Validate.** Update `validate-atlas.mjs` to read expected counts from the manifest rather than hardcoding 2234 and 3432, and add a check that every `LoadObjectLayer` in the scene produced at least one part. Both validation scripts and `npm run check` pass.
6. **Look.** `npm run dev`, open the viewer, compare the assembled station against `work/iss/Images/ISS Complete 2011/*.jpg`. The truss runs port to starboard, solar arrays are at the ends, Zvezda is aft. A mirrored or rotated station means the Z negation or rotation order is wrong; fix the converter, not the camera. Done when the silhouette matches the reference render from the front and top.
7. Commit in the fork with a message naming the source package and its courtesy line.

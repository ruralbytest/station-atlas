---
name: iss-3-viewer
description: Phase 3. Retune the scene for a 109 m station and rewrite the copy and attribution.
disable-model-invocation: true
model: claude-sonnet-5
---

Recommended: Sonnet 5, medium effort. Runs in the station fork.

1. **Stage.** In `app/scene.tsx` remove the ground disc, platform, and rings. Set a near-black clear color. Derive the orbit target and every hardcoded `.85` height from the manifest's overall bounds instead of the human stage. Set camera near and far and orbit min and max distance from the bounds' diagonal. Done when the whole station fits the default view on desktop and phone and you can zoom to a single handrail without clipping.
2. **Explode.** Phase one of the explode currently fans radially by system index. Change it to push each part outward along the truss axis proportional to its distance from center, plus a small vertical spread by system. Done when the explode at 0.4 reads as the station coming apart along its beam, and at 1.0 the packed grid still has no overlaps per `validate-interactions.mjs`.
3. **Light.** Space has one sun. Replace the hemisphere plus two directionals with a single strong directional and a low ambient, keep the room environment for metal reflections. Done when solar arrays look dark blue-black and the modules read as white.
4. **Copy.** Title "Station Atlas", about panel text describing the 2011 configuration and its gaps from the plan, keyboard hints unchanged. Update the `web/index.html` title and description, `README.md`, and the `CLAUDE.md` project summary. Done when no user-facing string mentions anatomy, body, or organs.
5. **Attribution.** Replace `public/ATTRIBUTION.md` with the NASA Johnson package credit, the courtesy line the package README requests, and the download URL. Update the license section of `README.md`. Done when the about panel links to it.
6. Run `npm run check`, both validation scripts, `npm run build`, then commit.

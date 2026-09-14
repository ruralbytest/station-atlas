---
name: iss-4-assembly
description: Phase 4. Launch-order assembly timeline and the promo clip.
disable-model-invocation: true
model: claude-opus-5
---

Recommended: Opus 5, high effort. Runs in the station fork after phases 1 to 3.

1. **Data.** Add `launch` to each concept in the manifest: ISO date, flight designation, vehicle. Source from the assembly sequence page linked in the archive's `Reference material` folder and nasa.gov. Every module concept has a date; pieces launched together share one. Done when a script lists concepts missing a date and prints nothing.
2. **State.** Add `assembly: number | null` to `SceneState` (a timestamp, null meaning complete). In the scene's per-part loop, treat a part as hidden when its concept's launch date is after `assembly`. Reuse the visibility texture; add no new geometry path. Done when scrubbing hides and shows pieces with no frame drops on a phone.
3. **UI.** A timeline slider in the bottom dock with the year as its label and a play button that advances at one year per two seconds. Explode and isolate disable while assembly is active. Done when play runs from 1998 Zarya alone to the full 2011 station and stops.
4. **Motion.** When a piece appears during play, animate it from 3 m along its outward explode direction to rest over 600 ms using the existing damp. Done when appearance reads as docking rather than popping in.
5. **Clip.** Record a vertical 1080x1920 capture of the front view: play assembly, then explode to 1, then back to 0. Save under `outputs/` (gitignored). Done when the file plays in a browser and is under 15 seconds.
6. Run `npm run check`, both validation scripts, and commit.

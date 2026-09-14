---
name: iss-plan
description: Index of the ISS Explorer build phases and which command to run next.
disable-model-invocation: true
---

Read `docs/iss-explorer-plan.md`, then report:

1. Which phases are done. Phase 1 is done when `public/models/atlas.json` has a `version` starting with "ISS". Phase 2 when `app/anatomy.ts` exports the station systems. Phase 3 when `web/index.html` carries the station title. Phase 4 when `SceneState` has an `assembly` field. Phase 5 when parts carry a `uvs` offset.
2. The next command to run, with its recommended model and effort from the plan's table, and a reminder to switch with `/model` first.
3. Whether the current directory is the Human Atlas repo or the station fork. Phases 2 to 5 run in the fork, which phase 1 creates as a sibling directory.

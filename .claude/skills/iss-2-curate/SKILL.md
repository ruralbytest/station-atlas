---
name: iss-2-curate
description: Phase 2. Station systems, concept groups, and per-module descriptions.
disable-model-invocation: true
model: claude-opus-5
---

Recommended: Opus 5, medium effort. Runs in the station fork. Reference: the systems and concept tables in `docs/iss-explorer-plan.md`.

1. **Systems.** Replace `SYSTEMS`, `SystemId`, and `DEFAULT_VISIBLE` in `app/anatomy.ts` with the ten station systems. Each gets a color that reads against a dark background and a two-sentence description. Order matters: the explode fan uses the array index. Put truss first, arrays and thermal last, so the fan pulls the beam apart before the wings. Done when `npm run check` passes.
2. **Concepts.** Extend `convert-station.py` to emit the plan's concept groups (Kibo, Canadarm2, Port truss, Starboard truss, Zarya, Zvezda) plus one concept per module folder, so search finds "Destiny" and "lab" both. Done when `validate-atlas.mjs` passes and searching "Kibo" in the viewer selects five pieces.
3. **Descriptions.** Write `EXPLANATIONS` for every module: launch date, launch vehicle, agency, mass, and one line of purpose. Source each fact from nasa.gov or esa.int station pages and cite the URL in a `sources` map beside it. Every module in the manifest has an entry, and no fact is unsourced. Done when a script asserts that every part's `conceptId` resolves to an explanation.
4. **Presets.** Replace the Skeleton and Organs presets with "Modules only" and "Truss and power". Done when both buttons show the expected subset.
5. Commit.

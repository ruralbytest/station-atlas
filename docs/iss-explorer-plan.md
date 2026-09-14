# ISS Explorer plan

Build a "Station Atlas": the Human Atlas viewer pointed at NASA's high-res International Space Station model. Same pipeline (manifest + chunked binary geometry + GPU-driven explode), new data, new systems, new copy. The work is five phases; each is a slash command (`/iss-plan` lists them). This file is the shared reference every phase reads.

## Source data (verified 2026-09-14)

- Package: NASA Johnson Visual Communications Lab, "ISS complete 2011", Lightwave 9. Public domain; README asks for a "courtesy NASA" credit.
- Download (25 MB 7z): https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/International%20Space%20Station%20(ISS)%20(C)%20(High%20Res)/International%20Space%20Station%20(ISS)%20(C)%20(High%20Res).7z
- Mirror page: https://science.nasa.gov/3d-resources/international-space-station-iss-c-high-res/
- Extract with `python -m pip install py7zr` then `py7zr.SevenZipFile(...).extractall()`. No 7z binary is installed on this machine.
- The two small GLBs in the same repo ((A) 6.6k tris, (B) 174k tris) are single unnamed meshes. Do not use them.

Archive layout:

| Path | Content |
|---|---|
| `Objects/Modules/<module>/*.lwo` | 68 Lightwave objects, 50 module folders |
| `Scenes/ISS complete_2011.lws` | Placement of 74 object-layers with parent hierarchy |
| `Textures/`, per-module `*.jpg/tif/tga` | 160 texture images |
| `Images/`, `Reference material/` | Renders and a 2009 assembly diagram PNG |

Geometry totals: 585k polygons (mostly quads), 856k points across all files. Expect roughly 1M triangles after triangulation, before simplification. Only the files referenced by the scene are part of the station; the rest are alternates (`fgb-ext_closed`, `jem_all`, `node1-ext`, `tcs-*-collapsed`, `MRM1.lwo` with airlock radiator).

## Lightwave format notes

LWO2 is IFF: `FORM` + size + `LWO2`, then chunks of `tag(4) size(4 BE) body`, padded to even length.

- `LAYR`: U2 number, U2 flags, VEC12 pivot, S0 name (name starts at byte 16), optional U2 parent.
- `PNTS`: F4 xyz triples, absolute coordinates.
- `POLS`: subtype `FACE`, then per polygon U2 count (low 10 bits) followed by `count` VX indices. VX is 2 bytes unless the first byte is 0xFF, then 4 bytes with the top byte dropped.
- `PTAG` subtype `SURF`: pairs of (VX polygon index, U2 tag index) into the `TAGS` string list. This is how a single-layer file is split into named pieces.
- Two files (`tcs-p-ani-layers.lwo`, `tcs-s-ani-layers.lwo`) are the older `LWLO` format. The scene uses `tcs-p-ani.lwo` and `tcs-s-ani.lwo` instead, so skip them.
- Layer names are meaningful where present: Canadarm `armA.lwo` has 10 joint layers, `p6-ext.lwo` has 6 (arrays and boxes), `z1-ext.lwo` has 7, `al-ext.lwo` has 6, `jem_layers.lwo` has 5. Single-layer modules split by surface name (`lab-ext.lwo` has 17 surfaces, `sm-ext.lwo` has 29).

LWS scene (text):

- `LoadObjectLayer <layer> <hexId> <path>` starts an object block. Blocks contain `ObjectMotion` with 9 channels in order X Y Z H P B SX SY SZ, each an `Envelope` of `Key <value> <time> ...` lines. Use the key at time 0.
- `ParentItem <hexId>` links to the parent's id. `AddNullObject` blocks are pivots with their own motion; walk the chain to bake world transforms.
- Lightwave rotation order is heading (Y), pitch (X), bank (Z), angles in radians. Lightwave is left-handed Y-up with +Z forward; three.js is right-handed, so negate Z (positions and the relevant rotation signs) and verify against `Images/ISS Complete 2011/*.jpg`.
- Units are meters. The station spans about 109 m on the truss axis.

## Systems (replace the 15 anatomy systems)

| id | name | members |
|---|---|---|
| us-modules | US modules | lab (Destiny), node1 (Unity), node2 (Harmony), node3 (Tranquility), cupola, PMM (Leonardo), al (Quest airlock) |
| partner-modules | Partner modules | columbus, jem-* (Kibo pieces) |
| russian-modules | Russian segment | fgb (Zarya), sm (Zvezda), pirs, MRM1 (Rassvet), MRM2 (Poisk), MLM (Nauka) |
| truss | Integrated truss | z1, s0, s1, p1, s3-ani, s4-ani, p3-ani, p4-ani, s5, p5, s6, p6 center and boxes |
| solar | Solar arrays | pa*-ani_w_goldcells, p6 and s6 array layers, sm panels layer |
| thermal | Radiators and thermal | tcs-p, tcs-s, esp radiators, pva |
| robotics | Robotics | armA/armB (Canadarm2), mss (Mobile Base), spdm (Dextre), jemrms, obss |
| docking | Docking and airlocks | pma1, pma2, pma3, node1 door |
| platforms | External platforms | esp1, esp2, esp3, ELC1-4, ams (AMS-02) |
| vehicles | Visiting vehicles | soyuz, progress, htv, atv, mplm |

Concepts group elements: "Kibo" = 5 jem layers; "Canadarm2" = 10 arm layers; "Port truss" = p1, p3, p4, p5, p6; "Starboard truss" = s0 to s6; "Zarya" = 3 fgb layers; "Zvezda" = 2 sm layers.

## Known gaps in the 2011 model

No Prichal, Bishop airlock, iROSA arrays, Axiom modules, or Nauka in its final position (the MLM here is a 2011 projection). Say so in the about panel. The assembly timeline (phase 4) ends at 2011.

## Phases, models, effort

| Command | Work | Model | Effort |
|---|---|---|---|
| `/iss-1-convert` | Fork repo, LWO/LWS reader, first untextured build | Fable 5.1 (`claude-fable-5-1`) | high |
| `/iss-2-curate` | System map, concept groups, 60 module descriptions | Opus 5 (`claude-opus-5`) | medium |
| `/iss-3-viewer` | Scene retune for a 109 m object, copy, attribution | Sonnet 5 (`claude-sonnet-5`) | medium |
| `/iss-4-assembly` | Launch-order assembly timeline and the promo clip | Opus 5 (`claude-opus-5`) | high |
| `/iss-5-textures` | Optional: UVs through the pipeline, real textures | Fable 5.1 (`claude-fable-5-1`) | high |

Why: phase 1 is binary-format and coordinate-frame work where a subtle sign error wastes a day, so it gets the strongest model at high effort. Phase 2 is research and prose where accuracy matters more than reasoning depth. Phase 3 is constants and CSS. Phase 4 adds a new state machine to the scene. Phase 5 changes the vertex layout end to end.

Switch model with `/model` before invoking each command. Set effort where your `/model` picker offers it.

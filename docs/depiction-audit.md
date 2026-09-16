# Depiction accuracy audit

Checked 2026-09-15 against the locally extracted NASA Johnson Space Center **ISS complete 2011** Lightwave package, its README and its two reference renders. The [NASA catalogue](https://science.nasa.gov/3d-resources/international-space-station-iss-c-high-res/) identifies this as a February 2011 model with component configurations preserved in the original Lightwave format.

## Conclusion

The shipped model is a reproducible, simplified adaptation of NASA's projected configuration. Its broad structure is retained, but its surface appearance, fine detail and historical assembly sequence are not exact reproductions. Retaining 382 mesh records does not mean retaining every physical detail inside those meshes.

## What was verified

The converter was run into `work/audit/raw-model/` and `work/audit/source-model/`, without modifying `public/models/`. The optimizer was also run in the audit directory. All five resulting `body-*.bin` files matched the shipped files by SHA-256.

| Check | Result |
| --- | --- |
| Scene layers referenced by the original LWS | 73; all produced geometry |
| Unique referenced object file paths | 48 |
| Converted mesh groups | 382 before and after simplification |
| Concept records | 55 |
| Triangles | 866,256 before; 516,796 after simplification |
| Original converted bounding extent | 108.6289 × 28.8148 × 75.7761 m |
| Shipped vertices absent from their corresponding pre-simplification mesh | 0 |
| Retained vertex normals differing from the corresponding converted source | 0 |
| Mesh name, concept, system and scene-item differences on rebuild | 0 |

These checks establish reproducibility and preservation relative to the existing conversion. They are not an independent validation of every Lightwave transform, triangulation decision or normal calculation. Source surface normals are recalculated by the converter; they are not imported unchanged from Lightwave shading settings. Names and system assignments come from `scripts/station.json`, so reproducing that mapping does not independently verify every label.

## Confirmed differences

### 1. Fine geometry is lost during simplification

The optimizer retains all mesh groups, but it can remove disconnected geometry within a group. After welding identical positions within each source mesh and finding connected triangle components, **257 source components across 48 meshes had no retained vertices in the shipped mesh**. This is a geometric component count, not a count of missing flight modules or independently identified hardware parts. Components may also split during simplification, so it is not simply the difference between the before/after component totals.

Examples:

- `sm-ext-1-allum` (Zvezda): 7 source components disappear. Four have bounding dimensions approximately 0.166 × 0.414 × 0.462 m. The mesh's actual bounding extent shrinks by up to 0.355 m on one side.
- `fgb-ext-layers-1-allum` (Zarya): 8 source components disappear, including two approximately 0.221 × 0.223 × 0.350 m. The largest one-sided bounding change is 0.165 m.
- Some removed solar-array details are about 4.7 m long but only around 1 mm wide. Length alone would exaggerate their visual importance.

The optimizer's observed maximum relative error was 0.0019998804, within its configured 0.002 threshold. That is the simplifier's error metric; it should not be described as a guarantee that every feature is preserved or every point stays within a strict 0.2% physical tolerance. The manifest retains pre-simplification bounds, so checking those metadata bounds alone misses these losses.

### 2. Surface appearance is intentionally different

The original reference renders show solar-cell grids, surface markings and material variation. The converter does not export UV coordinates, texture assignments or the original surface material settings. `app/scene.tsx` instead assigns system colors and common metalness/roughness values. Light/dark lighting is also an artistic viewer choice. This accounts for much of the pale, simplified appearance compared with NASA's renders.

### 3. Assembly is a launch-order illustration

The timeline reveals components on launch dates and places them at their final source-model locations. Launch, arrival, berthing and installation are different events.

- P6 appears at the outboard truss location from its 2000 launch. NASA documents that it was mounted atop Z1 until its relocation during STS-120 in October 2007. [NASA spacewalking history](https://www.nasa.gov/history/space-station-20th-spacewalking-history/)
- The two CETA cart meshes share the first cart's launch date, although the local assembly data documents two different flights.
- Temporary placements and later relocations of modules and adapters are not animated.
- The 3 m docking animation is illustrative, not an actual approach path or installation trajectory.
- The Complete endpoint includes the projected MLM/Nauka and ERA geometry. Their 2021 launch dates do not make the geometry an accurate depiction of the station in 2021. NASA records Nauka's docking on July 29, 2021. [NASA docking report](https://www.nasa.gov/blogs/spacestation/2021/07/29/new-module-successfully-docks-to-space-station/)

### 4. Small documentation inconsistencies

- `public/ATTRIBUTION.md` says the scene loads 47 objects; there are 48 unique referenced file paths.
- The old planning document says source units are meters, while the converter applies an inch-to-meter scale of 0.0254 and produces a 108.63 m station span. The planning document should not be used as the authoritative account of the implemented conversion.
- There are 10 defined system categories, but only 9 contain geometry. The visiting-vehicles category is empty.

## Recommended order

1. For closer visual fidelity, carry the original UVs, textures and per-surface materials through conversion. Keep system coloring as an optional educational overlay.
2. For fine-detail fidelity, preserve disconnected components during simplification, or provide an unsimplified/source-detail mode. Add component-preservation checks rather than relying on mesh counts alone.
3. For historical fidelity, separate launch dates from attachment dates and model the important relocation events. Until then, describe the control as a launch-order illustration of the reference model.
4. Correct the source-file count and obsolete unit note in the documentation.

## Audit evidence

Local scratch results are in `work/audit/source-comparison.json` and `work/audit/component-comparison.json`; original reference images are under `work/iss/Images/ISS Complete 2011/`. The audit did not modify application code or shipped model data.

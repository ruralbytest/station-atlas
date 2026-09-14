# Station data attribution

International Space Station model: "ISS complete 2011", NASA Johnson Space Center Visual Communications Lab, February 2011. Public domain; the package README asks that media using these files carry a courtesy line. Courtesy NASA (National Aeronautics and Space Administration).

- Download: https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/International%20Space%20Station%20(ISS)%20(C)%20(High%20Res)/International%20Space%20Station%20(ISS)%20(C)%20(High%20Res).7z
- Catalog page: https://science.nasa.gov/3d-resources/international-space-station-iss-c-high-res/
- Source scene: `Scenes/ISS complete_2011.lws` and the 47 Lightwave objects it loads (73 object layers).

Adaptations (`scripts/convert-station.py`): each scene layer's world transform baked from the Lightwave motion channels and parent chain; the left-handed inch-based frame converted to right-handed meters with the truss on X, zenith on Y, and forward on Z; polygons triangulated; area-weighted normals with hard edges above 60 degrees; single-layer objects split into parts by surface name; geometry simplified with meshoptimizer at a 0.2% per-part error bound; normals quantized to signed 16-bit and packed into binary chunks. The 2011 scene predates Prichal, the Bishop airlock, the iROSA arrays, and Nauka's final position, and loads no visiting vehicles. Textures are not yet carried through the pipeline.

## Previous dataset (no longer shipped)

The sections below describe the anatomy data this viewer was forked from and are kept for the history of the code.

# Anatomy data attribution

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

- License: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html (updated 2025-02-27)
- Dataset: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- License terms: https://creativecommons.org/licenses/by/4.0/
- Source geometry: `isa_BP3D_4.0_obj_99.zip`, BodyParts3D 4.0.
- English names and relationships: IS-A and PART-OF concept, element, and inclusion tables from the same archive.
- Publication: Mitsuhashi et al. (2009), BodyParts3D: 3D structure database for anatomical concepts. https://doi.org/10.1093/nar/gkn613

Adaptations: axes and units converted from millimeters/Z-up to meters/Y-up; translated to rest at the stage; geometry simplified using meshoptimizer with 0.2% relative error limit per structure; normals quantized to signed 16-bit; packed into binary chunks; curated display system groupings and colors. The source contains 2,234 individual OBJ meshes; all remain represented. The combined hierarchy contains 3,432 named FMA concepts, which may reference multiple meshes. Original source identity is preserved in the manifest.

Source OBJ comments mention an older CC BY-SA 2.1 Japan license. The official current database license linked above supersedes that legacy text and explicitly permits redistribution and adaptation under CC BY 4.0.

BodyParts3D represents an adult male reference anatomy based on TARO MRI and anatomical illustration refinements. It is not a complete model of every possible human anatomical structure or variation. This interface is educational and is not a clinical tool.

## Historical assets (not included in the current release)

Earlier repository revisions included female reference anatomy: Kristen Browne and Heidi Schlehlein, Human Reference Atlas / HuBMAP, *3D Reference Organ Set for Female v1.5* (2023). CC BY 4.0. Geometry adapted for this viewer.

- Source DOI: https://doi.org/10.48539/HBM352.BTSQ.586
- Dataset: https://lod.humanatlas.io/ref-organ/united-female/v1.5
- Original GLB: https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.5/assets/3d-vh-f-united.glb
- License: https://creativecommons.org/licenses/by/4.0/

Adaptations: translated native meter/Y-up coordinates onto the stage, coincident vertices welded and source normals averaged, geometry simplified with a 0.2% per-structure relative error bound, and normals quantized. Colors and display systems are curated for this interface. All 888 source meshes are represented, with 1,073 source nodes available as selectable individual or compound concepts.

This is a reference assembly with whole-body surface and selected organs, including female reproductive anatomy. Its skeleton and muscle coverage is partial. It is not a complete model of every human structure or a single-person scan. Eight placenta/umbilical structures are classified under Pregnancy reference and hidden by default.

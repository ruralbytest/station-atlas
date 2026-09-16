# Source appearance restoration

## Result

- All 382 selectable parts and 866,256 oriented triangles match the audit’s raw, pre-simplification conversion exactly, including all previously lost disconnected details. Material/UV boundaries may duplicate vertices but do not change triangle positions or winding.
- 485 surface ranges retain 452 source surface records. The renderer batches records with equivalent appearance.
- Available source textures provide 18 color/mask layers from four image files. Original images are losslessly transcoded to PNG at their original dimensions. No replacement artwork was generated.
- Surface color, diffuse, specular, glossiness, reflectivity, transparency and luminosity are mapped to browser PBR shading. This is an approximation of Lightwave 9, not its original render engine. Procedural, bump and reflection/specular image maps remain unsupported.
- Planar/cylindrical/spherical/UV mappings retain source centers, rotations, axes, repeat and wrap settings. World-space textures retain the source root transform even though the viewer removes the root pose from station geometry. UV seams are split without losing triangles.
- Lossless source geometry is 10.11 MB compressed (formerly 6.17 MB simplified). Source textures add 0.94 MB. Geometry is content-addressed to avoid stale cache combinations.

## Available images

- singlepanel.tif (305 × 620)
- gen-module-side-c.tif (802 × 256)
- fgb-pan.jpg (640 × 688)
- jem-module-side-c.tga (802 × 512)

## Missing source images

The supplied archive does not contain the following 39 image filenames referenced by active color layers. Their source surface colors remain visible; this viewer does not invent missing markings. Adding the original files to `work/iss/Textures` and rebuilding will include them.

- AMS2 patch.tga
- RASSVET.tga
- aftside.jpg
- boom-seg1.jpg
- boom-seg2.jpg
- canada logo2.tga
- destiny.jpg
- door_decals_01.jpg
- door_decals_02.jpg
- door_decals_02m.jpg
- door_decals_03.jpg
- door_decals_03m.jpg
- door_decals_04.jpg
- door_decals_04m.jpg
- door_ext.jpg
- fgb-aft.jpg
- fgb-side.jpg
- fwdside.jpg
- hatch-shroud.jpg
- joint-roll-back.jpg
- joint-rool-side.jpg
- joint-yaw-side.jpg
- lab-aft.jpg
- lab-fwd.jpg
- lab-side.jpg
- mplm-targets.tga
- shield-lgrad-port.jpg
- shield-lgrad-stbd.jpg
- shield-lgrad.jpg
- shield-smrad-stbd.jpg
- shield-smrad.jpg
- side-fwd.jpg
- side-port.jpg
- side-zenith.jpg
- side.jpg
- singlepanelback.jpg
- sm-rearcyl-aft.jpg
- sm-side-c.jpg
- unity.jpg

## Historical scope

Launch history is a launch-date filter in one projected reference configuration. Launch is not docking or installation. The previous arbitrary three-metre docking animation has been removed. The viewer explicitly labels reference positions and documents P6/Harmony/PMA-2 relocations, but does not reconstruct historical transforms or deployment states. A geometrically accurate historical animation still requires sourced placement/orientation and deployment data for each stage.

The CETA cart dates are corrected per mesh: source layer 3 is named `ceta B port` and layer 4 `ceta A stbd`. Cart A appears on October 7, 2002 (STS-112); Cart B waits until November 23, 2002 (STS-113). The visible counter and future-selection action use these individual dates.

“Complete” opens NASA’s projected February 2011 source, not a modern ISS snapshot. Nauka/ERA launch facts do not update the original projected geometry. The header, caption, About panel and individual module notes expose this distinction.

## Sources

- [NASA original model](https://science.nasa.gov/3d-resources/international-space-station-iss-c-high-res/)
- [NASA integrated truss installation history](https://www.nasa.gov/international-space-station/integrated-truss-structure/)
- [ESA Harmony relocation](https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Columbus/Harmony_moved_to_final_location)
- [NASA Nauka docking](https://www.nasa.gov/blogs/spacestation/2021/07/29/new-module-successfully-docks-to-space-station/)
- Lightwave LWO2 format specification, in the source SDK documentation (mirrored at https://documentation.help/LightWave/lwo2.html).

# Station Atlas

An interactive 3D model of the International Space Station built with React, Three.js, and shadcn/ui. Take NASA's "ISS complete 2011" reference apart into **382 individually selectable pieces**, explore **10 station systems**, and search **55 named modules and assemblies**. Replay its assembly launch by launch, from Zarya in 1998 to the complete station. Forked from Human Atlas, the same viewer built for anatomy.

## Explore

- Orbit, zoom, and select structures directly on the station.
- Toggle individual systems or use "Modules only" and "Truss and power" presets.
- Move from the assembled station to a spaced inventory of every visible piece.
- Play or scrub the assembly timeline: each element docks on its launch date, one year every two seconds.
- Search module names and source identifiers.
- Isolate a selected structure and read its sourced launch facts.
- Use compact controls and detail panels on mobile.

## Run locally

Requires Node.js 22.13 or newer. No API keys or accounts are needed.

```sh
npm ci
npm run dev
```

Open http://localhost:3016. To build the static site, run `npm run build`; the output is in `dist/`.

## Validate

```sh
npm run check
node scripts/validate-atlas.mjs
node scripts/validate-interactions.mjs
node scripts/missing-launches.mjs
npm run build
```

Validation covers mesh buffers, names and concept membership, sourced explanations and a launch date for every concept, the assembly timeline's range and pace, nonoverlapping exploded layouts at desktop and mobile aspect ratios, search and inspection contracts, and tap-versus-drag handling. Browser interaction checks have exercised selection, system controls, search, isolation, rotation, and 390×844, 320×568, and 844×390 layouts. Phone controls stay clear of the exploded inventory, and isolated structures fit the space above or beside the detail panel. Physical-device performance and real multitouch hardware have not been tested.

## Station data

The viewer uses NASA Johnson Space Center Visual Communications Lab's **"ISS complete 2011"** Lightwave reference model, which is public domain. It shows the station's projected 2011 configuration and predates Prichal, the Bishop airlock, the roll-out solar arrays, Axiom modules, and Nauka's final position; it carries no visiting vehicles. The assembly timeline's launch dates and flight designations come from NASA's assembly sequence and are cited in `docs/assembly-sequence.json`. Each element appears at its 2011 position, and Nauka and the European Robotic Arm, launched in 2021, join only when the timeline reaches the complete model.

Geometry is simplified for browser performance while retaining every converted mesh. Full credits, source links, and adaptation details are in [ATTRIBUTION.md](public/ATTRIBUTION.md).

This is an educational explorer, not an engineering or mission-planning reference.

## How it works

Geometry is merged into batches per system. Per-structure GPU textures control translation, visibility, and selection, while component geometry supports accurate picking. Exploded layouts pack only the visible pieces. Camera framing and orbit limits are derived from the model's overall bounds. Rendering updates when the scene changes; orbit controls remain responsive without hundreds of separate draw calls.

The optional WebMCP tools expose station search and inspection in compatible browsers. The visible interface works without them.

## Rebuilding geometry

The repository includes browser-ready geometry. Rebuilding it is optional: download and extract the NASA "ISS complete 2011" package into `work/iss/` (see `docs/iss-explorer-plan.md` for the source URL and format notes), then run `python scripts/convert-station.py`, `node scripts/optimize-anatomy.mjs`, and `node scripts/compress-models.mjs`, then `python scripts/build-launches.py` to date each concept. Simplification uses a 0.2% relative error limit per part.

## Assembly clip

With the dev server running, `node scripts/record-clip.mjs` records a vertical 1080×1920 capture of the front view (assembly, explode, and back) to `outputs/`, which is not committed. It needs Playwright with Chromium and ffmpeg.

## Deploy

Import this repository into Vercel as a Vite project. The included `vercel.json` configures `npm ci`, `npm run build`, and the `dist` output directory. It can also be served by a static host.

## License

Original application code is released under the [MIT License](LICENSE). **The station model is public domain** (NASA); the package README asks that media using it carry a "courtesy NASA" line - see [ATTRIBUTION.md](public/ATTRIBUTION.md). Third-party dependencies retain their respective licenses.

Issues and pull requests are welcome. Please include reproduction steps and browser/device details for interaction problems.

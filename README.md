# Station Atlas

An interactive 3D model of the International Space Station built with React, Three.js, and shadcn/ui. Take NASA's "ISS complete 2011" reference apart into **382 individually selectable pieces**, explore **10 station systems**, and search **55 named modules and assemblies**. Explore launch history from Zarya in 1998 in the projected reference layout. Forked from Human Atlas, the same viewer built for anatomy.

## Explore

- Orbit, zoom, and select structures directly on the station.
- Toggle individual systems or use "Modules only" and "Truss and power" presets.
- Move from the assembled station to a spaced inventory of every visible piece.
- Play or scrub launch history, one year every two seconds. Dates filter elements in the reference layout; historical relocations and docking trajectories are not reconstructed.
- View original surface colors and available NASA textures with full source geometry.
- Search module names and source identifiers.
- Isolate a selected structure and read its sourced launch facts.
- Use compact controls and detail panels on mobile.
- Switch between light and dark mode; the viewer remembers your choice.
- Copy a view link to share its selected structure, systems, camera preset, assembly date, and exploded/isolation state.
- Jump to a selected structure's launch when it is hidden by the assembly timeline.

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
npm test
npx playwright install chromium
npm run test:browser
```

Validation covers mesh buffers, concept membership, sourced explanations and launch dates, timeline behavior, exploded layouts, tap-versus-drag handling, URL round-trips, and compressed model downloads. The Playwright suite builds and serves the production site on port 3017, then exercises visible counts, future selections, the complete-model endpoint, camera restoration after isolation, shared links, citations, loading failures, theme persistence, and phone controls. A camera image comparison allows 0.3% differing pixels to tolerate small rendering differences. Failed runs retain traces; the GitHub Actions workflow runs these checks on pushes and pull requests.

The suite also records loading at a 390×844 viewport with 10 Mbps download throughput, 80 ms latency, and 4× CPU slowdown. This uses a local software GPU and is a simulated profile, not a measurement of a physical phone. Physical-device performance and real multitouch hardware have not been tested.

## Station data

The viewer uses NASA Johnson Space Center Visual Communications Lab's **"ISS complete 2011"** Lightwave reference model, which is public domain. It shows the station's projected 2011 configuration and predates Prichal, the Bishop airlock, the roll-out solar arrays, Axiom modules, and Nauka's final position; it carries no visiting vehicles. The assembly timeline's launch dates and flight designations come from NASA's assembly sequence and are cited in `docs/assembly-sequence.json`. Each element appears at its 2011 position, and Nauka and the European Robotic Arm, launched in 2021, join only when the timeline reaches the complete model.

Geometry is simplified for browser performance while retaining every converted mesh. Full credits, source links, and adaptation details are in [ATTRIBUTION.md](public/ATTRIBUTION.md).

This is an educational explorer, not an engineering or mission-planning reference.

## How it works

Geometry is merged into batches per system. Per-structure GPU textures control translation, visibility, and selection, while component geometry supports accurate picking. Exploded layouts pack only the visible pieces. Camera framing and orbit limits are derived from the model's overall bounds. Rendering updates when the scene changes; orbit controls remain responsive without hundreds of separate draw calls.

The optional WebMCP tools expose station search and inspection in compatible browsers. The visible interface works without them.

The historical slider runs through December 31, 2011. Its final, separate **Complete** position shows the full reference model, including elements that launched later. The caption and accessible slider value distinguish this from a historical date. Future selections explain their visibility and offer either **Jump to launch** or **Show complete reference model**.

View state is stored in the URL fragment, so links work on a static host. Light/dark preference remains local to the browser. Links preserve camera presets rather than an arbitrary dragged camera position.

The Three.js viewer loads as a separate JavaScript chunk. Tailwind scans the application and the used UI components listed in `app/globals.css`; update that source list when adding another UI component. The scene measures visible controls and panels via `app/scene-viewport.ts`, with resize and DOM observers keeping camera framing in step with the CSS layout.

Earlier production sizes before source-detail restoration (historical baseline):

| Asset | Before | After |
| --- | ---: | ---: |
| Initial JavaScript | 1,005 kB | 451 kB |
| Deferred 3D viewer | — | 582 kB |
| CSS | 202 kB | 80 kB |
| Compressed geometry | 6.17 MB | 6.17 MB |

Deferring the viewer lets the interface load first; it does not reduce the total JavaScript or geometry needed to display the station. Before source-detail restoration, the simulated mobile profile described above reached ready in approximately 6.8 seconds in a local run; hardware, network and browser differences will affect that number.

## Rebuilding geometry

The repository includes browser-ready geometry. To rebuild, extract NASA’s source into `work/iss/` and install Python’s numpy and Pillow packages. Stage the conversion before publishing:

```sh
python scripts/convert-station.py work/iss scripts/station.json work/restored
node scripts/publish-model.mjs work/restored
python scripts/build-launches.py
npm test
```

The publisher creates content-addressed binary/gzip files, preserves existing launch metadata, publishes the manifest last, and removes only superseded generated chunks. Do not run the legacy lossy optimizer on source-material geometry. The full model downloads about **10.11 MB of compressed geometry**, plus four PNG textures (about 0.94 MB). The source-detail version reached ready in about **14 seconds** in the same simulated mobile profile. See [source appearance and limitations](docs/source-appearance.md).


## Assembly clip

With the dev server running, `node scripts/record-clip.mjs` records a vertical 1080×1920 capture of the front view (assembly, explode, and back) to `outputs/`, which is not committed. It needs Playwright with Chromium and ffmpeg.

## Deploy

Import this repository into Vercel as a Vite project. The included `vercel.json` configures `npm ci`, `npm run build`, and the `dist` output directory. It can also be served by a static host.

## License

Original application code is released under the [MIT License](LICENSE). **The station model is public domain** (NASA); the package README asks that media using it carry a "courtesy NASA" line - see [ATTRIBUTION.md](public/ATTRIBUTION.md). Third-party dependencies retain their respective licenses.

Issues and pull requests are welcome. Please include reproduction steps and browser/device details for interaction problems.

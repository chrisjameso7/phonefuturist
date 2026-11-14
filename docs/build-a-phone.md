# Build a Phone — component-level 3D Device Studio

Branch: `feature/build-a-phone-internals`, based on `claude/phonefuturist-design-upgrade-h5g0sb`.
Scope: Interactive Leaks 2.0 specification, as confirmed on 2026-11-13.

Build a Phone extends the existing 3D device studio at `/labs/configurator`. The studio still shapes the outside of a phone; Build a Phone adds what is inside it, lets a visitor install, replace and remove parts, checks whether the result can physically and electrically work, and hands the build to Interactive Leaks.

## Ground rules

- **Representative, not real.** Every internal part is a generic class part and every internal arrangement is a generic layout. Nothing here is a teardown of a real device. The interface labels each part "Representative" and each layout "Representative layout".
- **Every value has a confidence class and a source.** `measured`, `documented`, `estimated`, `speculative`, or `user` for values the visitor set. `documented` values cite a public standard or physical principle by name. No value in the catalogue is `measured`, and tests keep it that way until teardown references exist.
- **Device-specific layouts need documented teardown references.** To add one, register a `teardown` source in `sources.ts` with its citation, then mark the affected parts `representative: false`. Tests reject a named part without such a source.
- **No new dependencies, no database changes.** Three.js stays; builds are saved in the browser and shared through the existing Community publish.

## What was kept, upgraded and introduced

| Area | Decision |
|---|---|
| Three.js scene (`device-scene.ts`), lazy loading, on-demand rendering, context-loss fallback | Kept |
| Procedural exterior (`device-mesh.ts`, `hardware-mesh.ts`), finishes, design families | Kept; camera and flash positions moved to `camera-layout.ts` so the interior uses the same numbers |
| BOM planning catalogue (`bom-catalog.ts`) | Kept unchanged; components link to its cost estimates by id |
| Interactive Leaks simulator and engine | Kept unchanged |
| Component schema, catalogue, slots, architectures, placement solver | Introduced (`src/lib/labs/build/`) |

## Data model (`src/lib/labs/build/`)

| File | Contents |
|---|---|
| `schema.ts` | Types: `ComponentDefinition`, `SlotDefinition`, `PhoneBuild`, `PlacedPart`, confidence classes, geometry levels, the ten subsystems and twelve assembly steps |
| `sources.ts` | Registry of every source a value may cite |
| `catalog.ts` | The component catalogue, organised by subsystem |
| `architectures.ts` | Slots (positions that take one component), their connections, and three representative architectures |
| `assembly.ts` | Placement solver: turns a build into positioned parts in chassis millimetres |

A **component** carries an id, kind, subsystem, name, description, manufacturer and model (both `null` for representative parts), dimensions with their basis, weight, materials, specifications, electrical characteristics, interfaces, dependencies, sub-assemblies, a 3D asset reference with its geometry level, sources, and an optional link to a BOM cost estimate.

A **slot** is a place in the phone: its assembly step, how it is mounted, whether it is required, which components fit, and what it connects to (with the interface and the flex or connector that carries it). Several slots can share a kind, so a phone can have three microphones, two telephoto cameras and six antennas.

A **build** is a chassis design, an architecture, the component chosen for each slot, and the list of parts not yet installed.

### Architectures

| Id | Arrangement |
|---|---|
| `classic` | One logic board across the top, full-width battery, daughterboard at the bottom |
| `stacked` | Two boards soldered face to face, smaller board footprint, longer battery bay |
| `rail` | L-shaped board down one side beside a narrow battery |

Slots are conditional: camera slots follow the number of rear lenses, the port slot follows the studio's USB-C setting, and an architecture can omit slots.

### Placement solver

`resolveBuild(build)` is pure TypeScript with no renderer imports. It:

1. Stacks the display layers from the front surface back to the midframe.
2. Divides the interior into a logic-board band, a battery bay and a bottom band according to the architecture.
3. Hangs each rear camera module behind its lens opening, using the same lens positions the exterior draws.
4. Cuts the logic-board outline around anything that passes through it, then packs board-mounted chips onto a 0.5 mm occupancy grid, grouped under their shield cans. Memory is stacked on the processor.
5. Fits the largest battery and camera modules that physically fit, until the visitor chooses their own.
6. Computes mass: catalogue weights for discrete parts, volume × published material density for parts fitted to the chassis.

It also derives **access order** from geometry (`accessBlockers`): the parts that physically cover another part and must come out first.

Coordinates: origin at the chassis centre, +x right and +y up when looking at the rear, +z out of the rear cover.

## Geometry accuracy levels

| Level | Meaning | Used today |
|---|---|---|
| 1 · Specification-based | Generated from dimensions and class specifications | All internal parts except the USB-C port |
| 2 · Reference-based | Modelled from credible references | USB-C receptacle, from the USB Type-C specification |
| 3 · Reference-accurate | Validated against several references and measurements | None; requires teardown references |

## Rendering (phase 2)

| File | Contents |
|---|---|
| `build/materials.ts` | One shared library of PBR materials. Textures (board traces, chip markings, cell labels, brushed and dimpled metal) are generated in code, so there are no image downloads. Lens and cover glass use transmission and thin-film coating on the high tier only. |
| `build/part-mesh.ts` | A geometry builder per part class: lens barrel on a voice-coil can, pouch cell with terrace and tabs, logic board cut exactly around the cameras, 24-contact USB-C receptacle, coil windings, shield cans, flex tails and connectors. Geometry is merged per material, and repeated parts (passives, connectors, screws, brackets) use instancing. |
| `build/build-model.ts` | Owns one group per installed part. It reuses the studio's exterior model for the shell, so the outside matches the 3D device studio. It handles exploded views (all or one subsystem), X-ray (shell ghosted, internals opaque; a deeper level also ghosts shields and covers), inspection, selection outlines with connection lines, and picking. It animates install and remove: covering parts lift first, then the target moves, then they reseat. |
| `studio-environment.ts` | A procedural studio light room used for reflections, replacing the stock room environment. |
| `device-scene.ts` | Same API as before, plus zoom while rotating, tap-to-select, smooth camera framing, and quality tiers with a frame-time monitor. |

Quality tiers: **high** for desktops (2× pixel ratio, 2048 px soft shadows, glass transmission), **balanced** for low-memory machines, **mobile** for touch phones (1.5× pixel ratio, 1024 px shadows, no transmission). If frames stay slow, the scene steps down a tier on its own. Reduced motion skips the animations.

The exterior is unchanged except for detail: a coated front element and inner ring in each lens, the USB-C tongue, microphone ports, and moulded antenna breaks in place of black slots.

## Studio interface (phase 3)

The 3D device studio gains an **Exterior / Inside · Build a Phone** switch under the concept name. Exterior shows the existing controls unchanged. Inside loads the Build a Phone library on demand (`build/index.ts`, no Three.js) and shows the workbench in the controls column:

- a "Representative" notice, worded the same everywhere the layout appears;
- the three internal layouts as radio choices with their summaries;
- totals with confidence labels: parts installed, estimated mass, internal cavity depth, and the chassis as your setting;
- the ten subsystems with part counts; choosing one separates just that subsystem.

The preview gains the four view modes (Assembled, Exploded, X-ray, Inspect), a subsystem filter, a "Look under shields" option in X-ray, and a caption that describes the current view for screen readers. Tapping a part selects it and frames it. With the switch on Exterior, or anywhere else the viewport is used (device concepts, Community), behaviour is unchanged.

## Tests

| File | Covers |
|---|---|
| `tests/labs-build-catalog.test.ts` | Catalogue integrity, sources and confidence, cost links, slots, connections, architectures |
| `tests/labs-build-assembly.test.ts` | Placement inside the chassis, no intersections in default builds, stack order, automatic fitting, conditional slots, replace/remove/install, access order, mass, determinism |
| `tests/labs-build-view.test.ts` | View modes, subsystem options, captions, selection rules, the representative notice, and that the lazily loaded module excludes the renderer |
| `tests/labs-build-model.test.ts` | Geometry for every part, instancing and shared materials, exact board cut-outs, distinct exteriors per design family, partial rebuilds, exploded order and reassembly, X-ray ghosting, picking, install/remove animation, quality tiers |

/**
 * Build a Phone — component data model.
 *
 * Pure data and types: no renderer, React or database imports. Everything a
 * user can inspect carries a confidence class and a source, so representative
 * planning values are never shown as facts about a real device.
 */
import type { DeviceDesign } from '../device-design';

export const BUILD_SCHEMA_VERSION = 'build-a-phone-1';

export const SUBSYSTEMS = {
  mechanical: 'Mechanical construction',
  display: 'Display',
  processing: 'Processing and motherboard',
  camera: 'Camera',
  power: 'Power',
  thermal: 'Thermal management',
  connectivity: 'Connectivity',
  audio: 'Audio',
  sensors: 'Sensors and biometrics',
  interconnect: 'Connectors and flex assemblies',
} as const;
export type Subsystem = keyof typeof SUBSYSTEMS;

/** The twelve assembly stages, in installation order. */
export const ASSEMBLY_STEPS = [
  'Chassis and structural frame', 'Display assembly', 'Motherboard', 'Processor and memory', 'Camera modules', 'Battery',
  'Thermal management', 'Connectivity hardware', 'Audio components', 'Sensors and biometrics', 'Buttons, ports and connectors', 'Rear cover',
] as const;
export type AssemblyStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * measured    — taken from a physical measurement with a cited source.
 * documented  — stated by a public standard or specification.
 * estimated   — a planning value typical of the part class.
 * speculative — a guess with no supporting reference.
 * `user` marks values the visitor set themselves in the studio.
 */
export type Confidence = 'measured' | 'documented' | 'estimated' | 'speculative' | 'user';
export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  measured: 'Measured', documented: 'Documented', estimated: 'Estimated', speculative: 'Speculative', user: 'Your setting',
};
/** Lower rank means weaker evidence. */
export const CONFIDENCE_RANK: Record<Confidence, number> = { speculative: 0, estimated: 1, documented: 2, user: 3, measured: 3 };
export const weakestConfidence = (...items: Confidence[]): Confidence =>
  items.reduce((a, b) => CONFIDENCE_RANK[b] < CONFIDENCE_RANK[a] ? b : a, 'measured' as Confidence);

export type SourceKind = 'standard' | 'principle' | 'derivation' | 'assumption' | 'catalogue' | 'teardown' | 'user';
export type Source = { id: string; kind: SourceKind; title: string; note?: string };

/** Geometry fidelity levels from the Interactive Leaks 2.0 specification. */
export const GEOMETRY_LEVELS = {
  1: 'Level 1 · specification-based: generated from dimensions and class specifications',
  2: 'Level 2 · reference-based: modelled from credible photographs, drawings or leaks',
  3: 'Level 3 · reference-accurate: validated against several references and physical measurements',
} as const;
export type GeometryLevel = keyof typeof GEOMETRY_LEVELS;

export type Spec = { label: string; value: string | number; unit?: string; confidence: Confidence; source: string };

/** Signal, power and RF interfaces used for connection checks. */
export type InterfaceType =
  | 'mipi-dsi' | 'mipi-csi' | 'lpddr4x' | 'lpddr5' | 'lpddr5x' | 'ufs-2.2' | 'ufs-3.1' | 'ufs-4.0'
  | 'usb-2.0' | 'usb-3.2' | 'i2c' | 'spi' | 'i3c' | 'pcie' | 'sdio' | 'i2s' | 'rf-coax' | 'rf-feed'
  | 'battery-power' | 'vbus' | 'board-to-board' | 'spring-contact' | 'thermal-contact' | 'mechanical';

export type ComponentInterface = { type: InterfaceType; count?: number; note?: string };

export type Electrical = {
  /** Typical power drawn while active, watts. */
  activeW?: number;
  /** Heat produced under a sustained heavy workload, watts. */
  sustainedHeatW?: number;
  /** Highest short-term draw, watts. */
  peakW?: number;
  nominalV?: number;
  /** Charger or receiver power rating, watts. */
  ratedW?: number;
  confidence: Confidence; source: string;
};

export type ProceduralAsset = {
  type: 'procedural';
  /** Name of the mesh builder in part-mesh.ts. */
  builder: string;
  level: GeometryLevel;
  /** Builder-specific options such as lens count or cell count. */
  options?: Record<string, number | string | boolean>;
};

export type ComponentDefinition = {
  id: string;
  /** Slot kinds this component can be installed into. */
  kind: string;
  subsystem: Subsystem;
  name: string;
  description: string;
  /** null when the part is a representative class rather than a named product. */
  manufacturer: string | null;
  model: string | null;
  /** True for generic class parts. Shown on every inspector panel and label. */
  representative: boolean;
  /** Width (x), height (y) and depth (z) in millimetres before rotation. */
  dimensions: [number, number, number];
  /** How the dimensions were obtained. 'fitted' parts take their size from the chassis. */
  dimensionBasis: { confidence: Confidence; source: string; fitted?: boolean };
  weightG: number;
  materials: string[];
  specs: Spec[];
  electrical?: Electrical;
  interfaces: ComponentInterface[];
  /** Slot kinds that must also be installed for this part to function. */
  requires: string[];
  /** Free-form numeric or categorical traits used by compatibility rules. */
  traits: Record<string, number | string | boolean>;
  /** Sub-assemblies that are part of this component and not separately replaceable. */
  contains: Array<{ label: string; description: string }>;
  asset: ProceduralAsset;
  sources: string[];
  /** Link to the existing BOM planning catalogue, preserving its cost estimate. */
  bom?: { group: string; option: string };
};

export type Mount = 'structure' | 'layer' | 'bay' | 'board' | 'camera' | 'edge' | 'rear' | 'instanced';

export type SlotConnection = {
  /** Slot id of the other end. */
  to: string;
  interface: InterfaceType;
  /** Slot id of the flex, cable or connector that carries it. */
  via?: string;
  description: string;
};

export type SlotDefinition = {
  id: string;
  kind: string;
  label: string;
  subsystem: Subsystem;
  step: AssemblyStep;
  mount: Mount;
  /** Removing a required part leaves the phone non-functional. */
  required: boolean;
  /** Component ids that may be installed; the first is the default unless `initial` is set. */
  options: string[];
  initial?: string | null;
  connections: SlotConnection[];
  /** Stack order used for exploded views and access checks. Negative is the display side. */
  layer: number;
  /** Board-mounted parts are packed by zone, in table order. */
  zone?: 'compute' | 'rf' | 'misc';
  /** Plain-language location shown in the inspector. */
  location: string;
};

export type PhoneBuild = {
  version: typeof BUILD_SCHEMA_VERSION;
  name: string;
  design: DeviceDesign;
  architecture: string;
  /** Slot id to component id. null means deliberately left out; missing means default. */
  selections: Record<string, string | null>;
  /** Slot ids the user has not installed yet (assembly progress). */
  uninstalled: string[];
};

export type Box = { x: number; y: number; z: number; w: number; h: number; d: number };

export type PlacedPart = {
  slot: SlotDefinition;
  component: ComponentDefinition;
  installed: boolean;
  /** Centre and extents in chassis millimetres. */
  box: Box;
  /** Slot id of the board this part is soldered to, if any. */
  parent?: string;
  /** Rotation about z in quarter turns. */
  quarterTurns: 0 | 1;
  /** Displacement at full explosion, millimetres. */
  explode: [number, number, number];
  /** Number of instances for repeated hardware such as screws. */
  instances?: Array<[number, number, number]>;
  /** Where the dimensions came from after fitting. */
  sizeConfidence: Confidence;
  /** Set when a board-mounted part could not be placed. */
  unplaced?: boolean;
  /** Board level for stacked boards: 0 is the lower board. */
  level?: number;
  /** Geometry payload for the mesh builder, such as a board outline or a flex path. */
  detail?: Record<string, unknown>;
};

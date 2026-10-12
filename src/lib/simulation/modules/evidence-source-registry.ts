export const EVIDENCE_SOURCE_REGISTRY_VERSION =
  'evidence-source-registry-0.1.0';

export type EvidenceSourceDomain =
  | 'device-specs'
  | 'battery-runtime'
  | 'charging'
  | 'cpu-performance'
  | 'gpu-performance'
  | 'gpu-efficiency'
  | 'display'
  | 'camera'
  | 'thermal';

export interface EvidenceSourcePolicy {
  id: string;
  publisher: string;
  homepage: string;
  domains: EvidenceSourceDomain[];
  evidenceClass:
    | 'catalog-spec'
    | 'controlled-lab'
    | 'review-lab';
  protocolFamily: string;
  compatibleOnlyWithinProtocolFamily: boolean;
  priority:
    | 'primary'
    | 'high'
    | 'supporting';
  notes: string[];
}

export const EVIDENCE_SOURCE_POLICIES:
  readonly EvidenceSourcePolicy[] = [
  {
    id: 'techapi-open-data',
    publisher: 'TechAPI',
    homepage:
      'https://github.com/GetTechAPI/TechAPI',
    domains: ['device-specs'],
    evidenceClass: 'catalog-spec',
    protocolFamily:
      'techapi-curated-specs',
    compatibleOnlyWithinProtocolFamily:
      false,
    priority: 'supporting',
    notes: [
      'CC-BY-SA 4.0 open specification dataset.',
      'Used for catalog breadth, device identity, SoC, display, battery, charging, dimensions and camera metadata.',
      'Catalog records are never promoted to lab measurements.',
      'PhoneFuturist preserves upstream source URLs and attribution.',
    ],
  },
  {
    id: 'geekerwan-performance',
    publisher: 'Geekerwan',
    homepage:
      'https://www.geekerwan.com/',
    domains: [
      'cpu-performance',
      'gpu-performance',
      'gpu-efficiency',
      'thermal',
    ],
    evidenceClass: 'controlled-lab',
    protocolFamily:
      'geekerwan-performance',
    compatibleOnlyWithinProtocolFamily:
      true,
    priority: 'primary',
    notes: [
      'Geekerwan publishes cross-device CPU/GPU rankings and efficiency curves.',
      'Efficiency work uses instrumented power measurements rather than advertised SoC power.',
      'Geekbench, 3DMark and GFXBench results remain separated by benchmark and protocol version.',
      'A score from one benchmark family is never normalized into another benchmark without an explicit validated mapping.',
    ],
  },
  {
    id: 'geekerwan-battery',
    publisher: 'Geekerwan',
    homepage:
      'https://www.geekerwan.com/batlife/',
    domains: ['battery-runtime'],
    evidenceClass: 'controlled-lab',
    protocolFamily:
      'geekerwan-battery',
    compatibleOnlyWithinProtocolFamily:
      true,
    priority: 'primary',
    notes: [
      'Battery versions are protocol-specific and are not merged blindly across revisions.',
      'Retail-device synchronized tests are kept separate from PhoneArena, GSMArena and Tom’s Guide battery protocols.',
    ],
  },
  {
    id: 'geekerwan-charging',
    publisher: 'Geekerwan',
    homepage:
      'https://www.geekerwan.com/',
    domains: ['charging'],
    evidenceClass: 'controlled-lab',
    protocolFamily:
      'geekerwan-charging-curves',
    compatibleOnlyWithinProtocolFamily:
      true,
    priority: 'primary',
    notes: [
      'Measured charging curves preserve energy-versus-time samples, charger class and wall-input energy.',
      'Curve-derived milestones are kept separate from advertised charging wattage.',
    ],
  },
  {
    id: 'dxomark-battery',
    publisher: 'DXOMARK',
    homepage:
      'https://www.dxomark.com/',
    domains: [
      'battery-runtime',
      'charging',
    ],
    evidenceClass: 'controlled-lab',
    protocolFamily:
      'dxomark-battery',
    compatibleOnlyWithinProtocolFamily:
      true,
    priority: 'high',
    notes: [
      'DXOMARK Battery scores remain protocol-specific composite context and are never converted directly into runtime hours.',
      'Measured wired and wireless charging milestones may be used only within compatible DXOMARK charging protocols.',
    ],
  },
  {
    id: 'nanoreview-soc',
    publisher: 'NanoReview',
    homepage:
      'https://nanoreview.net/en/soc-list/rating',
    domains: [
      'cpu-performance',
      'gpu-performance',
    ],
    evidenceClass: 'review-lab',
    protocolFamily:
      'nanoreview-aggregated-soc',
    compatibleOnlyWithinProtocolFamily:
      true,
    priority: 'supporting',
    notes: [
      'NanoReview SoC values are aggregated benchmark context rather than a controlled retail-phone lab measurement.',
      'Metrics are source-namespaced and never pooled directly with Geekerwan or Notebookcheck benchmark protocols.',
    ],
  },
  {
    id: 'phonearena-battery',
    publisher: 'PhoneArena',
    homepage:
      'https://www.phonearena.com/phones/benchmarks/battery',
    domains: [
      'battery-runtime',
      'charging',
    ],
    evidenceClass: 'controlled-lab',
    protocolFamily:
      'phonearena-battery-current',
    compatibleOnlyWithinProtocolFamily:
      true,
    priority: 'high',
    notes: [
      'PhoneArena publishes separate browsing, video and 3D-gaming endurance measurements.',
      'Current methodology fixes brightness at 200 nits and uses Wi-Fi for battery testing.',
      'Charging tests use powered-on phones starting at 1% and a factory or verified maximum-speed charger.',
    ],
  },
  {
    id: 'gsmarena-battery',
    publisher: 'GSMArena',
    homepage:
      'https://www.gsmarena.com/',
    domains: [
      'battery-runtime',
      'charging',
    ],
    evidenceClass: 'review-lab',
    protocolFamily:
      'gsmarena-active-use',
    compatibleOnlyWithinProtocolFamily:
      true,
    priority: 'high',
    notes: [
      'GSMArena Active Use Score and workload results are treated as their own protocol family.',
      'Legacy GSMArena endurance-rating results must not be mixed with the newer Active Use protocol.',
    ],
  },
  {
    id: 'tomsguide-battery',
    publisher: "Tom's Guide",
    homepage:
      'https://www.tomsguide.com/',
    domains: ['battery-runtime'],
    evidenceClass: 'review-lab',
    protocolFamily:
      'tomsguide-web-battery',
    compatibleOnlyWithinProtocolFamily:
      true,
    priority: 'supporting',
    notes: [
      'Tom’s Guide phone battery testing is a continuous web-browsing endurance protocol.',
      'Its 5G/brightness conditions are protocol metadata and results are not averaged directly with Wi-Fi browsing tests from other labs.',
      'Protocol revisions are versioned separately when the publication changes methodology.',
    ],
  },
  {
    id: 'notebookcheck-smartphone',
    publisher: 'Notebookcheck',
    homepage:
      'https://www.notebookcheck.net/',
    domains: [
      'battery-runtime',
      'charging',
      'display',
      'cpu-performance',
      'gpu-performance',
      'thermal',
    ],
    evidenceClass: 'review-lab',
    protocolFamily:
      'notebookcheck-smartphone-review',
    compatibleOnlyWithinProtocolFamily:
      true,
    priority: 'high',
    notes: [
      'Notebookcheck measurements can contribute only when the exact test/protocol and conditions are captured.',
      'Power, display, battery and benchmark metrics remain separate measurement families.',
    ],
  },
  {
    id: 'chargerlab',
    publisher: 'ChargerLAB',
    homepage:
      'https://www.chargerlab.com/',
    domains: ['charging', 'thermal'],
    evidenceClass: 'review-lab',
    protocolFamily:
      'chargerlab-charging',
    compatibleOnlyWithinProtocolFamily:
      true,
    priority: 'high',
    notes: [
      'Charging curves, charger negotiation and measured power are preferred over advertised wattage when available.',
      'USB-PD/PPS and proprietary charging modes remain distinct.',
    ],
  },
] as const;

export function getEvidenceSourcePolicy(
  id: string,
) {
  return EVIDENCE_SOURCE_POLICIES.find(
    (source) => source.id === id,
  );
}

export function canPoolEvidenceSources(
  a: EvidenceSourcePolicy,
  b: EvidenceSourcePolicy,
) {
  if (
    !a.compatibleOnlyWithinProtocolFamily &&
    !b.compatibleOnlyWithinProtocolFamily
  ) {
    return true;
  }

  return (
    a.protocolFamily ===
    b.protocolFamily
  );
}

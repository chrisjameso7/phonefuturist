import type {
  CorpusSource,
  DeviceCorpus,
} from './device-corpus';

export const GEEKERWAN_EVIDENCE_SOURCE_VERSION =
  'geekerwan-evidence-sources-0.1.0';

const sources: CorpusSource[] = [
  {
    id: 'geekerwan-gpu-snl-curve',
    publisher: 'Geekerwan',
    url: 'https://geekerwan.com/gpucurve/',
    protocol:
      '3DMark SNL GPU efficiency curve. Board power measured with power monitor + dummy battery; real-time display power subtracted.',
    accessedDate: '2026-10-12',
  },
  {
    id: 'geekerwan-gpu-gfx-curve',
    publisher: 'Geekerwan',
    url: 'https://geekerwan.com/gpucurve/gfx/',
    protocol:
      'GFX GPU efficiency curve. Board power measured with power monitor + dummy battery; real-time display power subtracted.',
    accessedDate: '2026-10-12',
  },
  {
    id: 'geekerwan-cpu-efficiency-curve',
    publisher: 'Geekerwan',
    url: 'https://www.geekerwan.com/cpucurve/',
    protocol:
      'Geekbench 5 multi-frequency CPU efficiency curve. Board power measured with power monitor + dummy battery; real-time display power subtracted.',
    accessedDate: '2026-10-12',
  },
  {
    id: 'geekerwan-5g-battery-ranking',
    publisher: 'Geekerwan',
    url: 'https://www.geekerwan.com/batlife/',
    protocol:
      'Geekerwan 5G battery-life ranking using self-purchased retail phones; page links model/system entries to full test recordings.',
    accessedDate: '2026-10-12',
  },
  {
    id: 'geekerwan-overall-performance-ranking',
    publisher: 'Geekerwan',
    url: 'https://geekerwan.com/allperf/',
    protocol:
      'Mobile/tablet SoC overall performance ranking. CPU weighted 70%, GPU weighted 30%; excludes power, AI, ISP and modem performance.',
    accessedDate: '2026-10-12',
  },
];

export function buildGeekerwanEvidenceSourceCorpus(): DeviceCorpus {
  return {
    version:
      GEEKERWAN_EVIDENCE_SOURCE_VERSION,
    sources,
    devices: [],
    measurements: [],
  };
}

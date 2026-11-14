import {
  buildCalibrationRegistry,
} from './calibration-registry';
import {
  buildExpandedDeviceCatalog,
} from './expanded-device-catalog';
import {
  buildCorpusCoverageReport,
  type CorpusCoverageReport,
} from './corpus-coverage-report';
import {
  mergeDeviceCorpora,
} from './corpus-merge';

export const EXPANDED_EVIDENCE_COVERAGE_VERSION =
  'expanded-evidence-coverage-0.1.0';

export interface ExpandedEvidenceCoverage {
  version: string;
  coverage: CorpusCoverageReport;
  rawExpandedCatalogRecords: number;
  calibrationDeviceRecords: number;
  calibrationMeasurements: number;
  mergedDeviceRecords: number;
  note: string;
}

export function buildExpandedEvidenceCoverage():
  ExpandedEvidenceCoverage {
  const catalog =
    buildExpandedDeviceCatalog();

  const calibration =
    buildCalibrationRegistry();

  const merged =
    mergeDeviceCorpora(
      [
        catalog,
        calibration,
      ],
      'expanded-evidence-audit-0.1.0',
    ).corpus;

  return {
    version:
      EXPANDED_EVIDENCE_COVERAGE_VERSION,
    coverage:
      buildCorpusCoverageReport(
        merged,
      ),
    rawExpandedCatalogRecords:
      catalog.devices.length,
    calibrationDeviceRecords:
      calibration.devices.length,
    calibrationMeasurements:
      calibration.measurements.length,
    mergedDeviceRecords:
      merged.devices.length,
    note:
      'Catalog breadth and measured calibration depth are combined only for reporting. Catalog-only records remain measurement-free and are not promoted into calibration evidence.',
  };
}

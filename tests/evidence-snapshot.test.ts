import { describe, expect, it } from 'vitest';

import {
  createBatteryEvidenceSnapshotFromDevice,
} from '../src/lib/simulation/evidence-snapshot';

import type {
  ReferenceDevice,
} from '../src/lib/simulation/power-evidence';

function reference(
  overrides: Partial<ReferenceDevice> = {},
): ReferenceDevice {
  return {
    id: 'reference-phone',
    manufacturer: 'Example',
    model: 'Reference Phone',
    releaseYear: 2026,

    energyWh: 20,
    energyBasis: 'rated',
    energyProvenance:
      'manufacturer rated pack energy',

    runtimeSeconds: 36000,
    screenOnPowerW: 2,

    displayAreaCm2: 110,
    soc: 'Example SoC',

    measurementIds: [
      'measurement-001',
    ],

    protocolId:
      'notebookcheck_wifi_web_v1_3',

    provider: 'Notebookcheck',

    datasetRole: 'calibration',

    ...overrides,
  };
}

describe(
  'createBatteryEvidenceSnapshotFromDevice',
  () => {
    it('creates a deterministic snapshot identifier', () => {
      const references = [
        reference(),
      ];

      const first =
        createBatteryEvidenceSnapshotFromDevice(
          {
            name: 'Reference Phone',
            energyWh: 20,
            displayAreaCm2: 110,
          },
          references,
        );

      const second =
        createBatteryEvidenceSnapshotFromDevice(
          {
            name: 'Reference Phone',
            energyWh: 20,
            displayAreaCm2: 110,
          },
          references,
        );

      expect(first.snapshotId).toBe(
        second.snapshotId,
      );

      expect(first).toEqual(second);
    });

    it('freezes a matched reference and its resolved web power', () => {
      const snapshot =
        createBatteryEvidenceSnapshotFromDevice(
          {
            name: 'Reference Phone',
            energyWh: 20,
            displayAreaCm2: 110,
          },
          [reference()],
        );

      expect(
        snapshot.resolution.status,
      ).toBe('resolved');

      expect(
        snapshot.resolution.basis,
      ).toBe('matched-reference');

      expect(
        snapshot.resolution.webPowerW,
      ).toEqual({
        min: 2,
        max: 2,
      });

      expect(snapshot.references).toHaveLength(
        1,
      );

      expect(
        snapshot.references[0],
      ).toEqual(
        expect.objectContaining({
          id: 'reference-phone',
          model: 'Reference Phone',
          screenOnPowerW: 2,
          measurementIds: [
            'measurement-001',
          ],
        }),
      );
    });

    it('freezes the full reference population when no device matches', () => {
      const references = [
        reference({
          id: 'reference-a',
          model: 'Phone A',
          screenOnPowerW: 2,
        }),

        reference({
          id: 'reference-b',
          model: 'Phone B',
          screenOnPowerW: 3,
        }),
      ];

      const snapshot =
        createBatteryEvidenceSnapshotFromDevice(
          {
            name: 'Unknown Phone',
            energyWh: 21,
            displayAreaCm2: 112,
          },
          references,
        );

      expect(
        snapshot.resolution.status,
      ).toBe('resolved');

      expect(
        snapshot.resolution.basis,
      ).toBe('reference-population');

      expect(
        snapshot.resolution.webPowerW,
      ).toEqual({
        min: 2,
        max: 3,
      });

      expect(snapshot.references).toHaveLength(
        2,
      );

      expect(
        snapshot.resolution.referenceCount,
      ).toBe(2);
    });

    it('keeps unsupported workloads explicitly insufficient', () => {
      const snapshot =
        createBatteryEvidenceSnapshotFromDevice(
          {
            name: 'Reference Phone',
            energyWh: 20,
            displayAreaCm2: 110,
          },
          [reference()],
        );

      const web =
        snapshot.workloads.find(
          (item) =>
            item.workload ===
            'web_browsing',
        );

      const video =
        snapshot.workloads.find(
          (item) =>
            item.workload ===
            'video_playback',
        );

      const gaming =
        snapshot.workloads.find(
          (item) =>
            item.workload ===
            'gaming',
        );

      const camera =
        snapshot.workloads.find(
          (item) =>
            item.workload ===
            'camera_use',
        );

      const standby =
        snapshot.workloads.find(
          (item) =>
            item.workload ===
            'standby',
        );

      expect(web?.status).toBe(
        'calibrated',
      );

      expect(web?.powerW).toEqual({
        min: 2,
        max: 2,
      });

      for (const workload of [
        video,
        gaming,
        camera,
        standby,
      ]) {
        expect(workload?.status).toBe(
          'insufficient',
        );

        expect(
          workload?.powerW,
        ).toBeUndefined();
      }
    });

    it('returns an insufficient snapshot when device energy is unavailable', () => {
      const snapshot =
        createBatteryEvidenceSnapshotFromDevice(
          {
            name: 'Reference Phone',
          },
          [reference()],
        );

      expect(
        snapshot.resolution,
      ).toEqual({
        status: 'insufficient',
        referenceCount: 1,
      });

      for (
        const workload of
          snapshot.workloads
      ) {
        expect(workload.status).toBe(
          'insufficient',
        );

        expect(
          workload.powerW,
        ).toBeUndefined();
      }
    });

    it('returns an insufficient snapshot when the reference library is empty', () => {
      const snapshot =
        createBatteryEvidenceSnapshotFromDevice(
          {
            name: 'Unknown Phone',
            energyWh: 20,
          },
          [],
        );

      expect(
        snapshot.resolution,
      ).toEqual({
        status: 'insufficient',
        referenceCount: 0,
      });

      expect(snapshot.references).toEqual(
        [],
      );
    });

    it('changes snapshot identity when evidence changes', () => {
      const first =
        createBatteryEvidenceSnapshotFromDevice(
          {
            name: 'Reference Phone',
            energyWh: 20,
            displayAreaCm2: 110,
          },
          [
            reference({
              screenOnPowerW: 2,
            }),
          ],
        );

      const second =
        createBatteryEvidenceSnapshotFromDevice(
          {
            name: 'Reference Phone',
            energyWh: 20,
            displayAreaCm2: 110,
          },
          [
            reference({
              screenOnPowerW: 2.1,
            }),
          ],
        );

      expect(first.snapshotId).not.toBe(
        second.snapshotId,
      );
    });

    it('freezes protocol provenance into the snapshot', () => {
      const snapshot =
        createBatteryEvidenceSnapshotFromDevice(
          {
            name: 'Reference Phone',
            energyWh: 20,
          },
          [reference()],
        );

      expect(snapshot.protocol).toEqual(
        expect.objectContaining({
          id:
            'notebookcheck_wifi_web_v1_3',
          version: '1.3',
          provider: 'Notebookcheck',
          connectivity: 'wifi',
          brightnessNits: 150,
        }),
      );
    });

    it('copies reference arrays instead of exposing mutable source arrays', () => {
      const source =
        reference();

      const snapshot =
        createBatteryEvidenceSnapshotFromDevice(
          {
            name: 'Reference Phone',
            energyWh: 20,
          },
          [source],
        );

      expect(
        snapshot.references[0]
          .measurementIds,
      ).not.toBe(
        source.measurementIds,
      );

      expect(
        snapshot.references[0]
          .measurementIds,
      ).toEqual(
        source.measurementIds,
      );
    });
  },
);
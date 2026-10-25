import { describe, expect, it } from 'vitest';
import { simulateSimpleMode } from '../src/lib/simulation/simple-mode-engine';

describe('Simple Mode engine', () => {
  it('runs one beta-free simulation across the shared engine layers', () => {
    const result = simulateSimpleMode({
      name: 'Simple Ultra',
      manufacturer: 'Samsung',
      batteryMah: 5700,
      wiredChargingWatts: 60,
      displayDiagonalInches: 6.9,
      displayResolution: 'qhd',
      refreshRateHz: 120,
      socVendor: 'Qualcomm',
      socName: 'Snapdragon 8 Elite Gen 5',
      cooling: 'large-vc',
      mainCamera: {
        sensorFormatDenominator: 1.3,
        resolutionMp: 200,
        apertureFNumber: 1.7,
        equivalentFocalLengthMm: 24,
      },
    });

    expect(result.access).toEqual({
      phase: 'beta',
      paid: false,
      paywallRequired: false,
    });

    expect(result.device.battery?.totalCapacityMah).toBe(
      5700,
    );
    expect(result.display.status).not.toBe('unresolved');
    expect(result.battery.capacityMah).toBe(5700);
    expect(result.cameras).toHaveLength(1);
    expect(
      result.cameras[0].physics
        .approximatePixelPitchMicrons,
    ).toBeGreaterThan(0);
    expect(
      result.cameras[0].physics
        .geometricLightCaptureIndex,
    ).toBeGreaterThan(0);

    expect(
      ['resolved', 'unresolved'],
    ).toContain(
      result.sustainedPerformance.status,
    );

    expect(result.thermal.status).toBe(
      'advanced-only',
    );
    expect(result.thermal.reason).toMatch(
      /does not invent thermal resistance/i,
    );
  });
});

it('carries brightness through Simple Mode expansion and the shared battery engine',()=>{
 const base={batteryMah:5500,displayDiagonalInches:6.7,displayResolution:'fhd' as const,refreshRateHz:120,cooling:'good' as const};
 const dim=simulateSimpleMode({...base,brightnessNits:200});
 const bright=simulateSimpleMode({...base,brightnessNits:1200});
 expect(dim.battery.runtimes.find(row=>row.workload==='web_browsing')!.expectedHours).toBeGreaterThan(bright.battery.runtimes.find(row=>row.workload==='web_browsing')!.expectedHours!);
});

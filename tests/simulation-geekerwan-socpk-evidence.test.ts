import { describe, expect, it } from 'vitest';
import {
  findGeekerwanBatteryResult,
  findGeekerwanSocCurve,
  getGeekerwanDataVersions,
  listGeekerwanBatteryResults,
  listGeekerwanSocCurves,
  summarizeGeekerwanSocCurve,
} from '../src/lib/simulation/modules/geekerwan-socpk-evidence';

describe('Geekerwan / SoCPK evidence adapter', () => {
  it('loads the pinned live snapshot with broad current SoC coverage', () => {
    expect(
      listGeekerwanSocCurves(
        'geekbench6_multi',
      ).length,
    ).toBe(32);

    expect(
      listGeekerwanSocCurves(
        '3dmark_steel_nomad_light',
      ).length,
    ).toBe(31);

    expect(
      listGeekerwanBatteryResults().length,
    ).toBe(80);

    const versions =
      getGeekerwanDataVersions();

    expect(versions.cpu).toBe(
      '59b299b7c524',
    );
    expect(versions.gpu).toBe(
      'f8d0caaa329f',
    );
    expect(versions.battery).toBe(
      '7ddf4f90e2c1',
    );
  });

  it('resolves Exynos 2600 without substituting another generation', () => {
    const cpu =
      findGeekerwanSocCurve(
        'Exynos 2600',
        'geekbench6_multi',
      );

    const gpu =
      findGeekerwanSocCurve(
        'Exynos 2600',
        '3dmark_steel_nomad_light',
      );

    expect(cpu?.socName).toBe(
      'Exynos 2600',
    );
    expect(cpu?.points.length).toBeGreaterThan(
      4,
    );
    expect(gpu?.socName).toBe(
      'Exynos 2600',
    );
    expect(gpu?.points.length).toBeGreaterThan(
      4,
    );

    expect(
      findGeekerwanSocCurve(
        'Exynos 2700',
        'geekbench6_multi',
      ),
    ).toBeUndefined();
  });

  it('uses a nearest published point for a requested power and never fabricates an interpolated point', () => {
    const summary =
      summarizeGeekerwanSocCurve(
        'Snapdragon 8 Elite Gen 5',
        'geekbench6_multi',
        8,
      );

    expect(summary.status).toBe(
      'resolved',
    );
    expect(
      summary.selectedPoint,
    ).toBeDefined();
    expect(
      summary.powerSelection,
    ).toBe(
      'nearest-published-point',
    );

    const curve =
      findGeekerwanSocCurve(
        'Snapdragon 8 Elite Gen 5',
        'geekbench6_multi',
      )!;

    expect(
      curve.points.some(
        (point) =>
          point.powerW ===
            summary.selectedPoint
              ?.powerW &&
          point.score ===
            summary.selectedPoint
              ?.score,
      ),
    ).toBe(true);
  });

  it('preserves battery-test system version, rated energy and full-test video provenance', () => {
    const result =
      findGeekerwanBatteryResult(
        'Samsung',
        'S26 Ultra',
      );

    expect(result).toBeDefined();
    expect(
      result?.ratedEnergyWh,
    ).toBeCloseTo(18.94, 8);
    expect(
      result?.runtimeMinutes,
    ).toBeGreaterThan(0);
    expect(
      result?.averagePowerW,
    ).toBeGreaterThan(0);
    expect(
      result?.systemVersion,
    ).toContain('OneUI');
    expect(
      result?.videoUrl,
    ).toContain('bilibili.com');
  });
});

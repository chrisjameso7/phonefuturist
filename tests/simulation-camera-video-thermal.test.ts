import { describe, expect, it } from 'vitest';
import {
  calculateCameraVideoThermal,
} from '../src/lib/simulation/modules/camera-video-thermal';

describe('camera video thermal envelope', () => {
  it('computes time to an explicit thermal ceiling with first-order physics', () => {
    const result =
      calculateCameraVideoThermal({
        cameraPipelinePowerW: 6,
        ambientTemperatureC: 25,
        thermalResistanceCPerW: 4,
        thermalMassJPerC: 40,
        thermalLimitTemperatureC: 42,
        recordingDurationMinutes: 10,
      });

    expect(result.status).toBe('resolved');
    expect(
      result.steadyStateTemperatureC,
    ).toBe(49);
    expect(
      result.thermalLimitMinutes,
    ).toBeGreaterThan(0);
    expect(
      result.thermalLimitWithinRequestedDuration,
    ).toBeDefined();
  });

  it('reports no thermal limit when steady state remains below the ceiling', () => {
    const result =
      calculateCameraVideoThermal({
        cameraPipelinePowerW: 3,
        ambientTemperatureC: 25,
        thermalResistanceCPerW: 3,
        thermalMassJPerC: 50,
        thermalLimitTemperatureC: 42,
        recordingDurationMinutes: 30,
      });

    expect(result.status).toBe('resolved');
    expect(
      result.noThermalLimitAtConstantPower,
    ).toBe(true);
    expect(
      result.thermalLimitMinutes,
    ).toBeUndefined();
  });

  it('fails closed without explicit thermal constants', () => {
    const result =
      calculateCameraVideoThermal({
        cameraPipelinePowerW: 6,
        recordingDurationMinutes: 10,
      });

    expect(result.status).toBe('unresolved');
    expect(result.note).toContain(
      'rather than inferring camera thermal constants',
    );
  });
});

import { it, expect } from 'vitest';
import { communitySimulation, sharedConfiguration } from '../src/lib/community/simulation';
import { simulateDevice } from '../src/lib/simulation/engine';
import type { SimulationInput } from '../src/lib/simulation/types';
it('freezes the calculated Advanced build and selected processor independently from subsequent edits', () => {
    const input: SimulationInput = { name: 'Advanced concept', formFactor: 'phone', displays: { primary: { diagonalInches: 6.8, resolutionWidthPx: 1440, resolutionHeightPx: 3200 } }, battery: { cells: [{ capacityMah: 6000, nominalVoltageV: 3.85 }] } };
    const configuration = { mode: 'advanced' as const, socName: 'Snapdragon 8 Elite', socVendor: 'Qualcomm', coolingClass: 'large-vapor-chamber', wiredWatts: '120', wirelessWatts: '50', parameters: { socName: 'Snapdragon 8 Elite', batteryCapacityMah: '6000', targetSocPowerW: '8' } };
    const result = simulateDevice(input), snapshot = communitySimulation(input, result, configuration);
    input.battery!.cells[0].capacityMah = 7000;
    configuration.socName = 'Different chip';
    configuration.parameters.targetSocPowerW = '12';
    expect(snapshot.input.battery!.cells[0].capacityMah).toBe(6000);
    expect(snapshot.configuration?.socName).toBe('Snapdragon 8 Elite');
    expect(snapshot.configuration?.parameters?.targetSocPowerW).toBe('8');
    expect(sharedConfiguration(snapshot.configuration)).toEqual(snapshot.configuration);
});
it('rejects malformed or oversized sharing configuration', () => { expect(() => sharedConfiguration({ mode: 'bad' })).toThrow(); expect(() => sharedConfiguration({ mode: 'advanced', socName: 'x'.repeat(101) })).toThrow(); });

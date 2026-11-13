import type { SimulationInput, SimulationResult } from '../simulation/types';
export type SharedSimulationConfiguration = {
    mode: 'simple' | 'advanced';
    socName: string;
    socVendor: string;
    coolingClass: string;
    wiredWatts: string;
    wirelessWatts: string;
    parameters?: Record<string, string>;
};
export type CommunitySimulation = {
    input: SimulationInput;
    device: SimulationResult;
    configuration?: SharedSimulationConfiguration;
};
/** Freeze submitted values, never mutable controls displayed beside an older result. */
export function communitySimulation(input: SimulationInput, device: SimulationResult, configuration?: SharedSimulationConfiguration): CommunitySimulation {
    return structuredClone({ input, device, ...(configuration ? { configuration } : {}) });
}
export function sharedConfiguration(raw: unknown): SharedSimulationConfiguration | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return;
    const value = raw as Record<string, unknown>;
    if (value.mode !== 'simple' && value.mode !== 'advanced')
        throw new Error('Invalid simulation mode.');
    const text = (key: string) => { if (typeof value[key] !== 'string' || value[key].length > 100)
        throw new Error('Invalid configuration.'); return value[key] as string; };
    let parameters: Record<string, string> | undefined;
    if (value.parameters !== undefined) {
        if (!value.parameters || typeof value.parameters !== 'object' || Array.isArray(value.parameters) || Object.keys(value.parameters).length > 250)
            throw new Error('Invalid build parameters.');
        parameters = {};
        for (const [key, item] of Object.entries(value.parameters)) {
            if (!/^[a-zA-Z][a-zA-Z0-9]{0,79}$/.test(key) || typeof item !== 'string' || item.length > 200)
                throw new Error('Invalid build parameter.');
            parameters[key] = item;
        }
    }
    return { ...(parameters ? { parameters } : {}), mode: value.mode, socName: text('socName'), socVendor: text('socVendor'), coolingClass: text('coolingClass'), wiredWatts: text('wiredWatts'), wirelessWatts: text('wirelessWatts') };
}

import { simulateDevice } from '../../lib/simulation/engine';
import type { SimulationInput } from '../../lib/simulation/types';

self.onmessage = (event: MessageEvent<{ id: number; input: SimulationInput }>) => {
  const { id, input } = event.data;
  try {
    const result = simulateDevice(input);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Simulation failed' });
  }
};

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSectionReceipt } from '../src/components/interactive-leaks/render-section-receipt';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('downloaded public section receipts', () => {
  it('renders units, omits unavailable metrics and preserves thermal samples', async () => {
    const labels: string[] = [];
    const context = new Proxy({ fillText: (text: string) => labels.push(text) }, {
      get: (target, key) => key in target ? target[key as keyof typeof target] : () => {},
      set: (target, key, value) => { Reflect.set(target, key, value); return true; },
    });
    const canvas = { width: 0, height: 0, getContext: () => context,
      toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['PNG'], { type: 'image/png' })) };
    const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal('document', { createElement: (tag: string) => tag === 'canvas' ? canvas : link, body: { appendChild: vi.fn() } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:receipt'), revokeObjectURL: vi.fn() });
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(() => 0 as never);
    const thermalPoints = [
      { second: 60, performancePercent: 85, temperatureC: 42 },
      { second: 0, performancePercent: 100, temperatureC: 25 },
      { second: NaN, performancePercent: 0, temperatureC: 0 },
    ];
    const before = structuredClone(thermalPoints);
    await renderSectionReceipt({ kind: 'Thermal', deviceName: '../../Galaxy S27 Ultra', thermalPoints,
      metrics: [{ label: 'Temperature', value: '42 °C' }, { label: 'Unavailable value', value: undefined }] });
    expect(labels).toContain('42 °C');
    expect(labels).toContain('PERFORMANCE STABILITY');
    expect(labels).not.toContain('Unavailable value');
    expect(labels.join(' ')).not.toMatch(/undefined|NaN|Infinity|Engine v|calibration/i);
    expect(labels.join(' ')).toContain('SIMULATION RESULTS');
    expect(thermalPoints).toEqual(before);
    expect(link.download).toBe('phonefuturist-thermal-galaxy-s27-ultra.png');
    expect(link.click).toHaveBeenCalledOnce();
  });

  it('fails clearly when canvas is unavailable', async () => {
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => null }) });
    await expect(renderSectionReceipt({ kind: 'Battery', deviceName: 'Concept', metrics: [] })).rejects.toThrow('Canvas unavailable');
  });
});

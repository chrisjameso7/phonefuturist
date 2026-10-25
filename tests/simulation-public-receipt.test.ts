import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSectionReceipt } from '../src/components/interactive-leaks/render-section-receipt';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('downloaded public section receipts', () => {
  it.each(['Benchmark', 'Battery', 'Charging', 'Display', 'Thermal', 'Camera'] as const)(
    'keeps long names and values within the %s image', async kind => {
      const drawn: Array<{ text: string; x: number; y: number }> = [];
      const context = new Proxy({
        fillText: (text: string, x: number, y: number) => drawn.push({ text, x, y }),
        measureText: (text: string) => ({ width: text.length * 20 }),
      }, {
        get: (target, key) => key in target ? target[key as keyof typeof target] : () => {},
        set: (target, key, value) => { Reflect.set(target, key, value); return true; },
      });
      const canvas = { width: 0, height: 0, getContext: () => context,
        toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['PNG'])) };
      const link = { click: vi.fn(), remove: vi.fn() };
      vi.stubGlobal('document', { createElement: (tag: string) => tag === 'canvas' ? canvas : link, body: { appendChild: vi.fn() } });
      vi.stubGlobal('URL', { createObjectURL: () => 'blob:test', revokeObjectURL: vi.fn() });
      vi.spyOn(globalThis, 'setTimeout').mockImplementation(() => 0 as never);
      const longValue = 'A long charging protocol with multiple cells and detailed assumptions';
      await renderSectionReceipt({ kind, deviceName: 'Unbroken'.repeat(18), metrics: [{ label: 'Power profile', value: longValue }] });
      const valueLines = drawn.filter(row => row.y > 300 && !row.text.includes('PHONEFUTURIST') && !row.text.includes('Estimates') && !row.text.includes('2026'));
      expect(drawn.map(row => row.text).join(' ')).toContain('multiple cells');
      expect(valueLines.every(row => row.x >= 0 && row.y < canvas.height)).toBe(true);
      const firstMetricY = drawn.find(row => row.text === 'Power profile')!.y;
      const titleLines = drawn.filter(row => row.x === 64 && row.y >= 227 && row.y < firstMetricY);
      expect(titleLines.length).toBeGreaterThan(1);
      expect(titleLines.map(row => row.text).join('')).toBe('Unbroken'.repeat(18));
      expect(titleLines.every(row => row.text.length * 20 <= 940)).toBe(true);
      expect(link.click).toHaveBeenCalledOnce();
    });

  it('renders units, omits unavailable metrics and preserves thermal samples', async () => {
    const labels: string[] = [];
    const context = new Proxy({ fillText: (text: string) => labels.push(text), measureText: (text: string) => ({ width: text.length * 20 }) }, {
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
      metrics: [{ label: 'Temperature', value: '42 °C' }, { label: 'Unavailable value', value: undefined }, { label: 'Invalid number', value: NaN }, { label: 'Invalid formatted number', value: 'Infinity h' }] });
    expect(labels).toContain('42 °C');
    expect(labels).toContain('PERFORMANCE STABILITY');
    expect(labels).not.toContain('Unavailable value');
    expect(labels).not.toContain('Invalid number');
    expect(labels).not.toContain('Invalid formatted number');
    expect(canvas.width).toBe(1080);
    expect(labels.join(' ')).toContain('Not a measured device test.');
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

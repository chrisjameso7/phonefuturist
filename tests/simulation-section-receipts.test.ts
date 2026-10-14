import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const file = readFileSync('src/components/interactive-leaks/InteractiveLeaksSimulator.tsx', 'utf8');
const exporter = readFileSync('src/components/interactive-leaks/DownloadSectionReceipt.tsx', 'utf8');

describe('section receipts', () => {
  it('exposes all six advanced-mode downloads', () => {
    for (const kind of ['Display','Battery','Charging','Benchmark','Thermal','Camera']) {
      expect(file).toContain(`<DownloadSectionReceipt kind="${kind}"`);
    }
  });
  it('keeps the original summary card scoped to Simple Mode', () => {
    expect(file).toMatch(/workspaceMode === 'simple' && \(\s*<DeterministicShareCard/);
  });
  it('generates local PNGs with section-specific filenames and a thermal chart', () => {
    expect(exporter).toContain("canvas.toBlob(resolve,'image/png')");
    expect(exporter).toContain('safeFilename(deviceName)');
    expect(exporter).toContain("kind === 'Thermal'");
    expect(exporter).toContain('PERFORMANCE STABILITY');
  });
});

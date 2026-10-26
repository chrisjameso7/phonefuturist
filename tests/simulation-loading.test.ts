import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SimulationLoading from '../src/components/interactive-leaks/SimulationLoading';
import SimpleModePanel from '../src/components/interactive-leaks/SimpleModePanel';
it('announces ongoing calculation without a fabricated completion percentage', () => {
  const html = renderToStaticMarkup(createElement(SimulationLoading));
  expect(html).toContain('role="status"');
  expect(html).toContain('Building your simulation');
  expect(html).not.toContain('aria-valuenow');
});
it('prevents duplicate Simple Mode runs while a worker is pending', () => {
  const html = renderToStaticMarkup(createElement(SimpleModePanel, { onRun: () => {}, pending: true }));
  expect(html).toMatch(/<button[^>]*class="il-simple-run"[^>]*disabled=""[^>]*aria-busy="true"/);
  expect(html).toContain('Simulating…');
});

import { expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('../src/lib/simulation/modules/calibration-registry', () => ({buildCalibrationRegistry: () => ({version:'fixture',sources:[],measurements:[{deviceVariantId:'prior',workload:'web_browsing',evidenceKind:'measured',value:10}],devices:[{variant:{id:'prior',identity:{manufacturer:'Acme',family:'Phone',modelName:'Phone 2'}}}]})}));
import PhoneComparison from '../src/components/interactive-leaks/PhoneComparison';
const props = {name:'Acme Phone 3 concept',batteryInput:{simulation:{formFactor:'phone' as const,displays:{primary:{}}}},batteryResult:{version:'fixture',status:'unresolved' as const,runtimes:[],warnings:[]},cpuScores:[]};
it('offers an explicit predecessor action and menu without automatically showing a comparison', () => {
  const html=renderToStaticMarkup(createElement(PhoneComparison,props));
  expect(html).toContain('Compare with predecessor');
  expect(html).toContain('Select phone to compare with');
  expect(html).toContain('value="prior"');
  expect(html).not.toContain('Selected phone comparison');
  expect(html).not.toMatch(/<button[^>]*disabled/);
});
it('disables predecessor guessing when the concept name cannot identify one', () => {
  const html=renderToStaticMarkup(createElement(PhoneComparison,{...props,name:'My custom concept'}));
  expect(html).toMatch(/<button[^>]*disabled=""/);
  expect(html).toContain('Choose a phone from the menu');
  expect(html).not.toContain('Selected phone comparison');
});

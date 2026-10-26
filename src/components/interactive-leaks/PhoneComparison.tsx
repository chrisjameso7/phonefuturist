import { useMemo, useState } from 'react';
import { buildCalibrationRegistry } from '../../lib/simulation/modules/calibration-registry';
import { suggestDeviceComparisons } from '../../lib/simulation/modules/device-comparison-suggestions';
import { comparableBatteryHours, comparisonPhoneLabel, estimateSelectedPhoneBattery, percentageDifference, selectableComparisonPhones, selectedBenchmarkReference } from '../../lib/simulation/modules/selected-device-comparison';
import type { BatteryExperienceInput, BatteryExperienceResult } from '../../lib/simulation/modules/battery-experience-engine';
import type { PeakPerformanceEstimate } from '../../lib/simulation/modules/peak-performance-estimator';
import './phone-comparison.css';

type Props = { name: string; batteryInput: BatteryExperienceInput; batteryResult: BatteryExperienceResult; cpuScores: PeakPerformanceEstimate[]; capacityMah?: number };
function deltaText(delta: number, positive: string, negative: string) {
  if (Math.abs(delta) < .05) return 'About the same';
  return `${Math.abs(delta).toFixed(1)}% ${delta > 0 ? positive : negative}`;
}
export default function PhoneComparison({name,batteryInput,batteryResult,cpuScores,capacityMah}: Props) {
  const corpus = buildCalibrationRegistry();
  const [selectedId,setSelectedId] = useState('');
  const phones = useMemo(() => selectableComparisonPhones(corpus),[corpus]);
  const predecessor = useMemo(() => {
    const suggestion = suggestDeviceComparisons(corpus,name).find(item => item.role === 'predecessor' && item.status === 'found');
    const exact = corpus.devices.find(d => d.variant.id === suggestion?.deviceId);
    if (!exact) return undefined;
    const modelLabel = comparisonPhoneLabel(exact).split(' · ')[0].toLowerCase();
    const matches = phones.filter(d => comparisonPhoneLabel(d).split(' · ')[0].toLowerCase() === modelLabel);
    // This selects a visible variant; measurements remain attached to its exact ID.
    return matches.find(d => batteryInput.socVendor && d.variant.soc?.vendor === batteryInput.socVendor) ??
      matches.find(d => d.variant.id === exact.variant.id) ?? matches[0];
  },[corpus,name,phones,batteryInput.socVendor]);
  const selected = phones.find(d => d.variant.id === selectedId);
  const referenceBattery = useMemo(() => selected ? estimateSelectedPhoneBattery(corpus,selected,batteryInput) : undefined,[corpus,selected,batteryInput]);
  const refHours = referenceBattery ? comparableBatteryHours(batteryResult,referenceBattery,batteryInput) : undefined;
  const batteryDelta = percentageDifference(batteryResult.mixedUse?.expectedActiveUseHoursPerCharge,refHours);
  const capacityDelta = percentageDifference(capacityMah,selected?.variant.battery?.capacityMah ?? selected?.variant.battery?.typicalCapacityMah);
  return <section className="il-phone-comparison" aria-labelledby="il-compare-heading">
    <h3 id="il-compare-heading">Compare your device</h3>
    <p>Choose one phone to see where your concept gains ground—and where it gives some back.</p>
    <div className="il-phone-comparison__controls">
      <button type="button" disabled={!predecessor?.variant.id} onClick={() => setSelectedId(predecessor?.variant.id ?? '')}>Compare with predecessor</button>
      <label>Or select a phone<select value={selectedId} onChange={event => setSelectedId(event.target.value)}>
        <option value="">Select phone to compare with</option>
        {phones.map(phone => <option key={phone.variant.id} value={phone.variant.id}>{comparisonPhoneLabel(phone)}</option>)}
      </select></label>
    </div>
    <small>The menu contains phones with measured battery or benchmark evidence. Some metrics may still be unavailable for a selected variant.</small>
    {!predecessor?.variant.id && <small>No exact predecessor found for this name. Choose a phone from the menu.</small>}
    {selected && <div className="il-phone-comparison__results" role="region" aria-label="Selected phone comparison" aria-live="polite">
      <h4>{name.trim() || 'Your concept'} <span>vs</span> {comparisonPhoneLabel(selected)}</h4>
      <p>{batteryInput.socName || 'Concept processor unspecified'} vs {selected.variant.soc?.name || 'Phone processor unspecified'}</p>
      <div className="il-phone-comparison__metrics">
        {cpuScores.map(estimate => {
          const ref = selectedBenchmarkReference(corpus,selected.variant.id,estimate);
          const delta = percentageDifference(estimate.adjustedExpected,ref);
          return <div key={estimate.domain}>
            <span>{estimate.domain === 'geekbench6_single' ? 'CPU single-core' : 'CPU multi-core'}</span>
            <strong data-direction={delta === undefined ? 'unknown' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'same'}>{delta === undefined ? 'Not enough comparable data' : deltaText(delta,'faster','slower')}</strong>
            {delta !== undefined && <small>{Math.round(estimate.adjustedExpected!)} vs {Math.round(ref!)} points · Geekbench 6.7</small>}
            <small>Estimated concept score vs measured phone score{estimate.assumptionApplied ? '; includes an assumed processor uplift' : ''}. CPU performance does not represent every SoC task.</small>
          </div>;
        })}
        <div><span>Estimated battery life</span><strong data-direction={batteryDelta === undefined ? 'unknown' : batteryDelta > 0 ? 'up' : 'down'}>{batteryDelta === undefined ? 'Not enough comparable data' : deltaText(batteryDelta,'longer','shorter')}</strong>
          {batteryDelta !== undefined && <small>{batteryResult.mixedUse!.expectedActiveUseHoursPerCharge.toFixed(1)} vs {refHours!.toFixed(1)} hours of active use</small>}
          <small>Both are estimates under the selected usage and brightness scenario. Standby is excluded; incompatible lab protocols are withheld.</small></div>
        <div><span>Battery capacity</span><strong>{capacityDelta === undefined ? 'Unavailable' : deltaText(capacityDelta,'larger','smaller')}</strong><small>Capacity is a specification, not a battery-life gain.</small></div>
      </div>
      <button type="button" onClick={() => setSelectedId('')}>Clear comparison</button>
    </div>}
  </section>;
}

import { backtestCameraSharpnessTiming } from '../src/lib/simulation/modules/camera-backtest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';

const corpus = buildCalibrationRegistry();

const cameraDevices = corpus.devices.filter(
  (device) => (device.cameras?.length ?? 0) > 0,
);
const cameraModules = cameraDevices.reduce(
  (sum, device) => sum + (device.cameras?.length ?? 0),
  0,
);
const cameraMeasurements = corpus.measurements.filter(
  (measurement) => measurement.workload === 'camera',
);

const domains = {
  shutterLag: cameraMeasurements.filter((m) =>
    m.metric.toLowerCase().includes('shutter') &&
    m.metric.toLowerCase().includes('lag'),
  ).length,
  sharpnessTiming: cameraMeasurements.filter((m) =>
    m.metric.toLowerCase().includes('sharpness') &&
    m.metric.toLowerCase().includes('timing'),
  ).length,
  lowLight: cameraMeasurements.filter((m) =>
    m.metric.toLowerCase().includes('low_light') ||
    m.metric.toLowerCase().includes('low light') ||
    m.metric.toLowerCase().includes('night exposure'),
  ).length,
  stabilizationCrop: cameraMeasurements.filter((m) =>
    (m.metric.toLowerCase().includes('stabilization') ||
      m.metric.toLowerCase().includes('eis')) &&
    m.metric.toLowerCase().includes('crop'),
  ).length,
  videoThermal: cameraMeasurements.filter((m) =>
    m.metric.toLowerCase().includes('video') &&
    (m.metric.toLowerCase().includes('thermal') ||
      m.metric.toLowerCase().includes('recording limit')),
  ).length,
  resolvedDetail: cameraMeasurements.filter((m) =>
    m.metric.toLowerCase().includes('detail') ||
    m.metric.toLowerCase().includes('mtf') ||
    m.metric.toLowerCase().includes('resolution score'),
  ).length,
};

console.log('');
console.log('Interactive Leaks Camera Calibration Coverage');
console.log('---------------------------------------------');
console.log(`Devices with camera specs: ${cameraDevices.length}`);
console.log(`Camera modules:            ${cameraModules}`);
console.log(`Measured camera outcomes:  ${cameraMeasurements.length}`);
console.log('');
console.log('Outcome coverage');
console.log(`  Shutter lag:        ${domains.shutterLag}`);
console.log(`  Sharpness & timing: ${domains.sharpnessTiming}`);
console.log(`  Low-light exposure: ${domains.lowLight}`);
console.log(`  Stabilization crop: ${domains.stabilizationCrop}`);
console.log(`  Video thermal:      ${domains.videoThermal}`);
console.log(`  Resolved detail:    ${domains.resolvedDetail}`);

const backtest = backtestCameraSharpnessTiming(corpus);

console.log('');
console.log('Sharpness & Timing leave-one-device-out backtest');
console.log(`  Health:             ${backtest.health}`);
console.log(`  Evaluated devices:  ${backtest.evaluatedDevices}`);
console.log(`  Skipped devices:    ${backtest.skippedDevices}`);
console.log(`  MAE:                ${backtest.maeScore?.toFixed(2) ?? 'n/a'} score`);
console.log(`  p90 error:          ${backtest.p90AbsoluteError?.toFixed(2) ?? 'n/a'} score`);

if (cameraDevices.length < 5 || cameraModules < 12) {
  console.error('');
  console.error(
    'FAIL: Camera hardware coverage is too small for reliable comparable selection.',
  );
  process.exitCode = 1;
} else if (cameraMeasurements.length === 0) {
  console.warn('');
  console.warn(
    'WARN: Camera hardware coverage is available, but measured camera outcome coverage is still empty. Observed outcome cards will remain unresolved until measured evidence is added.',
  );
} else if (backtest.health === 'poor') {
  console.error('');
  console.error(
    'FAIL: Camera Sharpness & Timing backtest is poor. Review camera comparables or evidence before shipping.',
  );
  process.exitCode = 1;
} else if (backtest.health === 'borderline') {
  console.warn('');
  console.warn(
    'WARN: Camera Sharpness & Timing backtest is borderline. Verification will continue, but the predictor should be reviewed.',
  );
} else if (backtest.health === 'insufficient') {
  console.warn('');
  console.warn(
    'WARN: Camera measured evidence exists, but the backtest sample is still too small for a hard quality gate.',
  );
} else {
  console.log('');
  console.log('PASS: Camera hardware, measured outcomes and backtest are healthy.');
}

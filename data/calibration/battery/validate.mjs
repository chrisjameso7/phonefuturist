import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILES = {
  protocols: path.join(__dirname, 'protocols.json'),
  devices: path.join(__dirname, 'devices.json'),
  measurements: path.join(__dirname, 'measurements.json'),
};

const TARGET_SCHEMA_VERSION = '0.1.0';

const errors = [];
const warnings = [];

function error(message) {
  errors.push(message);
}

function warning(message) {
  warnings.push(message);
}

function loadJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    error(`${label}: file does not exist: ${filePath}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (cause) {
    error(
      `${label}: invalid JSON: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    return null;
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveFinite(value) {
  return isFiniteNumber(value) && value > 0;
}

function isNonNegativeFinite(value) {
  return isFiniteNumber(value) && value >= 0;
}

function validateUniqueIds(records, collectionName) {
  const seen = new Set();

  for (const record of records) {
    if (!isNonEmptyString(record?.id)) {
      error(`${collectionName}: record is missing a valid id.`);
      continue;
    }

    if (seen.has(record.id)) {
      error(`${collectionName}: duplicate id "${record.id}".`);
    }

    seen.add(record.id);
  }

  return seen;
}

function validateSchemaVersion(document, label) {
  if (!isNonEmptyString(document?.schema_version)) {
    error(`${label}: missing schema_version.`);
    return;
  }

  if (document.schema_version !== TARGET_SCHEMA_VERSION) {
    warning(
      `${label}: schema_version is "${document.schema_version}", validator currently targets "${TARGET_SCHEMA_VERSION}".`,
    );
  }
}

function validateProtocol(protocol) {
  const prefix = `protocol "${protocol?.id ?? '<missing id>'}"`;

  if (!isNonEmptyString(protocol?.provider)) {
    error(`${prefix}: provider is required.`);
  }

  if (!isNonEmptyString(protocol?.name)) {
    error(`${prefix}: name is required.`);
  }

  if (!isNonEmptyString(protocol?.workload_class)) {
    error(`${prefix}: workload_class is required.`);
  }

  if (!isNonEmptyString(protocol?.measurement_target)) {
    error(`${prefix}: measurement_target is required.`);
  }

  if (!Array.isArray(protocol?.sources) || protocol.sources.length === 0) {
    error(`${prefix}: at least one methodology source is required.`);
  } else {
    for (const source of protocol.sources) {
      if (!isNonEmptyString(source?.id)) {
        error(`${prefix}: source is missing id.`);
      }

      if (!isNonEmptyString(source?.type)) {
        error(
          `${prefix}: source "${source?.id ?? '<unknown>'}" is missing type.`,
        );
      }

      if (!isNonEmptyString(source?.url)) {
        error(
          `${prefix}: source "${source?.id ?? '<unknown>'}" is missing url.`,
        );
      }
    }
  }

  const brightness = protocol?.known_conditions?.display?.brightness_nits;

  if (brightness !== null && brightness !== undefined) {
    if (!isPositiveFinite(brightness?.value)) {
      error(`${prefix}: display brightness must be a positive finite number.`);
    }

    if (!isNonEmptyString(brightness?.qualifier)) {
      error(`${prefix}: display brightness requires a qualifier.`);
    }
  }

  const speakerDb = protocol?.known_conditions?.audio?.speaker_db;

  if (speakerDb !== null && speakerDb !== undefined) {
    if (!isNonNegativeFinite(speakerDb?.value)) {
      error(`${prefix}: speaker_db must be a non-negative finite number.`);
    }

    if (!isNonEmptyString(speakerDb?.qualifier)) {
      error(`${prefix}: speaker_db requires a qualifier.`);
    }
  }
}

function validateDevice(device) {
  const prefix = `device "${device?.id ?? '<missing id>'}"`;

  if (!isNonEmptyString(device?.manufacturer)) {
    error(`${prefix}: manufacturer is required.`);
  }

  if (!isNonEmptyString(device?.model)) {
    error(`${prefix}: model is required.`);
  }

  if (
    device?.release_year !== null &&
    device?.release_year !== undefined &&
    (!Number.isInteger(device.release_year) || device.release_year < 2000)
  ) {
    error(`${prefix}: release_year must be a plausible integer year.`);
  }

  const typicalCapacity = device?.battery?.typical_capacity_mah;

  if (
    typicalCapacity !== null &&
    typicalCapacity !== undefined &&
    !isPositiveFinite(typicalCapacity)
  ) {
    error(`${prefix}: typical battery capacity must be positive when known.`);
  }

  const minimumCapacity = device?.battery?.minimum_capacity_mah;

  if (
    minimumCapacity !== null &&
    minimumCapacity !== undefined &&
    !isPositiveFinite(minimumCapacity)
  ) {
    error(`${prefix}: minimum battery capacity must be positive when known.`);
  }

  if (
    isPositiveFinite(typicalCapacity) &&
    isPositiveFinite(minimumCapacity) &&
    minimumCapacity > typicalCapacity
  ) {
    error(`${prefix}: minimum battery capacity cannot exceed typical capacity.`);
  }

  const voltage = device?.battery?.nominal_voltage_v;

  if (
    voltage !== null &&
    voltage !== undefined &&
    !isPositiveFinite(voltage)
  ) {
    error(`${prefix}: nominal voltage must be positive when known.`);
  }

  const energy = device?.battery?.rated_energy_wh;

  if (
    energy !== null &&
    energy !== undefined &&
    !isPositiveFinite(energy)
  ) {
    error(`${prefix}: rated energy must be positive when known.`);
  }

  const display = device?.display;

  if (
    display?.diagonal_inches !== null &&
    display?.diagonal_inches !== undefined &&
    !isPositiveFinite(display.diagonal_inches)
  ) {
    error(`${prefix}: display diagonal must be positive when known.`);
  }

  for (const field of ['width_pixels', 'height_pixels']) {
    const value = display?.[field];

    if (
      value !== null &&
      value !== undefined &&
      (!Number.isInteger(value) || value <= 0)
    ) {
      error(`${prefix}: ${field} must be a positive integer when known.`);
    }
  }

  const minimumRefresh = display?.minimum_refresh_hz;
  const maximumRefresh = display?.maximum_refresh_hz;

  if (
    minimumRefresh !== null &&
    minimumRefresh !== undefined &&
    !isPositiveFinite(minimumRefresh)
  ) {
    error(`${prefix}: minimum_refresh_hz must be positive when known.`);
  }

  if (
    maximumRefresh !== null &&
    maximumRefresh !== undefined &&
    !isPositiveFinite(maximumRefresh)
  ) {
    error(`${prefix}: maximum_refresh_hz must be positive when known.`);
  }

  if (
    isPositiveFinite(minimumRefresh) &&
    isPositiveFinite(maximumRefresh) &&
    minimumRefresh > maximumRefresh
  ) {
    error(`${prefix}: minimum refresh rate cannot exceed maximum refresh rate.`);
  }

  const physical = device?.physical ?? {};

  for (const field of ['height_mm', 'width_mm', 'depth_mm', 'weight_g']) {
    const value = physical[field];

    if (value !== null && value !== undefined && !isPositiveFinite(value)) {
      error(`${prefix}: ${field} must be positive when known.`);
    }
  }

  if (!Array.isArray(device?.sources) || device.sources.length === 0) {
    error(`${prefix}: at least one source is required.`);
  }
}

function parseRuntimeDisplayValue(value) {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const normalized = value.trim();

  const match = normalized.match(
    /^(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:in(?:utes?)?)?$/i,
  );

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    minutes < 0 ||
    minutes >= 60
  ) {
    return null;
  }

  return hours * 3600 + minutes * 60;
}

function validateMeasurement(
  measurement,
  deviceIds,
  protocolIds,
  protocolById,
) {
  const prefix = `measurement "${measurement?.id ?? '<missing id>'}"`;

  if (!isNonEmptyString(measurement?.device_id)) {
    error(`${prefix}: device_id is required.`);
  } else if (!deviceIds.has(measurement.device_id)) {
    error(
      `${prefix}: references unknown device_id "${measurement.device_id}".`,
    );
  }

  if (!isNonEmptyString(measurement?.protocol_id)) {
    error(`${prefix}: protocol_id is required.`);
  } else if (!protocolIds.has(measurement.protocol_id)) {
    error(
      `${prefix}: references unknown protocol_id "${measurement.protocol_id}".`,
    );
  }

  if (measurement?.metric !== 'runtime') {
    error(
      `${prefix}: unsupported metric "${measurement?.metric}". Seed validator currently expects "runtime".`,
    );
  }

  if (!isNonEmptyString(measurement?.workload_class)) {
    error(`${prefix}: workload_class is required.`);
  }

  const protocol = protocolById.get(measurement?.protocol_id);

  if (
    protocol &&
    isNonEmptyString(protocol.workload_class) &&
    isNonEmptyString(measurement?.workload_class) &&
    protocol.workload_class !== measurement.workload_class
  ) {
    error(
      `${prefix}: workload_class "${measurement.workload_class}" does not match protocol "${measurement.protocol_id}" workload_class "${protocol.workload_class}".`,
    );
  }

  const runtimeSeconds = measurement?.value?.runtime_seconds;

  if (!isPositiveFinite(runtimeSeconds)) {
    error(`${prefix}: runtime_seconds must be a positive finite number.`);
  }

  if (isFiniteNumber(runtimeSeconds) && !Number.isInteger(runtimeSeconds)) {
    error(`${prefix}: runtime_seconds must be an integer.`);
  }

  const sourceDisplayValue = measurement?.value?.source_display_value;

  if (!isNonEmptyString(sourceDisplayValue)) {
    error(`${prefix}: source_display_value is required.`);
  } else {
    const parsedSeconds = parseRuntimeDisplayValue(sourceDisplayValue);

    if (parsedSeconds === null) {
      error(
        `${prefix}: source_display_value "${sourceDisplayValue}" is not in a supported runtime format such as "22 h 11 min".`,
      );
    } else if (
      isFiniteNumber(runtimeSeconds) &&
      parsedSeconds !== runtimeSeconds
    ) {
      error(
        `${prefix}: source_display_value "${sourceDisplayValue}" equals ${parsedSeconds} seconds, but runtime_seconds is ${runtimeSeconds}.`,
      );
    }
  }

  const brightness = measurement?.conditions?.brightness_nits;

  if (brightness !== null && brightness !== undefined) {
    if (!isPositiveFinite(brightness?.value)) {
      error(`${prefix}: brightness must be positive when known.`);
    }

    if (!isNonEmptyString(brightness?.qualifier)) {
      error(`${prefix}: brightness requires a qualifier.`);
    }
  }

  const refreshHz = measurement?.conditions?.refresh_hz;

  if (
    refreshHz !== null &&
    refreshHz !== undefined &&
    !isPositiveFinite(refreshHz)
  ) {
    error(`${prefix}: refresh_hz must be positive when known.`);
  }

  const ambientTemperature =
    measurement?.conditions?.ambient_temperature_c;

  if (
    ambientTemperature !== null &&
    ambientTemperature !== undefined &&
    !isFiniteNumber(ambientTemperature)
  ) {
    error(`${prefix}: ambient_temperature_c must be finite when known.`);
  }

  if (!isNonEmptyString(measurement?.provenance?.kind)) {
    error(`${prefix}: provenance.kind is required.`);
  }

  if (!isNonEmptyString(measurement?.provenance?.provider)) {
    error(`${prefix}: provenance.provider is required.`);
  }

  if (!isNonEmptyString(measurement?.source?.id)) {
    error(`${prefix}: source.id is required.`);
  }

  if (!isNonEmptyString(measurement?.source?.url)) {
    error(`${prefix}: source.url is required.`);
  }

  const allowedRoles = new Set([
    'calibration',
    'validation',
    'reference',
  ]);

  if (!allowedRoles.has(measurement?.dataset_role)) {
    error(
      `${prefix}: dataset_role must be calibration, validation, or reference.`,
    );
  }

  const allowedEligibility = new Set([
    'eligible',
    'conditional',
    'reference_only',
    'excluded',
  ]);

  if (!allowedEligibility.has(measurement?.calibration_eligibility)) {
    error(
      `${prefix}: calibration_eligibility must be eligible, conditional, reference_only, or excluded.`,
    );
  }

  if (
    measurement?.dataset_role === 'calibration' &&
    measurement?.calibration_eligibility === 'reference_only'
  ) {
    error(
      `${prefix}: calibration records cannot be marked reference_only.`,
    );
  }

  if (
    measurement?.dataset_role === 'validation' &&
    measurement?.calibration_eligibility === 'eligible'
  ) {
    error(
      `${prefix}: held-out validation records cannot be marked eligible for calibration.`,
    );
  }
}

function validateDatasetSplitIntegrity(measurements) {
  const observationRoles = new Map();

  for (const measurement of measurements) {
    if (
      !isNonEmptyString(measurement?.device_id) ||
      !isNonEmptyString(measurement?.protocol_id) ||
      !isNonEmptyString(measurement?.metric) ||
      !isNonEmptyString(measurement?.workload_class) ||
      !isNonEmptyString(measurement?.source?.id)
    ) {
      continue;
    }

    const observationKey = [
      measurement.device_id,
      measurement.protocol_id,
      measurement.metric,
      measurement.workload_class,
      measurement.source.id,
      measurement.value?.runtime_seconds ?? 'unknown-runtime',
    ].join('|');

    const previous = observationRoles.get(observationKey);

    if (!previous) {
      observationRoles.set(observationKey, {
        id: measurement.id,
        role: measurement.dataset_role,
      });
      continue;
    }

    if (previous.role !== measurement.dataset_role) {
      error(
        `dataset split leakage: measurements "${previous.id}" and "${measurement.id}" represent the same observation but use different dataset roles "${previous.role}" and "${measurement.dataset_role}".`,
      );
    } else {
      error(
        `duplicate observation: measurements "${previous.id}" and "${measurement.id}" represent the same source observation.`,
      );
    }
  }

  const sourceRoleMap = new Map();

  for (const measurement of measurements) {
    if (
      !isNonEmptyString(measurement?.source?.id) ||
      !isNonEmptyString(measurement?.dataset_role)
    ) {
      continue;
    }

    const sourceId = measurement.source.id;

    if (!sourceRoleMap.has(sourceId)) {
      sourceRoleMap.set(sourceId, new Set());
    }

    sourceRoleMap.get(sourceId).add(measurement.dataset_role);
  }

  for (const [sourceId, roles] of sourceRoleMap.entries()) {
    if (roles.has('calibration') && roles.has('validation')) {
      warning(
        `source "${sourceId}" contributes to both calibration and validation. Review manually for possible evidence leakage.`,
      );
    }
  }
}

function validateProtocolSplitIntegrity(measurements) {
  const protocolRoles = new Map();

  for (const measurement of measurements) {
    if (
      !isNonEmptyString(measurement?.protocol_id) ||
      !isNonEmptyString(measurement?.dataset_role)
    ) {
      continue;
    }

    if (!protocolRoles.has(measurement.protocol_id)) {
      protocolRoles.set(measurement.protocol_id, new Set());
    }

    protocolRoles
      .get(measurement.protocol_id)
      .add(measurement.dataset_role);
  }

  for (const [protocolId, roles] of protocolRoles.entries()) {
    if (roles.has('calibration') && roles.has('validation')) {
      warning(
        `protocol "${protocolId}" contains both calibration and validation observations. This is allowed, but verify that the split is intentional.`,
      );
    }
  }
}

function validateNoZeroAsUnknown(value, pathParts = []) {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validateNoZeroAsUnknown(entry, [...pathParts, String(index)]),
    );
    return;
  }

  if (typeof value !== 'object') {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...pathParts, key];

    if (
      child === 0 &&
      (
        key.endsWith('_mah') ||
        key.endsWith('_wh') ||
        key.endsWith('_v') ||
        key.endsWith('_hz') ||
        key.endsWith('_inches') ||
        key.endsWith('_mm') ||
        key.endsWith('_g') ||
        key === 'runtime_seconds'
      )
    ) {
      error(
        `${nextPath.join('.')}: numeric zero is invalid here. Use null for unknown values.`,
      );
    }

    validateNoZeroAsUnknown(child, nextPath);
  }
}

function main() {
  const protocolsDocument = loadJson(FILES.protocols, 'protocols.json');
  const devicesDocument = loadJson(FILES.devices, 'devices.json');
  const measurementsDocument = loadJson(
    FILES.measurements,
    'measurements.json',
  );

  if (!protocolsDocument || !devicesDocument || !measurementsDocument) {
    printReport();
    process.exitCode = 1;
    return;
  }

  validateSchemaVersion(protocolsDocument, 'protocols.json');
  validateSchemaVersion(devicesDocument, 'devices.json');
  validateSchemaVersion(measurementsDocument, 'measurements.json');

  if (!Array.isArray(protocolsDocument.protocols)) {
    error('protocols.json: "protocols" must be an array.');
  }

  if (!Array.isArray(devicesDocument.devices)) {
    error('devices.json: "devices" must be an array.');
  }

  if (!Array.isArray(measurementsDocument.measurements)) {
    error('measurements.json: "measurements" must be an array.');
  }

  if (errors.length > 0) {
    printReport();
    process.exitCode = 1;
    return;
  }

  const protocols = protocolsDocument.protocols;
  const devices = devicesDocument.devices;
  const measurements = measurementsDocument.measurements;

  const protocolIds = validateUniqueIds(protocols, 'protocols');
  const deviceIds = validateUniqueIds(devices, 'devices');

  validateUniqueIds(measurements, 'measurements');

  const protocolById = new Map(
    protocols.map((protocol) => [protocol.id, protocol]),
  );

  protocols.forEach(validateProtocol);
  devices.forEach(validateDevice);

  measurements.forEach((measurement) =>
    validateMeasurement(
      measurement,
      deviceIds,
      protocolIds,
      protocolById,
    ),
  );

  validateDatasetSplitIntegrity(measurements);
  validateProtocolSplitIntegrity(measurements);

  validateNoZeroAsUnknown(protocolsDocument, ['protocols.json']);
  validateNoZeroAsUnknown(devicesDocument, ['devices.json']);
  validateNoZeroAsUnknown(measurementsDocument, ['measurements.json']);

  const calibrationCount = measurements.filter(
    (measurement) => measurement.dataset_role === 'calibration',
  ).length;

  const validationCount = measurements.filter(
    (measurement) => measurement.dataset_role === 'validation',
  ).length;

  const referenceCount = measurements.filter(
    (measurement) => measurement.dataset_role === 'reference',
  ).length;

  const calibrationProtocols = new Set(
    measurements
      .filter((measurement) => measurement.dataset_role === 'calibration')
      .map((measurement) => measurement.protocol_id),
  );

  const validationProtocols = new Set(
    measurements
      .filter((measurement) => measurement.dataset_role === 'validation')
      .map((measurement) => measurement.protocol_id),
  );

  if (measurements.length === 0) {
    warning('Dataset currently contains no measurements.');
  }

  if (calibrationCount === 0) {
    warning('Dataset currently contains no calibration observations.');
  }

  if (validationCount === 0) {
    warning('Dataset currently contains no held-out validation observations.');
  }

  console.log('');
  console.log('Interactive Leaks Battery Calibration Validator');
  console.log('------------------------------------------------');
  console.log(`Schema:       ${TARGET_SCHEMA_VERSION}`);
  console.log(`Protocols:    ${protocols.length}`);
  console.log(`Devices:      ${devices.length}`);
  console.log(`Measurements: ${measurements.length}`);
  console.log('');
  console.log(`Calibration:  ${calibrationCount}`);
  console.log(`Validation:   ${validationCount}`);
  console.log(`Reference:    ${referenceCount}`);
  console.log('');
  console.log(
    `Calibration protocols: ${calibrationProtocols.size}`,
  );
  console.log(
    `Validation protocols:  ${validationProtocols.size}`,
  );

  printReport();

  if (errors.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log('');
  console.log('PASS: Battery calibration dataset is valid.');
}

function printReport() {
  if (warnings.length > 0) {
    console.log('');
    console.log(`Warnings (${warnings.length})`);

    for (const message of warnings) {
      console.log(`  WARN: ${message}`);
    }
  }

  if (errors.length > 0) {
    console.error('');
    console.error(`Errors (${errors.length})`);

    for (const message of errors) {
      console.error(`  ERROR: ${message}`);
    }

    console.error('');
    console.error('FAIL: Battery calibration dataset is invalid.');
  }
}

main();
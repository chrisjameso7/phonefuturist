import type { DeviceCorpus } from './device-corpus';
import { calculateCamera, type CameraInput } from './camera';

export const CAMERA_COMPARABLE_MODEL_VERSION = 'camera-comparable-0.1.0';

export interface CameraComparableQuery extends CameraInput {
  manufacturer?: string;
  limit?: number;
}

export interface CameraComparableMatch {
  deviceVariantId: string;
  role: string;
  score: number;
  similarityScore: number;
  coverageScore: number;
  reasons: string[];
  calculated: ReturnType<typeof calculateCamera>['result'];
}

function closeness(a: number, b: number, tolerance: number) {
  const relative = Math.abs(a - b) / Math.max(Math.abs(b), 1);
  return Math.max(0, 1 - relative / tolerance);
}

function norm(v: string) {
  return v.trim().toLowerCase();
}

export function findComparableCameras(
  corpus: DeviceCorpus,
  query: CameraComparableQuery,
): CameraComparableMatch[] {
  const target = calculateCamera(query).result;
  const matches: CameraComparableMatch[] = [];

  for (const device of corpus.devices) {
    for (const camera of device.cameras ?? []) {
      const candidate = calculateCamera({
        type: (camera.role as CameraInput['type']) ?? 'other',
        sensorFormatDenominator: camera.sensorFormatDenominator,
        resolutionMp: camera.resolutionMp,
        apertureFNumber: camera.apertureFNumber,
        equivalentFocalLengthMm: camera.equivalentFocalLengthMm,
      }).result;

      let weighted = 0;
      let coveredWeight = 0;
      let possibleWeight = 3;
      const reasons: string[] = [];

      const sameRole = norm(camera.role) === norm(query.type);

      if (!sameRole) {
        continue;
      }

      weighted += 3;
      coveredWeight += 3;
      reasons.push('same camera role');

      if (target.approximateSensorAreaMm2) {
        possibleWeight += 4;
      }

      if (
        target.approximateSensorAreaMm2 &&
        candidate.approximateSensorAreaMm2
      ) {
        const s = closeness(
          candidate.approximateSensorAreaMm2,
          target.approximateSensorAreaMm2,
          0.45,
        );
        weighted += s * 4;
        coveredWeight += 4;
        if (s > 0.75) reasons.push('similar sensor area');
      }

      if (query.apertureFNumber) {
        possibleWeight += 3;
      }

      if (
        query.apertureFNumber &&
        camera.apertureFNumber
      ) {
        const s = closeness(
          camera.apertureFNumber,
          query.apertureFNumber,
          0.35,
        );
        weighted += s * 3;
        coveredWeight += 3;
        if (s > 0.8) reasons.push('similar aperture');
      }

      if (query.equivalentFocalLengthMm) {
        possibleWeight += 2;
      }

      if (
        query.equivalentFocalLengthMm &&
        camera.equivalentFocalLengthMm
      ) {
        const s = closeness(
          camera.equivalentFocalLengthMm,
          query.equivalentFocalLengthMm,
          0.4,
        );
        weighted += s * 2;
        coveredWeight += 2;
        if (s > 0.8) reasons.push('similar focal length');
      }

      if (query.resolutionMp) {
        possibleWeight += 1;
      }

      if (query.resolutionMp && camera.resolutionMp) {
        const s = closeness(camera.resolutionMp, query.resolutionMp, 0.75);
        weighted += s * 1;
        coveredWeight += 1;
        if (s > 0.8) reasons.push('similar sensor resolution');
      }

      if (query.manufacturer) {
        possibleWeight += 1;

        const sameManufacturer =
          norm(device.variant.identity.manufacturer) ===
          norm(query.manufacturer);
        weighted += (sameManufacturer ? 1 : 0) * 1;
        coveredWeight += 1;
        if (sameManufacturer) reasons.push('same manufacturer');
      }

      if (!coveredWeight || !possibleWeight) continue;

      const similarityScore = weighted / coveredWeight;
      const coverageScore = coveredWeight / possibleWeight;
      const score =
        similarityScore * Math.sqrt(coverageScore);

      if (coverageScore < 0.999) {
        reasons.push(
          `spec coverage ${Math.round(coverageScore * 100)}%`,
        );
      }

      matches.push({
        deviceVariantId: device.variant.id,
        role: camera.role,
        score,
        similarityScore,
        coverageScore,
        reasons,
        calculated: candidate,
      });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, query.limit ?? 8));
}

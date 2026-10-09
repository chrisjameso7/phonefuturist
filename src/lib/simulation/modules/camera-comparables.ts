import type { DeviceCorpus } from './device-corpus';
import { calculateCamera, type CameraInput } from './camera';

export const CAMERA_COMPARABLE_MODEL_VERSION = 'camera-comparable-0.2.0';

export type CameraComparableProfile =
  | 'generic'
  | 'photo-detail'
  | 'capture-timing'
  | 'video-stabilization';

export interface CameraComparableQuery extends CameraInput {
  manufacturer?: string;
  profile?: CameraComparableProfile;
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


function weightsForProfile(
  profile: CameraComparableProfile | undefined,
) {
  switch (profile ?? 'generic') {
    case 'photo-detail':
      return {
        role: 3,
        sensorArea: 5,
        aperture: 2,
        focalLength: 1,
        resolution: 3,
        manufacturer: 1,
      };
    case 'capture-timing':
      return {
        role: 3,
        sensorArea: 2,
        aperture: 1,
        focalLength: 1,
        resolution: 0.5,
        manufacturer: 3,
      };
    case 'video-stabilization':
      return {
        role: 3,
        sensorArea: 2,
        aperture: 1,
        focalLength: 3,
        resolution: 0.5,
        manufacturer: 3,
      };
    case 'generic':
      return {
        role: 3,
        sensorArea: 4,
        aperture: 3,
        focalLength: 2,
        resolution: 1,
        manufacturer: 1,
      };
  }
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
  const weights = weightsForProfile(query.profile);
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
      let possibleWeight = weights.role;
      const reasons: string[] = [];

      const sameRole = norm(camera.role) === norm(query.type);

      if (!sameRole) {
        continue;
      }

      weighted += weights.role;
      coveredWeight += weights.role;
      reasons.push('same camera role');

      let opticalEvidenceWeight = 0;

      if (target.approximateSensorAreaMm2) {
        possibleWeight += weights.sensorArea;
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
        weighted += s * weights.sensorArea;
        coveredWeight += weights.sensorArea;
        opticalEvidenceWeight += weights.sensorArea;
        if (s > 0.75) reasons.push('similar sensor area');
      }

      if (query.apertureFNumber) {
        possibleWeight += weights.aperture;
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
        weighted += s * weights.aperture;
        coveredWeight += weights.aperture;
        opticalEvidenceWeight += weights.aperture;
        if (s > 0.8) reasons.push('similar aperture');
      }

      if (query.equivalentFocalLengthMm) {
        possibleWeight += weights.focalLength;
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
        weighted += s * weights.focalLength;
        coveredWeight += weights.focalLength;
        opticalEvidenceWeight += weights.focalLength;
        if (s > 0.8) reasons.push('similar focal length');
      }

      if (query.resolutionMp) {
        possibleWeight += weights.resolution;
      }

      if (query.resolutionMp && camera.resolutionMp) {
        const s = closeness(camera.resolutionMp, query.resolutionMp, 0.75);
        weighted += s * weights.resolution;
        coveredWeight += weights.resolution;
        opticalEvidenceWeight += weights.resolution;
        if (s > 0.8) reasons.push('similar sensor resolution');
      }

      if (query.manufacturer) {
        possibleWeight += weights.manufacturer;

        const sameManufacturer =
          norm(device.variant.identity.manufacturer) ===
          norm(query.manufacturer);
        weighted +=
          (sameManufacturer ? 1 : 0) *
          weights.manufacturer;
        coveredWeight += weights.manufacturer;
        if (sameManufacturer) reasons.push('same manufacturer');
      }

      if (
        !coveredWeight ||
        !possibleWeight ||
        opticalEvidenceWeight <= 0
      ) {
        continue;
      }

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

import {
  buildExpandedDeviceCatalog,
} from './expanded-device-catalog';
import {
  findDeviceByName,
  type DeviceLookupMatch,
} from './device-lookup';

export const EXPANDED_DEVICE_LOOKUP_VERSION =
  'expanded-device-lookup-0.1.0';

let cachedCatalog:
  ReturnType<
    typeof buildExpandedDeviceCatalog
  > | undefined;

function catalog() {
  cachedCatalog ??=
    buildExpandedDeviceCatalog();

  return cachedCatalog;
}

export function findExpandedDevicesByName(
  query: string,
  limit = 8,
): DeviceLookupMatch[] {
  return findDeviceByName(
    catalog(),
    query,
    limit,
  );
}

export function clearExpandedDeviceLookupCache() {
  cachedCatalog = undefined;
}

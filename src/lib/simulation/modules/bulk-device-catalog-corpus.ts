import type {
  DeviceCorpus,
} from './device-corpus';
import {
  buildTechApiDeviceCatalog,
} from './techapi-device-catalog';

/**
 * Compatibility alias for the abandoned first bulk-catalog implementation.
 *
 * The canonical bulk catalog is now the generated TechAPI snapshot. Keeping
 * this function prevents stale imports from breaking builds while ensuring
 * there is only one source of truth for bulk catalog data.
 */
export function buildBulkDeviceCatalogCorpus(): DeviceCorpus {
  return buildTechApiDeviceCatalog();
}

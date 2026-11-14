/**
 * Build a Phone — everything the studio UI needs, behind one module so the
 * whole feature can be loaded on demand when a visitor opens the inside of
 * the phone. Nothing here imports Three.js; the renderer loads separately.
 */
export * from './schema';
export { SOURCES } from './sources';
export { COMPONENTS, COMPONENT_LIST, componentsOfKind } from './catalog';
export { ARCHITECTURES, DEFAULT_ARCHITECTURE, SLOTS, SLOT_BY_ID, type Architecture } from './architectures';
export * from './assembly';
export * from './view-options';
export * from './inspect';

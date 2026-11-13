import { normalizeDesign, type DeviceDesign } from './device-design';

/**
 * Rear camera island and lens positions in chassis millimetres (origin at the
 * chassis centre, +x right and +y up when looking at the rear).
 *
 * Extracted from device-mesh so the exterior mesh and the internal Build a
 * Phone assembly place camera hardware from one calculation.
 */
export type RearCameraLayout = {
  family: NonNullable<DeviceDesign['family']>;
  circular: boolean; horizontal: boolean;
  islandWidth: number; islandHeight: number; cx: number; cy: number;
  positions: Array<[number, number]>;
  /** Lens ring radius after spacing, island and chassis-edge clamps. */
  radius: number;
  /** Rear flash position, clear of every lens. */
  flash: [number, number];
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function rearCameraLayout(raw: DeviceDesign): RearCameraLayout {
  const c = normalizeDesign(raw), { width: w, height: h } = c;
  const count = c.cameraCount!, family = c.family!;
  const margin = 4, islandW = Math.min(c.cameraWidth!, w - margin * 2), islandH = Math.min(c.cameraHeight!, h * .45);
  const circular = family === 'halo' || (!raw.family && c.camera === 'circle');
  const horizontal = family === 'duo';
  const islandWidth = horizontal ? islandW : circular ? Math.min(w - 8, islandW) : islandW;
  const islandHeight = horizontal ? Math.min(islandH, w * .5) : circular ? islandWidth : islandH;
  const baseX = horizontal || circular ? 0 : -w / 2 + margin + islandWidth / 2;
  const cx = clamp(baseX + (c.cameraX ?? 0), -w / 2 + margin + islandWidth / 2, w / 2 - margin - islandWidth / 2);
  const cy = clamp(h / 2 - margin - islandHeight / 2 + (c.cameraY ?? 0), -h / 2 + margin + islandHeight / 2, h / 2 - margin - islandHeight / 2);
  let positions: Array<[number, number]>;
  if (horizontal) positions = Array.from({ length: count }, (_, i) => [cx + (i - (count - 1) / 2) * (islandWidth - 10) / Math.max(count, 1), cy]);
  else if (circular) positions = count === 1 ? [[cx, cy]] : Array.from({ length: count }, (_, i) => [cx + Math.cos(i * Math.PI * 2 / count - Math.PI / 2) * islandWidth * .24, cy + Math.sin(i * Math.PI * 2 / count - Math.PI / 2) * islandWidth * .24]);
  else if (family === 'column' || family === 'stealth') positions = Array.from({ length: count }, (_, i) => i < 3 ? [cx, cy + (1 - i) * islandHeight * .32] : [cx + islandWidth * .95, cy - islandHeight * .12]);
  else if (family === 'dot') positions = ([[-.27, .3], [-.27, -.03], [.24, -.15], [.24, -.42]] as Array<[number, number]>).slice(0, count).map(([x, y]) => [cx + x * islandWidth, cy + y * islandHeight]);
  else positions = ([[-.29, .23], [-.29, -.23], [-.02, 0], [.25, -.2]] as Array<[number, number]>).slice(0, count).map(([x, y]) => [cx + x * islandWidth, cy + y * islandHeight]);
  let separation = Infinity;
  for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) separation = Math.min(separation, Math.hypot(positions[i][0] - positions[j][0], positions[i][1] - positions[j][1]));
  const edgeDistance = Math.min(...positions.map(([x, y]) => Math.min(w / 2 - Math.abs(x), h / 2 - Math.abs(y))));
  const radius = Math.max(1.5, Math.min(c.lensDiameter! / 2, (separation - c.lensSpacing!) / 2, edgeDistance - 1, islandHeight * .3, islandWidth * .3));
  const flashCandidates: Array<[number, number]> = horizontal ? [[cx + islandWidth * .4, cy], [w / 2 - 4, h / 2 - 5]] : [[w / 2 - 4, h / 2 - 5], [-w / 2 + 4, h / 2 - 5], [w / 2 - 4, h * .2]];
  const flash = flashCandidates.find(([x, y]) => positions.every(([px, py]) => Math.hypot(x - px, y - py) > radius + 2.5)) ?? flashCandidates[0];
  return { family, circular, horizontal, islandWidth, islandHeight, cx, cy, positions, radius, flash };
}

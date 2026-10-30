import type { Wallpaper } from './wallpaper-options';
import type { FrameFinish, BackFinish, FrontFinish } from './device-finishes';
export type DeviceMaterial = 'titanium' | 'ceramic' | 'glass' | 'steel';
export type CameraLayout = 'triple' | 'periscope' | 'circle';
export const DESIGN_FAMILIES = {
  plateau: 'Plateau', column: 'Precision', dot: 'Dot', duo: 'Duo', stealth: 'Stealth', halo: 'Halo',
} as const;
export type DesignFamily = keyof typeof DESIGN_FAMILIES;
export type HardwareKind = 'phone' | 'tablet' | 'laptop' | 'book_foldable' | 'flip_foldable';
export type DeviceDesign = {
  wallpaper?: Wallpaper;
  name: string; width: number; height: number; thickness: number; bezel: number;
  material: DeviceMaterial; color: string; camera: CameraLayout;
  family?: DesignFamily; cameraCount?: number; cornerRadius?: number; lensDiameter?: number;
  lensSpacing?: number; cameraWidth?: number; cameraHeight?: number; protrusion?: number; lighting?: boolean;
  cameraX?: number; cameraY?: number;
  displayWidth?: number; displayHeight?: number; kind?: HardwareKind; hingeAngle?: number;
  coverDisplayWidth?: number; coverDisplayHeight?: number;
  selfieDiameter?: number; selfieStyle?: 'punch' | 'pill' | 'none'; frameProfile?: 'flat' | 'rounded';
  usbC?: boolean; speakers?: 'none' | 'bottom' | 'stereo'; antenna?: boolean;
  frameFinish?: FrameFinish; backFinish?: BackFinish; frontFinish?: FrontFinish;
};
export const DEVICE_MATERIALS: Record<DeviceMaterial, string> = {
  titanium: 'Titanium Grade 5', ceramic: 'Matte ceramic', glass: 'Anti-glare glass', steel: 'Polished stainless steel',
};
export const CAMERA_LAYOUTS: Record<CameraLayout, string> = {
  triple: 'Round-lens array', periscope: 'Periscope zoom', circle: '1-inch circular housing',
};
export const DESIGN_LIMITS = { width: [58, 90], height: [130, 185], thickness: [6, 13], bezel: [.8, 3] } as const;
export const DEFAULT_DESIGN: DeviceDesign = {
  name: 'My PhoneFuturist concept', width: 76, height: 163, thickness: 8.5, bezel: 1.4,
  material: 'titanium', color: '#68717d', camera: 'triple',
};
export function normalizeDesign(input: DeviceDesign): DeviceDesign {
  const result = { ...input };
  for (const key of ['width', 'height', 'thickness', 'bezel'] as const) {
    const [min, max] = input.kind && input.kind !== 'phone' ? (key === 'bezel' ? [.5, 30] : key === 'thickness' ? [1, 50] : [30, 600]) : DESIGN_LIMITS[key];
    result[key] = Number.isFinite(input[key]) ? Math.min(max, Math.max(min, input[key])) : DEFAULT_DESIGN[key];
  }
  result.material = Object.hasOwn(DEVICE_MATERIALS, input.material) ? input.material : DEFAULT_DESIGN.material;
  result.camera = Object.hasOwn(CAMERA_LAYOUTS, input.camera) ? input.camera : DEFAULT_DESIGN.camera;
  result.color = /^#[\da-f]{6}$/i.test(input.color) ? input.color : DEFAULT_DESIGN.color;
  result.name = String(input.name || 'Untitled concept').slice(0, 80);
  result.family = input.family && Object.hasOwn(DESIGN_FAMILIES, input.family) ? input.family : 'plateau';
  result.cameraCount = result.family==='duo'?2:Math.max(1, Math.min(4, Math.round(input.cameraCount ?? (input.camera === 'circle' && !input.family ? 1 : 3))));
  result.cornerRadius = Math.max(1, Math.min(input.cornerRadius ?? (result.family === 'stealth' ? 3 : result.family === 'plateau' ? 12 : 7), Math.min(result.width, result.height) / 4));
  result.lensDiameter = Math.max(3, Math.min(18, input.lensDiameter ?? 12));
  result.lensSpacing = Math.max(1, Math.min(10, input.lensSpacing ?? 3));
  result.cameraWidth = Math.max(18, Math.min(result.width - 8, input.cameraWidth ?? 38));
  result.cameraHeight = Math.max(18, Math.min(result.family==='duo'?Math.min(result.width*.5,result.height*.45):result.height * .45, input.cameraHeight ?? 48));
  result.protrusion = Math.max(.5, Math.min(6, input.protrusion ?? 3));
  return result;
}
export const DEVICE_PRESETS = {
  compact: { width: 69, height: 145, thickness: 8, bezel: 1.4 },
  ultra: { width: 79, height: 169, thickness: 9, bezel: 1.2 },
} as const;

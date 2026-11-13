import {normalizeDesign,DEFAULT_DESIGN,DEVICE_MATERIALS,CAMERA_LAYOUTS,DESIGN_FAMILIES,type DeviceDesign} from '../labs/device-design';
import {FRAME_FINISHES,BACK_FINISHES,FRONT_FINISHES} from '../labs/device-finishes';
import {WALLPAPERS} from '../labs/wallpaper-options';
export function communityDesign(value:unknown):DeviceDesign{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid design.');
 const source=value as Record<string,unknown>;const out:Record<string,unknown>={...DEFAULT_DESIGN};
 for(const key of ['width','height','thickness','bezel','cameraCount','cornerRadius','lensDiameter','lensSpacing','cameraWidth','cameraHeight','protrusion','cameraX','cameraY','displayWidth','displayHeight','hingeAngle','coverDisplayWidth','coverDisplayHeight','selfieDiameter']){
  const n=source[key];if(n===undefined)continue;if(typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>1000)throw new Error('Invalid design dimensions.');out[key]=n;
 }
 for(const [key,options] of Object.entries({material:DEVICE_MATERIALS,camera:CAMERA_LAYOUTS,family:DESIGN_FAMILIES,frameFinish:FRAME_FINISHES,backFinish:BACK_FINISHES,frontFinish:FRONT_FINISHES,wallpaper:WALLPAPERS,kind:{phone:1,tablet:1,laptop:1,book_foldable:1,flip_foldable:1},selfieStyle:{punch:1,pill:1,none:1},frameProfile:{flat:1,rounded:1},speakers:{none:1,bottom:1,stereo:1}})){
  const item=source[key];if(item===undefined)continue;if(typeof item!=='string'||!Object.hasOwn(options,item))throw new Error('Invalid design finish.');out[key]=item;
 }
 for(const key of ['usbC','antenna','lighting'])if(typeof source[key]==='boolean')out[key]=source[key];
 if(typeof source.name==='string')out.name=source.name.slice(0,80);if(typeof source.color==='string'&&/^#[a-f0-9]{6}$/i.test(source.color))out.color=source.color;
 return normalizeDesign(out as DeviceDesign);
}
export async function communityJson(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('Use JSON.');
 const reader=request.body?.getReader();if(!reader)throw new Error('Missing body.');const chunks:Uint8Array[]=[];let size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>350000){await reader.cancel();throw new Error('Build is too large.');}chunks.push(part.value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return JSON.parse(new TextDecoder().decode(bytes));
}

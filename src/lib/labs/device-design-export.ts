import { BACK_FINISHES,FRAME_FINISHES,FRONT_FINISHES } from './device-finishes';
import { CAMERA_LAYOUTS,DESIGN_FAMILIES,normalizeDesign,type DeviceDesign } from './device-design';
import { WALLPAPERS } from './wallpaper-options';
export function designCardRows(raw:DeviceDesign){
 const d=normalizeDesign(raw),w=d.displayWidth??d.width-2*d.bezel,h=d.displayHeight??d.height-2*d.bezel;
 const mm=(n:number)=>`${Number(n.toFixed(2))} mm`;
 return [['Chassis · height × width × depth',`${d.height} × ${d.width} × ${d.thickness} mm`],['Display · width × height',`${Number(w.toFixed(2))} × ${Number(h.toFixed(2))} mm`],['Bezel',mm(d.bezel)],['Camera island depth',mm(d.protrusion??3)],['Rear camera lenses',String(d.cameraCount??3)],['Lens diameter',mm(d.lensDiameter??12)],['Side frame',FRAME_FINISHES[d.frameFinish??'brushedTitanium'].label],['Rear surface',BACK_FINISHES[d.backFinish??'titanium'].label],['Front glass',FRONT_FINISHES[d.frontFinish??'antiReflective'].label],['Wallpaper',WALLPAPERS[d.wallpaper??'none']],['Camera module',CAMERA_LAYOUTS[d.camera]],['Design family',DESIGN_FAMILIES[d.family??'plateau']]];
}
export async function downloadDesignCard(design:DeviceDesign,images:string[]){
 if(images.length!==2)throw new Error('Both device views are required');
 const views=await Promise.all(images.map(src=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not prepare design views'));image.src=src;})));
 const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1680;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image export unavailable');
 ctx.fillStyle='#0c1523';ctx.fillRect(0,0,1600,1680);ctx.fillStyle='#75e4d1';ctx.font='bold 28px sans-serif';ctx.fillText('PhoneFuturist / DEVICE DESIGN',64,70);
 ctx.fillStyle='#f0f5fa';ctx.font='bold 40px sans-serif';
 const name=design.name||'Untitled concept',words=name.split(/\s+/);let line='',y=130;
 for(const word of words){if(ctx.measureText(line+word).width>1460){ctx.fillText(line,64,y);line='';y+=48;}line+=word+' ';}ctx.fillText(line,64,y);
 views.forEach((image,i)=>{const scale=Math.min(720/image.width,690/image.height),w=image.width*scale,h=image.height*scale;ctx.drawImage(image,40+i*800+(720-w)/2,220+(690-h)/2,w,h);ctx.font='24px sans-serif';ctx.fillStyle='#c3d2df';ctx.fillText(i===0?'FRONT':'REAR',64+i*800,950);});
 designCardRows(design).forEach(([label,value],i)=>{const x=64+(i%2)*800,y=1020+Math.floor(i/2)*96;ctx.font='22px sans-serif';ctx.fillStyle='#9aafc3';ctx.fillText(label,x,y);ctx.font='bold 25px sans-serif';ctx.fillStyle='#f0f5fa';ctx.fillText(value,x,y+36);});
 ctx.font='20px sans-serif';ctx.fillStyle='#9aafc3';ctx.fillText('Concept design · Dimensions in millimetres',64,1640);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not create design card')),'image/png'));
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${name.replace(/[^a-z0-9]+/gi,'-').slice(0,60)||'device'}-design.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

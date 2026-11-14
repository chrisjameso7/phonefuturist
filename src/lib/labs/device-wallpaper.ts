import * as THREE from 'three';
import type { Wallpaper } from './wallpaper-options';
/** Original procedural artwork, rendered locally without remote image requests. */
export function wallpaperTexture(style: Wallpaper) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=1024;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Wallpaper canvas unavailable');
  const colors={none:['#101923','#101923','#101923'],aurora:['#071b37','#136b75','#9be7c4'],dusk:['#271c55','#bd617b','#ffc997'],ocean:['#052947','#087a9f','#8cdce0'],graphite:['#080b12','#344052','#a1adbd']}[style];
  const bg=ctx.createLinearGradient(0,0,512,1024);colors.forEach((c,i)=>bg.addColorStop(i/2,c));ctx.fillStyle=bg;ctx.fillRect(0,0,512,1024);
  for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(-80,430+i*110);ctx.bezierCurveTo(150,180+i*130,280,850-i*70,620,400+i*130);ctx.lineTo(620,1100);ctx.lineTo(-80,1100);ctx.closePath();ctx.fillStyle=colors[i%3]+(i%2?'66':'99');ctx.fill();}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function screenUV(geometry:THREE.BufferGeometry,w:number,h:number,frontNegative=true){
  const p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  for(let i=0;i<p.count;i++)uv.setXY(i,.5+(frontNegative?-1:1)*p.getX(i)/w,.5+p.getY(i)/h);
  uv.needsUpdate=true;return geometry;
}
export function wallpaperMaterial(material:THREE.MeshPhysicalMaterial){
  let current:Wallpaper='none',texture:THREE.CanvasTexture|null=null;
  return {update(style:Wallpaper='none'){
    if(style===current)return;current=style;texture?.dispose();texture=style==='none'?null:wallpaperTexture(style);
    material.map=material.emissiveMap=texture;material.color.set(texture?'#ffffff':'#113449');material.emissive.set(texture?'#ffffff':'#082d3b');material.emissiveIntensity=texture ? .85 : .6;material.needsUpdate=true;
  },dispose(){texture?.dispose();}};
}

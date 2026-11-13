import { wallpaperMaterial,screenUV } from './device-wallpaper';
import * as THREE from 'three';
import { normalizeDesign, type DeviceDesign } from './device-design';
import { rearCameraLayout } from './camera-layout';
import { BACK_FINISHES, FRAME_FINISHES, FRONT_FINISHES } from './device-finishes';

/** Flat, uniformly rounded face; extrusion bevel stays independent of the corner radius. */
export function slab(width: number, height: number, depth: number, radius: number, bevel = .25, corners?: [number,number,number,number]) {
  bevel=Math.min(bevel,depth*.24);
  const w = width / 2 - bevel, h = height / 2 - bevel, r = Math.min(radius, w, h);
  const [bl,br,tr,tl]=(corners??[r,r,r,r]).map(n=>Math.max(0,Math.min(n,w,h)));
  const shape = new THREE.Shape();
  shape.moveTo(-w + bl, -h); shape.lineTo(w - br, -h);
  shape.quadraticCurveTo(w, -h, w, -h + br); shape.lineTo(w, h - tr);
  shape.quadraticCurveTo(w, h, w - tr, h); shape.lineTo(-w + tl, h);
  shape.quadraticCurveTo(-w, h, -w, h - tl); shape.lineTo(-w, -h + bl);
  shape.quadraticCurveTo(-w, -h, -w + bl, -h);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(.01, depth - 2 * bevel), bevelEnabled: bevel > 0,
    bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, steps: 1, curveSegments: 10 });
  geometry.translate(0, 0, -depth / 2 + bevel);
  return geometry;
}

/** Reuses the publication's PF loop path as raised, original-brand geometry. */
export function addDeviceBrand(parent: THREE.Group, material: THREE.Material, y: number, z: number, size = 18) {
  const logo = new THREE.Group(); logo.name = 'phonefuturist-logo';
  const sections = [
    [35,56,19,56,9,45,9,33], [9,33,9,20,19,10,34,10], [34,10,47,10,58,17,69,30],
    [69,30,82,45,91,60,111,60], [111,60,128,60,151,49,151,32],
    [151,32,151,17,139,8,124,8], [124,8,109,8,98,15,86,29],
    [86,29,74,43,64,56,43,56], [43,56,40,56,38,56,35,56],
  ];
  const point = (x: number, py: number) => new THREE.Vector3((x - 80) * size / 160, (36 - py) * size / 160, 0);
  for (const p of sections) {
    const curve = new THREE.CubicBezierCurve3(point(p[0],p[1]), point(p[2],p[3]), point(p[4],p[5]), point(p[6],p[7]));
    logo.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, size / 90, 5, false), material));
  }
  for(const p of [[67,34,85,34],[85,34,74,48]])logo.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(point(p[0],p[1]),point(p[2],p[3])),1,size/80,5,false),material));
  logo.position.set(0, y, z); parent.add(logo); return logo;
}

export function createDeviceModel(initial: DeviceDesign) {
  const group = new THREE.Group(); group.name = 'device';
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const i = (y * 64 + x) * 4;
    pixels[i] = 128; pixels[i + 1] = 128 + Math.round(Math.sin(x * 2.7) * 6); pixels[i + 2] = 254; pixels[i + 3] = 255;
  }
  const brush = new THREE.DataTexture(pixels, 64, 64); brush.wrapS = brush.wrapT = THREE.RepeatWrapping;
  brush.magFilter = brush.minFilter = THREE.LinearFilter; brush.repeat.set(5, 18); brush.needsUpdate = true;
  const finish = new THREE.MeshPhysicalMaterial();
  const frame = new THREE.MeshPhysicalMaterial({ metalness: .9, roughness: .28 });
  const black = new THREE.MeshStandardMaterial({ color: '#080b10', roughness: .65, metalness: 0 });
  const lens = new THREE.MeshPhysicalMaterial({ color: '#000000', roughness: .38, metalness: 0, clearcoat: 0, envMapIntensity: .1 });
  const cameraBlack = new THREE.MeshBasicMaterial({color:'#000000'});
  const screen = new THREE.MeshPhysicalMaterial({ color: '#112837', roughness: .35, metalness: .1, emissive: '#082d3b', emissiveIntensity: .6 });
  const accent = new THREE.MeshStandardMaterial({ color: '#9fb6c9', roughness: .5, metalness: .4 });
  const glow = new THREE.MeshStandardMaterial({ color: '#75e4d1', emissive: '#75e4d1', emissiveIntensity: 1 });
  const wallpaper=wallpaperMaterial(screen);
  const materials = [finish, frame, black, lens, cameraBlack, screen, accent, glow];
  let previous = '';
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, name: string, x = 0, y = 0, z = 0) {
    const node = new THREE.Mesh(geometry, material); node.name = name; node.position.set(x, y, z);
    node.castShadow = node.receiveShadow = true; group.add(node); return node;
  }
  function clearGeometry() {
    group.traverse(child => { if (child instanceof THREE.Mesh) child.geometry.dispose(); });
    group.clear();
  }
  function update(raw: DeviceDesign) {
    const c = normalizeDesign(raw);
    finish.color.set(c.color); frame.color.set(c.color);
    const properties = {
      titanium: { metalness: .9, roughness: .3, clearcoat: .1, envMapIntensity: 1.1 },
      ceramic: { metalness: 0, roughness: .78, clearcoat: .08, envMapIntensity: .6 },
      glass: { metalness: 0, roughness: .85, clearcoat: .12, envMapIntensity: .6 },
      steel: { metalness: 1, roughness: .09, clearcoat: .35, envMapIntensity: 1.5 },
    }[c.material];
    finish.setValues(properties); frame.roughness = c.material === 'steel' ? .09 : .3;
    if (c.backFinish && BACK_FINISHES[c.backFinish]) { const { label: _label, ...p } = BACK_FINISHES[c.backFinish]; finish.setValues(p); }
    if (c.frameFinish && FRAME_FINISHES[c.frameFinish]) { const { label: _label, ...p } = FRAME_FINISHES[c.frameFinish]; frame.setValues(p); }
    if (c.frontFinish && FRONT_FINISHES[c.frontFinish]) { const { label: _label, ...p } = FRONT_FINISHES[c.frontFinish]; screen.setValues(p); }
    const normalMap = (c.backFinish ? c.backFinish === 'titanium' : c.material === 'titanium') ? brush : null;
    if (finish.normalMap !== normalMap) { finish.normalMap = normalMap; finish.needsUpdate = true; }
    finish.normalScale.set(.06, .06);
    const frameMap = c.frameFinish === 'brushedTitanium' ? brush : null;
    if (frame.normalMap !== frameMap) { frame.normalMap = frameMap; frame.needsUpdate = true; }
    frame.normalScale.set(.08,.08);
    wallpaper.update(c.wallpaper);
    const signature = [c.width, c.height, c.thickness, c.bezel, c.camera, c.family, c.cameraCount, c.cornerRadius, c.lensDiameter, c.lensSpacing, c.cameraWidth, c.cameraHeight, c.protrusion, c.lighting, c.displayWidth, c.displayHeight, c.usbC, c.speakers, c.antenna, c.selfieDiameter, c.selfieStyle, c.frameProfile, c.cameraX, c.cameraY].join(':');
    if (signature === previous) return;
    previous = signature; clearGeometry();
    const { width: w, height: h, thickness: t, bezel: b } = c;
    const r = c.cornerRadius!;
    mesh(slab(w, h, t, r, c.frameProfile === 'rounded' ? Math.min(1,t*.15) : .25), frame, 'chassis');
    mesh(slab(w - .8, h - .8, .5, r - .4, .1), finish, 'back', 0, 0, t / 2 + .05);
    mesh(slab(w - .6, h - .6, .35, r - .3, .1), black, 'front-bezel', 0, 0, -t / 2 - .06);
    const dw = c.displayWidth ?? w - 2*b, dh = c.displayHeight ?? h - 2*b;
    if (dw > 0 && dh > 0 && dw <= w - 1 && dh <= h - 1)
      mesh(screenUV(slab(dw, dh, .18, Math.max(1, Math.min(r - b, dw/8, dh/8)), .03),dw,dh), screen, 'flat-display', 0, 0, -t / 2 - .25);
    addDeviceBrand(group, accent, -h * .34, t/2 + .5, Math.min(20,w*.3));
    const selfie=c.selfieDiameter??2.8;
    if(c.selfieStyle!=='none'&&selfie>0&&dw>selfie*3&&dh>selfie*3){
      const opening=mesh(slab(c.selfieStyle==='pill'?selfie*2.2:selfie,selfie,.15,selfie/2,.01),black,'selfie-camera',0,dh/2-selfie*1.2,-t/2-.4);
      opening.userData.diameter=selfie;
    }
    mesh(slab(1.3, 15, t * .55, .5, .1), frame, 'power-button', w / 2 + .4, h * .12);
    mesh(slab(1.3, 25, t * .55, .5, .1), frame, 'volume-rocker', -w / 2 - .4, h * .2);
    const protrusion = c.protrusion!, rearSurface=t/2+.3, backZ = rearSurface + protrusion/2, islandTop=rearSurface+protrusion;
    const camLayout = rearCameraLayout(raw), { family, circular, horizontal, islandWidth, islandHeight, cx, cy, positions, radius } = camLayout;
    const count = positions.length;
    if (circular) {
      const housing = mesh(new THREE.CylinderGeometry(islandWidth/2,islandWidth/2,protrusion,64),frame,'circular-housing',cx,cy,backZ);
      housing.rotation.x=Math.PI/2;
      const face=mesh(new THREE.CylinderGeometry(islandWidth/2-.7,islandWidth/2-.7,.12,64),cameraBlack,'camera-island-inlay',cx,cy,islandTop-.02);face.rotation.x=Math.PI/2;
    } else if (family !== 'dot') {
      mesh(slab(islandWidth,islandHeight,protrusion,family==='stealth'?2:family==='duo'?islandHeight/2:8),horizontal?frame:finish,horizontal?'camera-bar':'camera-island',cx,cy,backZ);
      if(horizontal)mesh(slab(islandWidth-1.4,islandHeight-1.4,.12,(islandHeight-1.4)/2,.02),cameraBlack,'camera-island-inlay',cx,cy,islandTop-.02);
    }
    // Duo and Halo use an uninterrupted opaque black camera window.
    if(family!=='duo'&&family!=='halo')positions.forEach(([x,y],i)=>{
      const periscope=c.camera==='periscope'&&i===count-1&&count>1;
      if(periscope){mesh(slab(radius*2,radius*2,.5,1,.1),frame,'periscope-block',x,y,islandTop+.25);mesh(slab(radius*1.5,radius*1.5,.12,.6,.03),lens,'periscope-glass',x,y,islandTop+.56);}
      else {
        const ring=mesh(new THREE.CylinderGeometry(radius,radius,.5,40),frame,'lens-ring',x,y,islandTop+.25);ring.rotation.x=Math.PI/2;
        const glass=mesh(new THREE.CylinderGeometry(radius*.8,radius*.8,.12,40),lens,'camera-lens',x,y,islandTop+.56);glass.rotation.x=Math.PI/2;
        const pupil=mesh(new THREE.CylinderGeometry(radius*.28,radius*.28,.04,24),lens,'lens-aperture',x,y,islandTop+.64);pupil.rotation.x=Math.PI/2;
      }
    });
    const [flashX,flashY]=camLayout.flash;
    const flash=mesh(new THREE.CylinderGeometry(1.5,1.5,.4,20),accent,'flash',flashX,flashY,t/2+.5);flash.rotation.x=Math.PI/2;
    if(family==='stealth'){
      const fan=mesh(new THREE.CylinderGeometry(8,8,.4,32),black,'cooling-fan',-w*.2,-h*.05,t/2+.5);fan.rotation.x=Math.PI/2;
      for(let i=0;i<6;i++){const blade=mesh(slab(1,10,.2,.3,.03),c.lighting?glow:accent,'fan-vane',-w*.2,-h*.05,t/2+.8);blade.rotation.z=i*Math.PI/3;}
      mesh(slab(2,h*.28,.3,.6,.05),c.lighting?glow:accent,'performance-rail',w*.28,-h*.14,t/2+.6);
      for(let i=0;i<5;i++)mesh(slab(.4,2,t*.4,.2,.04),black,'cooling-vent',w/2+.08,h*.2-i*3,0);
    }
    if(family==='dot'){
      const matrixCandidates:Array<[number,number]>=[[w*.28,h/2-13],[-w*.28,h/2-13],[w*.28,-h*.2],[-w*.28,-h*.2]];
      const [mx,my]=matrixCandidates.find(([x,y])=>positions.every(([px,py])=>Math.hypot(x-px,y-py)>radius+8.5)&&Math.hypot(x-flashX,y-flashY)>10)??matrixCandidates[2];
      const matrix=mesh(new THREE.CylinderGeometry(7,7,.3,40),black,'dot-display',mx,my,t/2+.5);matrix.rotation.x=Math.PI/2;
      for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++)if(Math.hypot(row,col)<=2.7){const dot=mesh(new THREE.CylinderGeometry(.35,.35,.15,8),c.lighting?glow:accent,'display-dot',mx+col*1.7,my+row*1.7,t/2+.75);dot.rotation.x=Math.PI/2;}
      mesh(slab(w*.7,.4,.2,.1,.03),accent,'rear-panel-seam',0,-h*.1,t/2+.4);
    }
    if(c.usbC!==false){const port=mesh(slab(9,2.8,.3,1,.05),black,'usb-c-port',0,-h/2-.05,0);port.rotation.x=Math.PI/2;}
    if(c.speakers!=='none')for(const side of [-1,1])for(let i=0;i<5;i++){
      mesh(new THREE.CylinderGeometry(.55,.55,.3,12),black,'speaker-grille',side*(8+i*1.8),-h/2-.06,0);
      if(c.speakers==='stereo')mesh(new THREE.CylinderGeometry(.55,.55,.3,12),black,'upper-speaker',side*(8+i*1.8),h/2+.06,0);
    }
    if(c.antenna!==false)for(const side of [-1,1])for(const end of [-1,1])mesh(slab(.5,1.3,t+.1,.2,.05),black,'antenna-cutout',side*(w/2),end*h*.32,0);

  }
  update(initial);
  return { group, update, finish, dispose() { clearGeometry(); for (const material of materials) material.dispose(); brush.dispose(); wallpaper.dispose(); } };
}

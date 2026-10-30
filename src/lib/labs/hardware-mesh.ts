import * as THREE from 'three';
import { createDeviceModel, slab, addDeviceBrand } from './device-mesh';
import { FRAME_FINISHES,BACK_FINISHES,FRONT_FINISHES } from './device-finishes';
import { normalizeDesign, type DeviceDesign } from './device-design';

/** Larger devices have real lids or hinge panels, rather than scaling a phone silhouette. */
export function createHardwareModel(initial: DeviceDesign) {
  const group=new THREE.Group(); let phone:ReturnType<typeof createDeviceModel>|null=null;
  const body=new THREE.MeshPhysicalMaterial({color:'#68717d',metalness:.8,roughness:.4});
  const rear=new THREE.MeshPhysicalMaterial({color:'#68717d',metalness:.3,roughness:.65});
  const dark=new THREE.MeshStandardMaterial({color:'#080c12',roughness:.7});
  const glass=new THREE.MeshPhysicalMaterial({color:'#113449',roughness:.3,metalness:.1});
  const logo=new THREE.MeshStandardMaterial({color:'#b8d8e9',roughness:.5});
  let signature='';
  function clear(){phone?.dispose();phone=null;group.traverse(n=>{if(n instanceof THREE.Mesh)n.geometry.dispose();});group.clear();}
  function panel(parent:THREE.Group,w:number,h:number,t:number,material:THREE.Material,name:string,x=0,y=0,z=0,r=5,corners?:[number,number,number,number]){
    const node=new THREE.Mesh(slab(w,h,t,r,Math.min(.2,t/4),corners),material);node.name=name;node.position.set(x,y,z);node.castShadow=node.receiveShadow=true;parent.add(node);return node;
  }
  function screen(parent:THREE.Group,w:number,h:number,t:number,name:string,x=0,y=0){if(w<=0||h<=0)return;panel(parent,w,h,.12,glass,name,x,y,-t/2-.08,3);}
  function update(raw:DeviceDesign){
    const c=normalizeDesign(raw),kind=c.kind??'phone';
    if(kind==='phone'){if(!phone){clear();phone=createDeviceModel(c);group.add(phone.group);}else phone.update(c);signature='';group.updateMatrixWorld(true);return;}
    body.color.set(c.color);rear.color.set(c.color);
    if(c.frameFinish&&FRAME_FINISHES[c.frameFinish]){const {label:_label,...params}=FRAME_FINISHES[c.frameFinish];body.setValues(params);}
    if(c.backFinish&&BACK_FINISHES[c.backFinish]){const {label:_label,...params}=BACK_FINISHES[c.backFinish];rear.setValues(params);}
    if(c.frontFinish&&FRONT_FINISHES[c.frontFinish]){const {label:_label,...params}=FRONT_FINISHES[c.frontFinish];glass.setValues(params);}
    const {color:_color,frameFinish:_frame,backFinish:_back,frontFinish:_front,...geometry}=c;
    const next=JSON.stringify(geometry);if(next===signature)return;clear();signature=next;
    const w=c.width,h=c.height,t=c.thickness,dw=c.displayWidth??w-8,dh=c.displayHeight??h-8;
    if(kind==='tablet'){
      panel(group,w,h,t,body,'tablet-chassis');panel(group,w-.6,h-.6,.2,rear,'tablet-rear',0,0,t/2);
      panel(group,w-.4,h-.4,.2,dark,'tablet-bezel',0,0,-t/2);screen(group,dw,dh,t,'tablet-display');
      addDeviceBrand(group,logo,-h*.28,t/2+.3,Math.min(26,w*.18));
      const camera=panel(group,12,20,1.6,dark,'tablet-camera',-w/2+12,h/2-16,t/2+.8,5);camera.userData.feature='camera';
    }else if(kind==='laptop'){
      const baseT=(t-.8)*.72,lidT=(t-.8)*.28;
      const base=panel(group,w,h,baseT,body,'laptop-base');base.rotation.x=-Math.PI/2;
      const lid=new THREE.Group();lid.name='laptop-lid-hinge';lid.position.set(0,baseT/2+.8,-h/2);lid.rotation.x=Math.PI/2-THREE.MathUtils.degToRad(c.hingeAngle??110);group.add(lid);
      const lidSurface=new THREE.Group();lidSurface.position.set(0,h/2,-lidT/2);lid.add(lidSurface);
      panel(lidSurface,w,h,lidT,body,'laptop-lid');panel(lidSurface,w-.5,h-.5,.2,rear,'laptop-rear',0,0,-lidT/2);panel(lidSurface,w-.5,h-.5,.2,dark,'laptop-bezel',0,0,lidT/2);
      if(dw>0&&dh>0)panel(lidSurface,dw,dh,.12,glass,'laptop-display',0,0,lidT/2+.08,3);addDeviceBrand(lidSurface,logo,0,-lidT/2-.3,30).rotation.y=Math.PI;
      for(let row=0;row<5;row++)for(let col=0;col<14;col++){
        const key=panel(group,w*.055,h*.055,.5,dark,'keyboard-key',(col-6.5)*w*.063,baseT/2+.25,-h*.27+row*h*.067,1);key.rotation.x=-Math.PI/2;
      }
      const pad=panel(group,w*.3,h*.23,.3,dark,'trackpad',0,baseT/2+.1,h*.27,4);pad.rotation.x=-Math.PI/2;
      const hinge=new THREE.Mesh(new THREE.CylinderGeometry(Math.min(3,t*.15),Math.min(3,t*.15),w*.65,24),dark);hinge.name='laptop-hinge';hinge.rotation.z=Math.PI/2;hinge.position.set(0,baseT/2,-h/2);group.add(hinge);
    }else{
      const book=kind==='book_foldable',pw=book?w/2:w,ph=book?h:h/2;
      const left=new THREE.Group(),right=new THREE.Group();left.name='fold-fixed-half';right.name='fold-moving-half';
      const pivot=new THREE.Group();pivot.name='fold-hinge';pivot.position.z=-t/2-.25;group.add(left,pivot);pivot.add(right);
      if(book){left.position.x=-pw/2;right.position.set(pw/2,0,t/2+.25);pivot.rotation.y=Math.PI-THREE.MathUtils.degToRad(c.hingeAngle??180);}
      else{left.position.y=-ph/2;right.position.set(0,ph/2,t/2+.25);pivot.rotation.x=-(Math.PI-THREE.MathUtils.degToRad(c.hingeAngle??180));}
      // The two inner faces meet at the hinge; the back panels separate by one thickness when shut.
      for(const [i,half] of [left,right].entries()){
        const corners:[number,number,number,number]=book?(i===0?[7,.2,.2,7]:[.2,7,7,.2]):(i===0?[7,7,.2,.2]:[.2,.2,7,7]);
        panel(half,pw,ph,t,body,'fold-chassis-'+i,0,0,0,7,corners);
        panel(half,pw-.4,ph-.4,.2,rear,'fold-rear-'+i,0,0,t/2,7,corners);
        panel(half,pw-.4,ph-.4,.2,dark,'fold-bezel-'+i,0,0,-t/2,7,corners);
        const sw=book?dw/2:dw,sh=book?dh:dh/2;
        const offset=book?(pw-sw)/2:0,offsetY=book?0:(ph-sh)/2;
        if(sw>0&&sh>0){
          const screenCorners=corners.map(r=>r>.5?Math.min(5,r):.15) as [number,number,number,number];
          panel(half,sw,sh,.12,glass,'inner-display-'+i,book?(i===0?offset:-offset):0,book?0:(i===0?offsetY:-offsetY),-t/2-.15,5,screenCorners);
        }
        // Concealed hinge cheeks sit on the rear face, never in front of the display.
        panel(half,book?1.2:pw-4,book?ph-4:1.2,.12,body,'hinge-spine-'+i,book?(i===0?pw/2-.6:-pw/2+.6):0,book?0:(i===0?ph/2-.6:-ph/2+.6),t/2+.15,.4);
      }
      const cw=c.coverDisplayWidth??0,ch=c.coverDisplayHeight??0;
      if(cw>0&&ch>0){const cover=panel(right,cw,ch,.12,glass,'cover-display',0,0,t/2+.08,3);cover.userData.display='cover';}
      addDeviceBrand(left,logo,-ph*.25,t/2+.3,Math.min(18,pw*.3));
      panel(left,Math.min(26,pw*.4),14,1.5,dark,'fold-camera',-pw*.15,ph/2-12,t/2+.75,4);

    }
    group.updateMatrixWorld(true);
  }
  update(initial);
  return {group,update,dispose(){clear();for(const m of [body,rear,dark,glass,logo])m.dispose();}};
}

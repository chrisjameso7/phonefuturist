import '../../styles/device-configurator.css';
import DeviceThumbnail from './DeviceThumbnail';
import {lazy,Suspense} from 'react';
import type {Post} from './types';
import {communityDesign} from '../../lib/community/build';
import {DEFAULT_DESIGN,normalizeDesign} from '../../lib/labs/device-design';
const Viewport=lazy(()=>import('../labs/DeviceViewport'));
export default function CommunityBuild({build,active,onPreview}:{build:Post['build'];active:boolean;onPreview:()=>void}){
 const data=(build.state&&typeof build.state==='object'?build.state:{}) as any;const input=data.input??data;const physical=input.physical??input.dimensions??{};
 const width=Number(physical.widthMm??physical.width??input.widthMm),height=Number(physical.heightMm??physical.height??input.heightMm),thickness=Number(physical.thicknessMm??physical.thickness??input.thicknessMm);
 let stored;try{stored=data.community_design?communityDesign(data.community_design):null;}catch{stored=null;}const processor=build.processor??data.configuration?.socName;const result=build.results as any;const capacity=result?.device?.battery?.totalCapacityMah,ppi=result?.device?.displays?.primary?.ppi;const design=stored??normalizeDesign({...DEFAULT_DESIGN,name:build.name,kind:['tablet','laptop','book_foldable','flip_foldable'].includes(input.formFactor)?input.formFactor:'phone',width:Number.isFinite(width)?width:DEFAULT_DESIGN.width,height:Number.isFinite(height)?height:DEFAULT_DESIGN.height,thickness:Number.isFinite(thickness)?thickness:DEFAULT_DESIGN.thickness});
 return <div className="community-build"><p className="community-build-label">{build.results?'Device concept · Simulated':'Device design'}</p><h3><a href={'/interactive-leaks/simulation/'+build.id}>{build.name}</a></h3><div className="community-specs"><span>{design.width} × {design.height} × {design.thickness} mm</span>{processor&&typeof processor==='string'&&<span>{processor.replaceAll('_',' ')}</span>}{Number.isFinite(capacity)&&<span>{Math.round(capacity)} mAh</span>}{Number.isFinite(ppi)&&<span>{Math.round(ppi)} PPI</span>}</div>{active?<Suspense fallback={<p>Loading 3D preview…</p>}><Viewport design={design}/><button type="button" onClick={onPreview}>Close 3D preview</button></Suspense>:<button type="button" className="community-preview" onClick={onPreview}><DeviceThumbnail design={design}/><span>Explore in 3D</span></button>}{!data.community_design&&<small>3D concept illustration; finishes and camera layout are illustrative.</small>}<a className="community-open" href={'/interactive-leaks/simulation/'+build.id}>View saved build →</a></div>;
}

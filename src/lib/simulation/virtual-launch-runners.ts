import { isAcceptedVirtualDevice, type AcceptedVirtualDevice } from './virtual-device-inference';
import { deepFreeze, sameConditions, canonical } from './virtual-device-evidence';
import { launchConditions } from './virtual-launch-policy';
import { runVirtualBattery, virtualBatteryRunRequestSchema, type VirtualBatteryRunRequest } from './virtual-battery-runner';
import { batteryConditions } from './virtual-battery-policy';
import type { VirtualParameter, ParameterKey, TestConditions } from './virtual-device';
type Known=Exclude<VirtualParameter,{status:'unknown'}>;
export type Range={min:number;max:number};
export type VirtualMetric={label:string;unit:string;range:Range};
export type LaunchCategory='battery'|'cpu'|'gpu'|'thermal'|'charging';
export interface LaunchTestResult {
  category:LaunchCategory;status:'resolved'|'unresolved';title:string;
  confidence:'low'|'not-assessed';metrics:VirtualMetric[];issues:string[];assumptions:string[];
  parameters:VirtualParameter[];trace?:Array<{seconds:number;temperatureC:Range;retention?:Range}>;
  temperatureLocation?:'junction'|'battery';
}
const metric=(label:string,unit:string,range:Range):VirtualMetric=>({label,unit,range});
function assumptions(parameters:Known[]):string[]{return [...new Set(parameters.flatMap(p=>p.status==='predicted'?[p.rationale,...p.assumptions]:p.status==='derived'?[p.rationale]:[]))];}
function test(category:LaunchCategory,title:string,parameters:Array<Known|undefined>,calculate:(known:Known[])=>Partial<LaunchTestResult>):LaunchTestResult {
  const known=parameters.filter((p):p is Known=>!!p);
  const base:LaunchTestResult={category,title,status:'unresolved',confidence:'not-assessed',metrics:[],issues:[],parameters:known,assumptions:assumptions(known)};
  if(known.length!==parameters.length)return {...base,issues:['Required parameters or operating points are unavailable. Other tests can still run.']};
  return {...base,status:'resolved',confidence:'low',...calculate(known)};
}
const bound=(p:Known,high:boolean)=>high?p.range.max:p.range.min;
// Exact RC step for a constant-power timestep; avoids Euler instability and unit mixing.
export function thermalStep(temperature:number,ambient:number,powerW:number,resistance:number,capacitance:number,seconds:number):number {
  return ambient+powerW*resistance+(temperature-ambient-powerW*resistance)*Math.exp(-seconds/(resistance*capacitance));
}
function envelope(values:number[]):Range{return {min:Math.min(...values),max:Math.max(...values)};}
function sustained(parameters:Known[],ambient:number):Partial<LaunchTestResult> {
  const [cpu,gpu,system,r,c,limit,budget,single,multi,fps]=parameters;
  const samples:Array<Array<{seconds:number;temperature:number;retention:number}>>=[];
  for(let mask=0;mask<32;mask++){
    const high=(bit:number)=>(mask&(1<<bit))!==0;
    const power=bound(cpu,high(0))+bound(gpu,high(0))+bound(system,high(0));
    const resistance=bound(r,high(1)),capacitance=bound(c,high(2)),threshold=bound(limit,high(3)),cap=bound(budget,high(4));
    let temperature=ambient;const trace=[{seconds:0,temperature,retention:1}];
    for(let seconds=30;seconds<=1800;seconds+=30){
      const thermalCap=Math.max(0,(threshold-ambient)/resistance);
      const allowed=Math.min(power,seconds<=60?power:cap,thermalCap);
      temperature=thermalStep(temperature,ambient,allowed,resistance,capacitance,30);
      if(seconds%30===0)trace.push({seconds,temperature,retention:Math.min(1,allowed/power)});
    }
    samples.push(trace);
  }
  const trace=samples[0].map((sample,i)=>({seconds:sample.seconds,temperatureC:envelope(samples.map(s=>s[i].temperature)),retention:envelope(samples.map(s=>s[i].retention))}));
  const final=trace[trace.length-1],retention=final.retention;
  return {temperatureLocation:'junction',trace,metrics:[metric('Junction temperature at 30 min','°C',final.temperatureC),
    metric('Sustained performance retention','%',{min:retention.min*100,max:Math.sqrt(retention.max)*100}),
    metric('Sustained CPU single-core equivalent','score',{min:single.range.min*retention.min,max:single.range.max*Math.sqrt(retention.max)}),
    metric('Sustained CPU multi-core equivalent','score',{min:multi.range.min*retention.min,max:multi.range.max*Math.sqrt(retention.max)}),
    metric('Sustained synthetic GPU throughput','fps',{min:fps.range.min*retention.min,max:fps.range.max*Math.sqrt(retention.max)})],
    assumptions:[...assumptions(parameters),'30-minute simultaneous CPU/GPU stress; system overhead uses the same model standby envelope.',
      'After 60 seconds the predicted sustained-power budget applies; junction threshold further caps power.',
      'Performance retention is bracketed between power ratio and its square root, an uncalibrated DVFS sensitivity model.',
      'Junction estimates are not surface or battery temperatures; those are not inferred from this trace.']};
}
function charging(parameters:Known[],ambient:number):Partial<LaunchTestResult>{
  const [energy,usable,peak,efficiency,r,c,threshold,...curve]=parameters;
  const milestones:number[][]=[[],[],[]];const peaks:number[]=[];
  // Enumerate uncertainty corners; no random sampling or midpoint collapse.
  for(let mask=0;mask<128;mask++){
    const high=(bit:number)=>(mask&(1<<bit))!==0;
    const wh=bound(energy,high(0))*bound(usable,high(0)),eta=bound(efficiency,high(1));
    const resistance=bound(r,high(2)),capacitance=bound(c,high(3)),limit=bound(threshold,high(4));
    let soc=0,temp=ambient;const reached=[false,false,false],trace=[{seconds:0,temperature:temp}];
    let seconds=0;
    while(seconds<8*3600 && soc<1){
      const point=curve[soc<0.5?0:soc<0.8?1:soc<0.95?2:3];
      const thermalInputCap=Math.max(0,(limit-ambient)/(resistance*(1-eta)));
      const input=Math.min(45,bound(peak,high(5)),thermalInputCap,bound(point,high(6))/eta);
      const acceptedPower=input*eta;
      if(acceptedPower<=0)break;
      const nextBoundary=soc<0.5?0.5:soc<0.8?0.8:soc<0.95?0.95:1;
      const step=Math.min(60,(nextBoundary-soc)*wh/acceptedPower*3600,8*3600-seconds);
      temp=thermalStep(temp,ambient,input-acceptedPower,resistance,capacitance,step);
      seconds+=step;
      soc=Math.min(1,soc+acceptedPower*(step/3600)/wh);
      if(nextBoundary-soc<1e-10)soc=nextBoundary;
      [0.5,0.8,1].forEach((target,i)=>{if(!reached[i]&&soc>=target){milestones[i].push(seconds/60);reached[i]=true;}});
      trace.push({seconds,temperature:temp});
    }
    if(!reached[2])return {status:'unresolved',issues:['Charging cannot reach modeled capacity within the 8-hour simulation bound.'],metrics:[]};
    peaks.push(Math.max(...trace.map(p=>p.temperature)));
  }
  return {temperatureLocation:'battery',metrics:[...milestones.map((values,i)=>metric(`0–${[50,80,100][i]}% modeled charge`,'min',envelope(values))),metric('Peak battery-node temperature','°C',envelope(peaks))],
    assumptions:[...assumptions(parameters),'Compatible 45 W charger, idle device, no user load; input is capped by charger, device, efficiency, taper and battery thermal allowance.',
      'All modeled conversion loss is assigned to the battery node as a conservative heat assumption, not a measured heat allocation.',
      'Piecewise accepted-power bands at 0/50/80/95%; 100% means modeled usable energy, not measured electrochemical charge termination.'],
    trace:[{seconds:0,temperatureC:{min:ambient,max:ambient}}]};
}
export function runVirtualLaunchSuite(accepted:unknown,input:unknown){
  if(!isAcceptedVirtualDevice(accepted))return {status:'invalid' as const,issues:['An accepted server model is required.']};
  const parsed=virtualBatteryRunRequestSchema.safeParse(input);
  if(!parsed.success)return {status:'invalid' as const,issues:['Invalid test request.']};
  const request=parsed.data;
  if(canonical(request.currentConfiguration)!==canonical(accepted.configuration)||request.modelId!==accepted.model.modelId||request.modelRevision!==accepted.model.revision||request.evidenceSnapshotId!==accepted.evidence.snapshot.id||request.evidenceSnapshotRevision!==accepted.evidence.snapshotRevision)
    return {status:'invalid' as const,issues:['Stale configuration/model/evidence revision.']};
  const ambient=request.scenario.ambientC;
  const pick=(key:ParameterKey,conditions:TestConditions)=>{
    const found=accepted.model.parameters.filter((p):p is Known=>p.status!=='unknown'&&p.key===key&&sameConditions(p.conditions,conditions));
    return found.length===1?found[0]:undefined;
  };
  const cpu=launchConditions('cpu-burst',ambient),gpu=launchConditions('gpu-synthetic',ambient,{resolution:{width:2560,height:1440},quality:'High Tier offscreen'});
  const single=pick('cpu.singleCore',cpu),multi=pick('cpu.multiCore',cpu),cpuPower=pick('cpu.power',cpu),gpuPower=pick('gpu.power',gpu),fps=pick('gpu.frameRate',gpu);
  const cpuResult=test('cpu','PF CPU v1 · synthetic burst',[single,multi,cpuPower],p=>({metrics:[metric('Single-core equivalent','score',p[0].range),metric('Multi-core equivalent','score',p[1].range),metric('CPU power','W',p[2].range)]}));
  const gameConditions=[launchConditions('gaming-balanced',ambient,{resolution:{width:1920,height:1080},quality:'PF generic raster scene, medium, 60 FPS cap'}),launchConditions('gaming-demanding',ambient,{resolution:{width:2560,height:1440},quality:'PF generic raster scene, high, 120 FPS cap'})];
  const gpuResult=test('gpu','PF GPU v1 · synthetic + gaming',[fps,gpuPower,...gameConditions.flatMap(c=>[pick('gpu.frameRate',c),pick('gpu.power',c)])],p=>({metrics:[metric('1440p High offscreen synthetic','fps',p[0].range),metric('Synthetic GPU power','W',p[1].range),metric('1080p Medium generic gaming','fps',p[2].range),metric('1080p gaming power','W',p[3].range),metric('1440p High generic gaming','fps',p[4].range),metric('1440p gaming power','W',p[5].range)]}));
  const thermal=launchConditions('sustained-combined',ambient,{temperatureLocation:'junction'});
  const thermalResult=test('thermal','30-minute sustained stress',[cpuPower,gpuPower,pick('battery.averagePower',batteryConditions(accepted.configuration,request.scenario,'standby')),pick('thermal.resistance',thermal),pick('thermal.capacitance',thermal),pick('thermal.throttleTemperature',thermal),pick('thermal.sustainedPower',thermal),single,multi,fps],p=>sustained(p,ambient));
  const charge=launchConditions('charging',ambient),batteryThermal={...charge,temperatureLocation:'battery' as const};
  const pack=batteryConditions(accepted.configuration,request.scenario,'pack');
  const chargingResult=test('charging','45 W charger · predicted taper',[pick('battery.energy',pack),pick('battery.usableFraction',pack),pick('charging.peakPower',charge),pick('charging.efficiency',charge),pick('thermal.resistance',batteryThermal),pick('thermal.capacitance',batteryThermal),pick('thermal.throttleTemperature',batteryThermal),...[0,0.5,0.8,0.95].map(stateOfCharge=>pick('charging.acceptedPower',{...charge,stateOfCharge}))],p=>charging(p,ambient));
  const battery=runVirtualBattery(accepted,request);
  const batteryResult:LaunchTestResult=battery.status==='resolved'?{category:'battery',title:`${request.scenario.usage} daily endurance`,status:'resolved',confidence:'low',metrics:[metric('Elapsed endurance','h',battery.expectedRangeHours)],issues:[],assumptions:battery.assumptions,parameters:battery.parameters}:{category:'battery',title:'Daily endurance',status:'unresolved',confidence:'not-assessed',metrics:[],issues:battery.issues,assumptions:[],parameters:[]};
  return deepFreeze({status:'complete' as const,results:[batteryResult,cpuResult,gpuResult,thermalResult,chargingResult],
    receipt:{runnerVersion:'virtual-launch-1',request,model:accepted.model,configuration:accepted.configuration,evidence:accepted.evidence,
      battery:battery.status==='resolved'?battery.receipt:null},modelConfidence:'low' as const});
}
export function launchRequest(accepted:AcceptedVirtualDevice,scenario:VirtualBatteryRunRequest['scenario']):VirtualBatteryRunRequest{return {currentConfiguration:accepted.configuration,modelId:accepted.model.modelId,modelRevision:accepted.model.revision,evidenceSnapshotId:accepted.evidence.snapshot.id,evidenceSnapshotRevision:accepted.evidence.snapshotRevision,scenario};}

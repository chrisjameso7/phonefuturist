import { z } from 'zod';
import { virtualDeviceConfigurationSchema } from './virtual-device';
import { virtualBatteryScenarioSchema } from './virtual-battery-policy';
import { buildVirtualLaunchCatalog } from './virtual-launch-policy';
import { createVirtualDeviceInferenceService,type VirtualDeviceProvider } from './virtual-device-inference';
import { runVirtualLaunchSuite,launchRequest } from './virtual-launch-runners';
export const virtualLaunchInputSchema=z.object({configuration:virtualDeviceConfigurationSchema,scenario:virtualBatteryScenarioSchema}).strict();
export async function generateVirtualLaunch(input:unknown,provider:VirtualDeviceProvider,now=()=>new Date().toISOString(),createId:()=>string=()=>crypto.randomUUID()){
  const parsed=virtualLaunchInputSchema.safeParse(input);
  if(!parsed.success)return {status:'invalid' as const};
  const {configuration,scenario}=parsed.data;
  const service=createVirtualDeviceInferenceService({catalog:buildVirtualLaunchCatalog(configuration,scenario),provider,now,createId});
  const accepted=await service.generate(configuration);
  if(accepted.status!=='accepted')return {status:'unavailable' as const};
  return runVirtualLaunchSuite(accepted,launchRequest(accepted,scenario));
}

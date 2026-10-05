import { logVirtualFailure } from './virtual-diagnostics';
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
  let service: ReturnType<typeof createVirtualDeviceInferenceService>;
  try { service=createVirtualDeviceInferenceService({catalog:buildVirtualLaunchCatalog(configuration,scenario),provider,now,createId}); }
  catch { logVirtualFailure('evidence','evidence_assembly'); return {status:'unavailable' as const,stage:'evidence' as const}; }
  const accepted=await service.generate(configuration);
  if(accepted.status!=='accepted')return {status:'unavailable' as const,stage:accepted.stage};
  try {
    const result = runVirtualLaunchSuite(accepted,launchRequest(accepted,scenario));
    if(result.status !== 'complete') logVirtualFailure('runner', 'runner_rejected');
    return result;
  } catch { logVirtualFailure('runner', 'runner_exception'); return {status:'unavailable' as const,stage:'runner' as const}; }
}

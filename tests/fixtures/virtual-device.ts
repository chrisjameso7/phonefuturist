import { virtualDeviceConfigurationSchema, virtualParameterSchema, PARAMETER_RULES } from '../../src/lib/simulation/virtual-device';
import type { VirtualDeviceProposalRequest, VirtualDeviceProvider } from '../../src/lib/simulation/virtual-device-inference';
export const acceptanceConfiguration = () => virtualDeviceConfigurationSchema.parse({
  id:'acceptance-configuration',revision:1,parentRevision:null,subjectId:'unreleased-fixture',name:'Samsung Galaxy S27 Pro',
  deviceContext:{origin:'user-supplied',displayInches:6.47,resolution:{width:1440,height:3120},refreshHz:120,chipset:'Exynos 2700',cooling:'vapor chamber',software:'One UI 9 / Android 17'},
  assertions:[{key:'battery.capacity',unit:'mAh',range:{min:5100,max:5100},origin:'user-supplied',evidence:[]}],
});
export const acceptanceScenario = {usage:'Typical' as const,network:'5g' as const,brightnessNits:500,ambientC:25};
/** Deterministic provider fixture, not a real AI response or product forecast. */
export function fixtureProposal(request:VirtualDeviceProposalRequest) {
  return {parameters:request.evidence.slots.map(slot=>{
    if(slot.fixed)return structuredClone(slot.fixed);
    const assessment=request.evidence.analogies.find(a=>a.parameterId===slot.id)!;
    const policy=request.evidence.reviewedPolicies.find(p=>p.id===assessment.id)!;
    const voltage=request.evidence.slots.find(s=>s.key==='battery.nominalVoltage'&&!s.fixed);
    return virtualParameterSchema.parse({id:slot.id,key:slot.key,status:'predicted',unit:PARAMETER_RULES[slot.key].unit,
      range:assessment.allowedRange,conditions:slot.conditions,evidence:assessment.evidence,
      dependencies:slot.key==='battery.energy'&&voltage?[voltage.id]:[],confidence:'low',
      rationale:policy.rationale,assumptions:policy.transfer?.assumptions??['Synthetic test prediction'],
      analogyAssessmentId:assessment.id,rangeMeaning:'prediction-envelope'});
  }),limitations:['Test-only provider fixture; not a live AI response.']};
}
export const fixtureProvider:VirtualDeviceProvider={providerId:'test-fixture',modelId:'test-fixture-v1',propose:async request=>fixtureProposal(request)};

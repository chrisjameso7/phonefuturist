import { z } from 'zod';
import { virtualDeviceConfigurationSchema, virtualParameterSchema } from './virtual-device';
const range=z.object({min:z.number(),max:z.number()}).refine(r=>r.min<=r.max);
const result=z.object({category:z.enum(['battery','cpu','gpu','thermal','charging']),status:z.enum(['resolved','unresolved']),title:z.string(),confidence:z.enum(['low','not-assessed']),
  metrics:z.array(z.object({label:z.string(),unit:z.string(),range})),issues:z.array(z.string()),assumptions:z.array(z.string()),
  parameters:z.array(virtualParameterSchema),temperatureLocation:z.enum(['junction','battery']).optional(),
  trace:z.array(z.object({seconds:z.number(),temperatureC:range})).optional(),
});
export const launchResponseSchema=z.object({status:z.literal('complete'),results:z.array(result).length(5).refine(r=>new Set(r.map(t=>t.category)).size===5),
  receipt:z.looseObject({configuration:virtualDeviceConfigurationSchema,model:z.object({modelId:z.string(),revision:z.number().int().positive()}),evidence:z.object({snapshot:z.object({id:z.string(),records:z.array(z.object({id:z.string(),subjectId:z.string(),status:z.string(),source:z.object({title:z.string(),url:z.url().refine(u=>/^https?:/.test(u))})}))})})}),
});
export type VirtualLaunchView=z.infer<typeof launchResponseSchema>;
export function rangeLabel(range:{min:number;max:number},unit:string):string{
  const digits=unit==='score'||unit==='min'||unit==='fps'||unit==='%'?0:1;
  return `${range.min.toFixed(digits)}–${range.max.toFixed(digits)} ${unit}`;
}
export function responseMatchesConfiguration(view:VirtualLaunchView,configuration:z.infer<typeof virtualDeviceConfigurationSchema>):boolean{
  return JSON.stringify(view.receipt.configuration)===JSON.stringify(virtualDeviceConfigurationSchema.parse(configuration));
}

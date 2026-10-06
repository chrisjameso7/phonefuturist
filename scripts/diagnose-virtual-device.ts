/** Explicit live opt-in; uses existing Wrangler auth in memory, never prints or persists credentials. */
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {z} from 'zod';
import {createGoogleVirtualDeviceProvider} from '../src/lib/simulation/providers/google-virtual-device-provider';
import {generateVirtualLaunch} from '../src/lib/simulation/virtual-launch-service';
import {acceptanceConfiguration,acceptanceScenario} from '../tests/fixtures/virtual-device';
const authSchema=z.object({token:z.string().min(1)});
const accountsSchema=z.object({accounts:z.array(z.object({id:z.string().min(1)}))});
function wrangler(args:string[]):unknown{
 const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args,'--json'],{encoding:'utf8',windowsHide:true});
 if(result.status!==0)throw new Error('Wrangler authentication unavailable.');
 return JSON.parse(result.stdout);
}
if(!process.argv.includes('--live')){
 console.log('No provider call made. Use --live to run the complete public S27 Pro fixture through Workers AI using your existing Wrangler login. Consumes inference quota.');
}else try{
 const apiToken=process.env.CLOUDFLARE_AI_API_TOKEN?.trim()||authSchema.parse(wrangler(['auth','token'])).token;
 let accountId=process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
 if(!accountId){const {accounts}=accountsSchema.parse(wrangler(['whoami']));if(accounts.length!==1)throw new Error('Select the intended Cloudflare account locally.');accountId=accounts[0].id;}
 const started=performance.now();let requestBytes=0;
 const provider=createGoogleVirtualDeviceProvider({provider:'gemma',accountId,apiToken,model:'@cf/google/gemma-4-26b-a4b-it'},async(url,init)=>{
  requestBytes=new TextEncoder().encode(String(init?.body)).byteLength;
  return fetch(url,init);
 });
 const result=await generateVirtualLaunch({configuration:acceptanceConfiguration(),scenario:acceptanceScenario},provider);
 const report={status:result.status,elapsedMs:performance.now()-started,requestBytes,...(result.status==='complete'?{generation:result.receipt.model.generation,results:result.results.map(r=>({category:r.category,status:r.status,confidence:r.confidence,metrics:r.metrics}))}:{})};
 console.log(JSON.stringify(report,null,2));
 mkdirSync('.cache',{recursive:true});writeFileSync('.cache/virtual-device-live-report.json',JSON.stringify(report,null,2));
 if(result.status!=='complete'||result.results.some(r=>r.status!=='resolved'))process.exitCode=1;
}catch{console.error('Live diagnostic could not complete. Check local Wrangler login/account selection and the sanitized provider events. No credentials or raw errors are printed.');process.exitCode=1;}

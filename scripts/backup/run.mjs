import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { randomUUID, createHash } from 'node:crypto';
import { launch, encryptStream, outsideProtected, inside } from './crypto.mjs';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
async function capture(program,args,env) {
 const {child,done}=launch(program,args,{env});child.stdin.end();
 let output='',size=0;
 try{for await(const part of child.stdout){size+=part.length;if(size>16_000_000)throw new Error('Inventory is too large for this MVP backup tool.');output+=part.toString('utf8');}await done;return output.trim();}
 catch(e){child.kill();throw e;}
}
async function run() {
 const oneDrive=await realpath(process.env.OneDrive??'');
 if(!process.env.OneDrive)throw new Error('OneDrive sync root is not configured.');
 const configPath=await outsideProtected(process.argv[2],[repo,oneDrive]);
 const config=JSON.parse(await readFile(configPath,'utf8'));
 if(config.supabaseUrl!=='https://ehldokmrgahrlcoyidjy.supabase.co')throw new Error('Backup is restricted to the canonical PhoneFuturist project.');
 await mkdir(config.destination,{recursive:true});
 const destination=await realpath(config.destination);
 if(!inside(oneDrive,destination)||destination===oneDrive)throw new Error('Choose a dedicated folder inside OneDrive.');
 config.recipientFile=await outsideProtected(config.recipientFile,[repo,oneDrive]);
 config.gpgHome=await outsideProtected(config.gpgHome,[repo,oneDrive]);
 const certificate=await readFile(config.recipientFile);
 if(createHash('sha256').update(certificate).digest('hex')!==config.recipientSha256)throw new Error('The pinned backup recipient certificate changed.');
 if(!certificate.toString().includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')||certificate.toString().includes('PRIVATE KEY'))throw new Error('Use an ASCII-armored public recipient certificate only.');
 let secretInput='';for await(const part of process.stdin){secretInput+=part;if(secretInput.length>20000)throw new Error('Invalid credential input.');}
 const credentials=JSON.parse(secretInput);secretInput='';
 if(!credentials.databasePassword||!credentials.storageKey)throw new Error('Enter database and Storage credentials in the local launcher.');
 const env={...process.env,PGHOST:config.databaseHost,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:config.databaseUser,PGPASSWORD:credentials.databasePassword,PGSSLMODE:'verify-full',PGSSLROOTCERT:config.databaseCaFile,PGCONNECT_TIMEOUT:'20'};
 if(!config.databaseCaFile)throw new Error('Configure the Supabase database CA file for verified TLS.');
 await realpath(config.databaseCaFile);
 const psql=join(config.postgresBin,process.platform==='win32'?'psql.exe':'psql');
 const pgDump=join(config.postgresBin,process.platform==='win32'?'pg_dump.exe':'pg_dump');
 const sqlArgs=['--no-psqlrc','--no-password','--tuples-only','--no-align','--set','ON_ERROR_STOP=1'];
 const inventoryQuery="select coalesce(json_agg(row_to_json(x)),'[]'::json) from (select bucket_id,name,updated_at,metadata from storage.objects order by bucket_id,name) x";
 const inventoryBefore=await capture(psql,[...sqlArgs,'--command',inventoryQuery],env);
 const objects=JSON.parse(inventoryBefore);
 if(!Array.isArray(objects))throw new Error('Storage inventory failed.');
 const runName=new Date().toISOString().replaceAll(':','-')+'-'+randomUUID();
 const folder=join(destination,runName);await mkdir(folder);
 const manifest={format:'phonefuturist-backup-v1',startedAt:new Date().toISOString(),project:'ehldokmrgahrlcoyidjy',files:[],databaseScope:['public','private','auth','storage','supabase_migrations'],restoration:'Managed schemas require selective restoration into a compatible isolated Supabase instance.'};
 const {child,done}=launch(pgDump,['--no-password','--format=custom','--no-owner','--no-subscriptions','--schema=public','--schema=private','--schema=auth','--schema=storage','--schema=supabase_migrations'],{env});child.stdin.end();
 try {const result=await encryptStream(child.stdout,join(folder,'database.pgp'),config);await done;manifest.files.push({kind:'database',file:'database.pgp',...result});}catch(e){child.kill();throw e;}
 for(const object of objects){
  const key=[object.bucket_id,...object.name.split('/')].map(encodeURIComponent).join('/');
  const headers=credentials.storageKey.startsWith('sb_secret_')?{apikey:credentials.storageKey}:{apikey:credentials.storageKey,Authorization:'Bearer '+credentials.storageKey};
  const response=await fetch(config.supabaseUrl+'/storage/v1/object/authenticated/'+key,{headers,redirect:'error',signal:AbortSignal.timeout(120000)});
  if(!response.ok||!response.body)throw new Error('A Storage object could not be backed up.');
  const file=randomUUID()+'.pgp';const result=await encryptStream(Readable.fromWeb(response.body),join(folder,file),config);
  manifest.files.push({kind:'media',file,bucket:object.bucket_id,path:object.name,metadata:object.metadata,...result});
 }
 // Mutable object inventories invalidate the run. Publication remains immutable, but backup never assumes that.
 const inventoryAfter=await capture(psql,[...sqlArgs,'--command',inventoryQuery],env);
 if(inventoryBefore!==inventoryAfter)throw new Error('Storage changed during export. Retry the entire backup.');
 manifest.completedAt=new Date().toISOString();
 await encryptStream(Readable.from([JSON.stringify(manifest)]),join(folder,'manifest.pgp'),config);
 await writeFile(join(folder,'COMPLETE.json'),JSON.stringify({format:manifest.format,completedAt:manifest.completedAt,encrypted:true}),{flag:'wx'});
 console.log('Encrypted backup created locally. Confirm OneDrive upload completion before treating it as off-device.');
}
run().catch(()=>{console.error('Backup failed or configuration is incomplete. No new completed backup should be trusted. Check local setup and provider availability; credentials are not logged.');process.exitCode=1;});

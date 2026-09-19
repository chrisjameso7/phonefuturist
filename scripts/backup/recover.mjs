import { readFile, mkdir, realpath } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outsideProtected, decryptVerified } from './crypto.mjs';

// Decrypt to a new local directory only. Never executes SQL or writes to a live database.
async function recover(){
 const [backup,output,configFile]=process.argv.slice(2);
 const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
 if(!process.env.OneDrive)throw new Error('OneDrive root missing.');
 const oneDrive=await realpath(process.env.OneDrive);
 const configPath=await outsideProtected(configFile,[repo,oneDrive]);
 const config=JSON.parse(await readFile(configPath,'utf8'));
 config.recoveryHome=await outsideProtected(config.recoveryHome,[repo,oneDrive]);
 const folder=await realpath(backup);await readFile(join(folder,'COMPLETE.json'));
 await mkdir(output,{recursive:false,mode:0o700});
 const destination=await outsideProtected(output,[repo,oneDrive]);
 await decryptVerified(join(folder,'manifest.pgp'),join(destination,'manifest.json'),config);
 const manifest=JSON.parse(await readFile(join(destination,'manifest.json'),'utf8'));
 if(manifest.format!=='phonefuturist-backup-v1'||!Array.isArray(manifest.files))throw new Error('Invalid backup manifest.');
 for(const entry of manifest.files){
  if(!/^(database|[a-f0-9-]{36})\.pgp$/.test(entry.file))throw new Error('Unsafe backup filename.');
  await decryptVerified(join(folder,entry.file),join(destination,entry.file+'.restored'),config,entry);
 }
 console.log('Files decrypted and hashes verified. Database restore acceptance is still a separate isolated test.');
}
recover().catch(()=>{console.error('Recovery failed. Do not import partial recovery files. Credentials and decrypted data are not logged.');process.exitCode=1;});

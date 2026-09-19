import { readdir,readFile,realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { inside } from './crypto.mjs';
try{
 if(!process.env.OneDrive)throw new Error();
 const root=await realpath(process.argv[2]);const cloud=await realpath(process.env.OneDrive);
 if(!inside(cloud,root)||root===cloud)throw new Error();
 let newest=0;
 for(const entry of await readdir(root,{withFileTypes:true})){
  if(!entry.isDirectory()||entry.isSymbolicLink())continue;
  try{const marker=JSON.parse(await readFile(join(root,entry.name,'COMPLETE.json'),'utf8'));const date=Date.parse(marker.completedAt);if(marker.format==='phonefuturist-backup-v1'&&date<=Date.now())newest=Math.max(newest,date);}catch{}
 }
 if(!newest||Date.now()-newest>18*60*60*1000){console.error('Backup overdue or absent. Run an export and verify OneDrive synchronization.');process.exitCode=1;}
 else console.log('A local completion marker is under 18 hours old. Cloud synchronization and restoration are separate checks.');
}catch{console.error('Backup status unavailable. Check the configured OneDrive backup folder.');process.exitCode=1;}

import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, realpath, stat, unlink, rename } from 'node:fs/promises';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { createHash } from 'node:crypto';

export function gpgPath(program,path){
 const normalized=path.replaceAll('\\','/');
 return process.platform==='win32'&&program.replaceAll('\\','/').includes('/usr/bin/')?normalized.replace(/^([A-Za-z]):\//,(_match,drive)=>'/'+drive.toLowerCase()+'/'):normalized;
}

export function inside(root, candidate) {
 const rel=relative(resolve(root),resolve(candidate));
 return rel===''||(!rel.startsWith('..')&&!isAbsolute(rel));
}
export async function outsideProtected(path, roots) {
 const canonical=await realpath(path);
 const canonicalRoots=await Promise.all(roots.map(root=>realpath(root)));
 if(canonicalRoots.some(root=>inside(root,canonical)))throw new Error('Credential or recovery path must be outside the repository and OneDrive.');
 return canonical;
}
export function launch(program,args,options={}) {
 const child=spawn(program,args,{windowsHide:true,shell:false,stdio:['pipe','pipe','pipe'],...options});
 // Provider errors can contain connection parameters. Keep them out of console/log files.
 child.stderr.on('data',()=>{});
 const done=new Promise((res,rej)=>{child.once('error',()=>rej(new Error('Required program could not start.')));child.once('close',code=>code===0?res():rej(new Error('Backup subprocess failed. No complete backup was recorded.')));});
 done.catch(()=>{});
 return {child,done};
}
export async function digest(path) {
 const hash=createHash('sha256');let bytes=0;
 for await(const chunk of createReadStream(path)){hash.update(chunk);bytes+=chunk.length;}
 return {sha256:hash.digest('hex'),bytes};
}
export async function encryptStream(source,path,config) {
 const {child,done}=launch(config.gpg,['--no-options','--homedir',gpgPath(config.gpg,config.gpgHome),'--batch','--no-tty','--no-keyring','--no-encrypt-to','--recipient-file',gpgPath(config.gpg,config.recipientFile),'--cipher-algo','AES256','--compress-algo','zlib','--force-mdc','--encrypt']);
 const hash=createHash('sha256');let bytes=0;
 const inspect=new Transform({transform(chunk,_encoding,callback){bytes+=chunk.length;hash.update(chunk);callback(null,chunk);}});
 try {
  await Promise.all([pipeline(source,inspect,child.stdin),pipeline(child.stdout,createWriteStream(path,{flags:'wx',mode:0o600})),done]);
  return {sha256:hash.digest('hex'),bytes};
 }catch(error){child.kill();await unlink(path).catch(()=>{});throw error;}
}
export async function decryptVerified(source,destination,config,expected) {
 await mkdir(dirname(destination),{recursive:true});
 // Never expose decrypted output as successful until GPG integrity verification completes.
 const temporary=destination+'.partial';
 const {child,done}=launch(config.gpg,['--no-options','--homedir',gpgPath(config.gpg,config.recoveryHome),'--output','-','--decrypt',gpgPath(config.gpg,source)],{stdio:['inherit','pipe','pipe']});
 try {
  await Promise.all([pipeline(child.stdout,createWriteStream(temporary,{flags:'wx',mode:0o600})),done]);
  const actual=await digest(temporary);
  if(expected&&(actual.sha256!==expected.sha256||actual.bytes!==expected.bytes))throw new Error('Restored file does not match the encrypted manifest.');
  try{await stat(destination);throw new Error('Recovery destination already exists.');}catch(e){if(e.code!=='ENOENT')throw e;}
  await rename(temporary,destination);
  return actual;
 }catch(error){child.kill();await unlink(temporary).catch(()=>{});throw error;}
}

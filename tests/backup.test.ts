import { describe,it,expect } from 'vitest';
import { mkdtemp,readFile,mkdir,writeFile,rm,realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve,basename } from 'node:path';
import { Readable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { encryptStream,decryptVerified,inside,outsideProtected,gpgPath } from '../scripts/backup/crypto.mjs';

async function removeFixture(root:string){const target=await realpath(root);if(!inside(await realpath(tmpdir()),target)||!basename(target).startsWith('pf-backup-'))throw new Error('Unsafe test cleanup path');await rm(target,{recursive:true,force:true,maxRetries:3,retryDelay:300});}
describe('encrypted backup primitives',()=>{
 it('rejects sibling-prefix paths and keeps credentials out of backup roots',async()=>{
  const root=await mkdtemp(join(tmpdir(),'pf-backup-paths-'));
  try{const local=join(root,'local');const cloud=join(root,'cloud');await mkdir(local);await mkdir(cloud);expect(inside(cloud,join(root,'cloud-other'))).toBe(false);expect(inside(cloud,join(cloud,'item'))).toBe(true);expect(await outsideProtected(local,[cloud])).toBe(await import('node:fs/promises').then(fs=>fs.realpath(local)));await expect(outsideProtected(cloud,[cloud])).rejects.toThrow();}finally{await removeFixture(root);}
 });
 it('encrypts without plaintext output and rejects damaged ciphertext on recovery',async()=>{
  const gpg=process.env.PF_TEST_GPG??(process.platform==='win32'?spawnSync('where.exe',['gpg'],{encoding:'utf8',windowsHide:true}).stdout.trim().split(/\\r?\\n/)[0]:'gpg');
  const root=await mkdtemp(join(tmpdir(),'pf-backup-crypto-'));
  const home=join(root,'recovery');const publicHome=join(root,'public');await mkdir(home,{mode:0o700});await mkdir(publicHome,{mode:0o700});
  const args=['--no-options','--homedir',gpgPath(gpg,home),'--batch','--pinentry-mode','loopback','--passphrase',''];
  try{
   // Disposable fixture key only, outside the repository and OneDrive. Never a real recovery credential.
   const create=spawnSync(gpg,[...args,'--quick-generate-key','PhoneFuturist disposable test','rsa2048','encr','1d'],{windowsHide:true});expect(create.status,create.stderr.toString()).toBe(0);
   const cert=spawnSync(gpg,['--no-options','--homedir',gpgPath(gpg,home),'--armor','--export'],{windowsHide:true});expect(cert.status).toBe(0);
   const recipientFile=join(root,'recipient.asc');await writeFile(recipientFile,cert.stdout);
   const config={gpg,gpgHome:publicHome,recipientFile,recoveryHome:home};
   const plaintext='PRIVATE_BACKUP_FIXTURE\n'+('test-data '.repeat(5000));
   const encrypted=join(root,'snapshot.pgp');const expected=await encryptStream(Readable.from([plaintext]),encrypted,config);
   expect((await readFile(encrypted)).includes(Buffer.from('PRIVATE_BACKUP_FIXTURE'))).toBe(false);
   const restored=join(root,'restored');await decryptVerified(encrypted,restored,config,expected);expect(await readFile(restored,'utf8')).toBe(plaintext);
   const bytes=await readFile(encrypted);bytes[bytes.length-12]^=1;const damaged=join(root,'damaged.pgp');await writeFile(damaged,bytes);
   await expect(decryptVerified(damaged,join(root,'invalid'),config,expected)).rejects.toThrow();
   await expect(readFile(join(root,'invalid'))).rejects.toThrow();
  }finally{
   const gpgconf=process.platform==='win32'?resolve(gpg,'../gpgconf.exe'):'gpgconf';spawnSync(gpgconf,['--homedir',gpgPath(gpg,home),'--kill','gpg-agent'],{windowsHide:true});
   await removeFixture(root);
  }
 },30000);
});





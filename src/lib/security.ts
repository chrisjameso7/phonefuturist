export const PUBLIC_ORIGINS = ['https://phonefuturist.com','https://www.phonefuturist.com','https://phonefuturist-dev.phonefuturist.workers.dev'] as const;
export function allowedOrigins(expected:string,additional:readonly string[]=[]){
 const origins=new Set<string>(PUBLIC_ORIGINS);
 for(const value of [expected,...additional]){try{const u=new URL(value);if(u.origin===value&&(u.protocol==='https:'||u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))origins.add(value);}catch{/* Ignore malformed configuration. */}}
 try{if(['localhost','127.0.0.1'].includes(new URL(expected).hostname)){origins.add('http://localhost:4321');origins.add('http://127.0.0.1:4321');}}catch{}
 return [...origins];
}
export function validOrigin(origin:string|null,expected:string,additional:readonly string[]=[]):boolean{
 return origin!==null&&allowedOrigins(expected,additional).includes(origin);
}
export function requestOrigin(request:Request,expected:string,additional:readonly string[]=[]){
 const origin=new URL(request.url).origin;return validOrigin(origin,expected,additional)?origin:expected;
}
export function corsHeaders(origin:string|null,expected:string,additional:readonly string[]=[]){
 const headers=new Headers({'Vary':'Origin'});
 if(validOrigin(origin,expected,additional)){headers.set('Access-Control-Allow-Origin',origin!);headers.set('Access-Control-Allow-Credentials','true');}
 return headers;
}
export const HANDLE_PATTERN=/^[a-z0-9_]{3,20}$/;
export const HANDLE_HELP='Use 3–20 characters: only lowercase letters, numbers, and underscores are permitted.';
export function validPassword(password: string): boolean {
  return password.length >= 12 && password.length <= 128;
}
export function safeNext(value: string | null): string {
  return value === '/account/password' ? value : '/account';
}
export async function boundedForm(request: Request): Promise<URLSearchParams> {
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) throw new Error('Unsupported form');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing form');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 16384) { await reader.cancel(); throw new Error('Form too large'); } chunks.push(part.value); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new URLSearchParams(new TextDecoder().decode(bytes));
}

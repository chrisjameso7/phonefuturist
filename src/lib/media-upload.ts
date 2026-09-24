export const MAX_IMAGE_BYTES=10*1024*1024;
export class MediaRequestError extends Error {
  constructor(message:string,public status:number){super(message);}
}
export async function boundedImageForm(request:Request):Promise<FormData> {
  const contentType=request.headers.get('content-type') ?? '';
  if(!contentType.toLowerCase().startsWith('multipart/form-data;')) throw new MediaRequestError('Use a multipart image upload.',415);
  const limit=MAX_IMAGE_BYTES+64*1024;
  if(Number(request.headers.get('content-length'))>limit) throw new MediaRequestError('Images must be 10 MB or smaller.',413);
  const reader=request.body?.getReader();
  if(!reader)throw new MediaRequestError('Choose an image to upload.',400);
  const chunks:Uint8Array[]=[]; let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new MediaRequestError('Upload exceeds 10 MB plus form metadata.',413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return new Response(bytes,{headers:{'content-type':contentType}}).formData();
}
// Detect mismatched/spoofed formats. This is not a full decoder or malware scanner.
export function matchesImageSignature(bytes:Uint8Array,mime:string):boolean {
  if(bytes.length<12)return false;
  const ascii=(start:number,end:number)=>String.fromCharCode(...bytes.subarray(start,end));
  if(mime==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(mime==='image/png')return [137,80,78,71,13,10,26,10].every((byte,index)=>bytes[index]===byte);
  if(mime==='image/webp')return ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP';
  if(mime==='image/avif'){
    if(ascii(4,8)!=='ftyp')return false;
    const boxSize=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0);
    if(boxSize<16||boxSize>bytes.length)return false;
    if(['avif','avis'].includes(ascii(8,12)))return true;
    for(let i=16;i+4<=Math.min(boxSize,256);i+=4)if(['avif','avis'].includes(ascii(i,i+4)))return true;
  }
  return false;
}

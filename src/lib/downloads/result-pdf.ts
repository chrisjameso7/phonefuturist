type PdfImage = { width:number;height:number;jpeg:Uint8Array };
/** Minimal image-only PDF container. Images are authored locally, never fetched. */
export function imagePagesPdf(pages:PdfImage[]):Blob {
  if(!pages.length||pages.length>100)throw new Error('Unable to create this PDF.');
  const encode=(text:string)=>new TextEncoder().encode(text),parts:Uint8Array[]=[],offsets:number[]=[0];let length=0;
  const write=(data:string|Uint8Array)=>{const bytes=typeof data==='string'?encode(data):data;parts.push(bytes);length+=bytes.byteLength;};
  const object=(id:number,body:string|(()=>void))=>{offsets[id]=length;write(id+' 0 obj\n');if(typeof body==='string')write(body);else body();write('\nendobj\n');};
  write('%PDF-1.4\n%PhoneFuturist\n');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,'<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>');
  pages.forEach((page,i)=>{
    if(!Number.isFinite(page.width)||!Number.isFinite(page.height)||page.width<=0||page.height<=0||!page.jpeg.length)throw new Error('Invalid PDF page.');
    const id=3+i*3;
    object(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /PageImage '+(id+2)+' 0 R >> >> /Contents '+(id+1)+' 0 R >>');
    const stream='q\n595.28 0 0 841.89 0 0 cm\n/PageImage Do\nQ\n';
    object(id+1,'<< /Length '+encode(stream).byteLength+' >>\nstream\n'+stream+'endstream');
    object(id+2,()=>{write('<< /Type /XObject /Subtype /Image /Width '+page.width+' /Height '+page.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+page.jpeg.byteLength+' >>\nstream\n');write(page.jpeg);write('\nendstream');});
  });
  const xref=length,size=3+pages.length*3;write('xref\n0 '+size+'\n0000000000 65535 f \n');for(let id=1;id<size;id++)write(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
  write('trailer\n<< /Size '+size+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
  return new Blob(parts.map(part=>Uint8Array.from(part).buffer),{type:'application/pdf'});
}
async function jpeg(canvas:HTMLCanvasElement){const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));if(!blob)throw new Error('PDF rendering unavailable.');return {width:canvas.width,height:canvas.height,jpeg:new Uint8Array(await blob.arrayBuffer())};}
export type PdfHeading={title:string;subtitle:string;summary?:string;brand?:string;footer?:string};
function pageHeader(ctx:CanvasRenderingContext2D,width:number,height:number,heading:PdfHeading,page:number,total:number){
  const scale=width/1080;ctx.fillStyle='#080e18';ctx.fillRect(0,0,width,height);ctx.fillStyle='#75e4d1';ctx.font=`${24*scale}px Arial`;ctx.fillText(heading.brand??'PHONEFUTURIST / LABS',64*scale,68*scale,952*scale);
  ctx.fillStyle='#fff';ctx.font=`bold ${40*scale}px Arial`;ctx.fillText(heading.title,64*scale,130*scale,952*scale);ctx.font=`${28*scale}px Arial`;ctx.fillText(heading.subtitle,64*scale,183*scale,952*scale);
  ctx.fillStyle='#aebbc9';ctx.font=`${22*scale}px Arial`;if(heading.summary)ctx.fillText(heading.summary,64*scale,229*scale,952*scale);ctx.fillStyle='#29394a';ctx.fillRect(64*scale,252*scale,952*scale,2*scale);
  ctx.fillStyle='#aebbc9';ctx.font=`${18*scale}px Arial`;ctx.fillText(heading.footer??'PhoneFuturist · Simulated results',64*scale,height-42*scale,790*scale);ctx.textAlign='right';ctx.fillText(page+' / '+total,width-64*scale,height-42*scale);ctx.textAlign='left';
}
/** Convert only tall downloads. Break positions keep complete metric rows and charts together. */
export async function longCanvasPdf(canvas:HTMLCanvasElement,heading:PdfHeading,layout:{top:number;bottom:number;breaks:number[]}):Promise<Blob|null>{
  if(canvas.height<=canvas.width*4/3)return null;
  const scale=canvas.width/1080,pageHeight=Math.round(canvas.width*841.89/595.28),top=280*scale,capacity=pageHeight-top-100*scale;
  const slices:Array<[number,number]>=[];let start=layout.top;
  while(start<layout.bottom){const end=Math.min(layout.bottom,start+capacity);const candidates=layout.breaks.filter(n=>n>start&&n<=end);const stop=end===layout.bottom?end:candidates.at(-1)??end;if(stop<=start)throw new Error('PDF pagination failed.');slices.push([start,stop]);start=stop;if(slices.length>100)throw new Error('Result is too large to download.');}
  const pages:PdfImage[]=[];
  for(let i=0;i<slices.length;i++){const page=document.createElement('canvas');page.width=canvas.width;page.height=pageHeight;const ctx=page.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');pageHeader(ctx,page.width,page.height,heading,i+1,slices.length);const [from,to]=slices[i];ctx.drawImage(canvas,0,from,canvas.width,to-from,0,top,canvas.width,to-from);pages.push(await jpeg(page));}
  return imagePagesPdf(pages);
}
export async function downloadLongCanvas(canvas:HTMLCanvasElement,filename:string,heading:PdfHeading,layout:{top:number;bottom:number;breaks:number[]}):Promise<boolean>{
  const blob=await longCanvasPdf(canvas,heading,layout);if(!blob)return false;downloadBlob(blob,filename.replace(/\.(png|pdf)$/i,'')+'.pdf');return true;
}
export function downloadBlob(blob:Blob,filename:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
/** Detailed legacy receipts paginate before rendering, avoiding a very tall canvas. */
export async function textReceiptPdf(heading:PdfHeading,sections:Array<{title:string;lines:string[]}>):Promise<Blob>{
  const measure=document.createElement('canvas').getContext('2d');if(!measure)throw new Error('Canvas unavailable');
  type Line={text:string;bold:boolean;y:number};const layouts:Line[][]=[[]];let y=290;
  function add(text:string,bold=false){measure!.font=(bold?'bold ':'')+'25px Arial';const words=text.split(/\s+/);let line='';
    const emit=()=>{if(y>1390){layouts.push([]);y=290;}layouts.at(-1)!.push({text:line,bold,y});y+=36;line='';};
    for(const word of words){const next=line?line+' '+word:word;if(measure!.measureText(next).width>940&&line)emit();if(measure!.measureText(word).width>940){for(const ch of word){if(measure!.measureText(line+ch).width>940)emit();line+=ch;}}else line=line?line+' '+word:word;}if(line)emit();y+=10;
  }
  for(const section of sections){if(y>1290){layouts.push([]);y=290;}add(section.title,true);for(const line of section.lines)add(line);y+=22;}
  if(layouts.length>100)throw new Error('Result is too large to download.');const pages:PdfImage[]=[];
  for(let i=0;i<layouts.length;i++){const page=document.createElement('canvas');page.width=2160;page.height=3056;const ctx=page.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');pageHeader(ctx,2160,3056,heading,i+1,layouts.length);ctx.scale(2,2);ctx.textBaseline='top';for(const line of layouts[i]){ctx.font=(line.bold?'bold ':'')+'25px Arial';ctx.fillStyle=line.bold?'#75e4d1':'#edf3fb';ctx.fillText(line.text,64,line.y);}pages.push(await jpeg(page));}
  return imagePagesPdf(pages);
}

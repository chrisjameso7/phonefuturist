import {afterEach,it,expect,vi} from 'vitest';
import {imagePagesPdf,longCanvasPdf,textReceiptPdf} from '../src/lib/downloads/result-pdf';
afterEach(()=>vi.unstubAllGlobals());
it('keeps compact cards as images and rejects empty PDF documents',async()=>{
  expect(await longCanvasPdf({width:1080,height:1350} as HTMLCanvasElement,{title:'Card',subtitle:'Concept'},{top:0,bottom:1350,breaks:[]})).toBeNull();
  expect(()=>imagePagesPdf([])).toThrow();
  expect(()=>imagePagesPdf([{width:0,height:10,jpeg:new Uint8Array([1])}])).toThrow();
});
function canvasEnvironment(){
  const crops:unknown[][]=[],text:string[]=[];
  const ctx={fillStyle:'',font:'',textAlign:'',textBaseline:'',fillRect:vi.fn(),fillText:(s:string)=>text.push(s),drawImage:(...args:unknown[])=>crops.push(args),scale:vi.fn(),measureText:(s:string)=>({width:s.length*13})};
  vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>ctx,toBlob:(callback:(b:Blob)=>void)=>callback(new Blob([new Uint8Array([255,216,255,217])],{type:'image/jpeg'}))})});
  return {crops,text};
}
it('keeps whole result rows together and numbers every PDF page',async()=>{
  const {crops,text}=canvasEnvironment();
  const blob=await longCanvasPdf({width:1080,height:2600} as HTMLCanvasElement,{title:'BOM',subtitle:'Named phone'},{top:300,bottom:2400,breaks:[900,1500,2100,2400]});
  expect(blob?.type).toBe('application/pdf');expect(crops.map(c=>[c[2],c[4]])).toEqual([[300,600],[900,600],[1500,900]]);expect(text).toContain('1 / 3');expect(text).toContain('3 / 3');expect(text.filter(t=>t==='Named phone')).toHaveLength(3);
  expect((await blob!.text()).startsWith('%PDF-1.4')).toBe(true);
});
it('paginates very long receipts before creating large canvases and preserves long words',async()=>{
  const {text}=canvasEnvironment(),word='x'.repeat(190);
  const blob=await textReceiptPdf({title:'Receipt',subtitle:'Concept'},[{title:'RESULTS',lines:[...Array.from({length:90},(_,i)=>'Unique result '+i),word]}]);
  expect(blob.type).toBe('application/pdf');expect(text).toContain('Unique result 0');expect(text).toContain('Unique result 89');expect(text.filter(t=>/^x+$/.test(t)).join('')).toBe(word);expect(text.some(t=>/^4 \/ 4$/.test(t))).toBe(true);
});

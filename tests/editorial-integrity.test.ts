import {expect,it} from 'vitest';
import {blocksToContent,contentToBlocks} from '../src/lib/rich-content';
import {boundedJson} from '../src/lib/editorial';
import {boundedImageForm, matchesImageSignature, MAX_IMAGE_BYTES} from '../src/lib/media-upload';
it('round-trips image provenance and rich inline formatting without making entire paragraphs links',()=>{
 const image={type:'image' as const,text:'',url:'https://example.test/a.webp',alt:'Device',caption:'Caption',credit:'Photographer',sourceName:'Source',sourceUrl:'https://example.test/source',rightsNote:'Permission',ownership:'external'};
 const blocks=contentToBlocks({type:'doc',content:[{type:'heading',attrs:{level:3},content:[{type:'text',text:'Bold',marks:[{type:'bold'}]}]},{type:'paragraph',content:[{type:'text',text:'Before '},{type:'text',text:'link',marks:[{type:'link',attrs:{href:'https://example.test'}}]},{type:'hardBreak'},{type:'text',text:'After',marks:[{type:'italic'}]}]},{type:'orderedList',content:[{type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:'First'}]}]}]}]});
 const result=contentToBlocks(blocksToContent([...blocks,image]));
 expect(result).toEqual([...blocks,image]);
 expect(result[1].inline?.[0].href).toBeUndefined();expect(result[1].inline?.[1].href).toBe('https://example.test');expect(result[1].text).toBe('Before link\nAfter');expect(result[2].ordered).toBe(true);
});
it('accepts longform JSON over the old 300KB limit and stops streams above 2MB',async()=>{
 const request=(body:string)=>new Request('https://example.test',{method:'POST',headers:{'content-type':'application/json'},body});
 expect((await boundedJson(request(JSON.stringify({text:'a'.repeat(400000)})))).text).toHaveLength(400000);
 await expect(boundedJson(request(JSON.stringify({text:'a'.repeat(2200000)})))) .rejects.toThrow('2 MB');
});
it('bounds multipart before parsing even without Content-Length and checks format signatures',async()=>{
 const request=new Request('https://example.test',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=x'},body:new Uint8Array(MAX_IMAGE_BYTES+65537)});
 await expect(boundedImageForm(request)).rejects.toThrow('10 MB');
 const html=new TextEncoder().encode('<script>alert(1)</script>');expect(matchesImageSignature(html,'image/png')).toBe(false);
 expect(matchesImageSignature(new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]),'image/png')).toBe(true);
 expect(matchesImageSignature(new TextEncoder().encode('RIFF0000WEBPxxxx'),'image/webp')).toBe(true);
});

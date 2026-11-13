export type Confidence = 'confirmed' | 'reported' | 'rumor';
export function articleConfidence(article:{section:string;confidence?:Confidence|null;withdrawn?:boolean}):Confidence|null {
 if(article.withdrawn)return null;
 if(article.confidence && ['confirmed','reported','rumor'].includes(article.confidence))return article.confidence;
 return article.section==='news'?'confirmed':article.section==='leaks'?'reported':null;
}
export const sections = ['news', 'reports', 'leaks', 'analysis'] as const;
export type Section = typeof sections[number];
export type InlineText = { text: string; bold?: boolean; italic?: boolean; strike?: boolean; code?: boolean; href?: string };
export const MAX_ARTICLE_REQUEST_BYTES = 2 * 1024 * 1024;
export type Block = {
  type: 'paragraph' | 'heading' | 'quote' | 'list' | 'link' | 'image';
  text: string;
  url?: string;
  alt?: string;
  caption?: string;
  credit?: string;
  sourceUrl?: string;
  sourceName?: string;
  rightsNote?: string;
  ownership?: string;
  inline?: InlineText[];
  items?: InlineText[][];
  level?: number;
  ordered?: boolean;
};export type Source = { label: string; url: string; note: string };
export type ArticlePayload = { confidence?: Confidence | null; schemaVersion: 1; title: string; summary: string; byline: string; section: Section; slug: string; blocks: Block[]; sources: Source[]; privateNotes: string; changeKind: 'initial'|'minor'|'update'|'correction'; correctionNote: string };
export type StudioItem = { id: string; version: number; current_revision: number; state: string; title?: string; section?: Section; public_revision: number|null; canonical_path: string|null; withdrawn: boolean; updated_at: string };
export type StudioArticle = StudioItem & { creator_id: string; revision_author: string; payload: ArticlePayload; events: {id:number;revision:number;action:string;message:string;recorded_at:string}[]; revisions:{revision:number;created_at:string;title:string}[] };
export type PublishedArticle = {confidence?:Confidence|null;id:string;canonical_path:string;published_at:string;updated_at:string;withdrawn:boolean;withdrawal_note:string|null;title:string;byline:string;section:Section;summary:string;blocks:Block[];sources:Source[];correction_note:string;card_image?:{url:string;alt:string|null;credit?:string|null;caption?:string|null;sourceName?:string|null}|null;public_notes?:{revision:number;recorded_at:string;message:string}[]};
export function emptyArticle(): ArticlePayload { return {schemaVersion:1,title:'',summary:'',byline:'',section:'news',slug:'',blocks:[{type:'paragraph',text:''}],sources:[],privateNotes:'',changeKind:'initial',correctionNote:''}; }
export function validUuid(value:unknown): value is string {return typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);}
export function safeHttps(value:unknown): value is string {if(typeof value!=='string')return false;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
export async function boundedJson(request:Request):Promise<Record<string,unknown>> {
 if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')throw new Error('Use JSON');
 const reader=request.body?.getReader();if(!reader)throw new Error('Missing request');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>MAX_ARTICLE_REQUEST_BYTES){await reader.cancel();throw new Error('Article exceeds 2 MB');}chunks.push(part.value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('Invalid JSON');return value;
}
export function studioError(error:{code?:string;message?:string}):{status:number;message:string} {
 if(error.code==='42501')return {status:403,message:error.message?.includes('SELF_APPROVAL')?'Another editor must approve an article you contributed to.':'Your account does not have permission for this action.'};
 if(error.code==='40001')return {status:409,message:'Someone changed this article. Reload before saving; your unsaved text is still in this page.'};
 if(error.code==='23505')return {status:409,message:'That publication URL is already in use. Choose a different slug.'};
 if(error.message?.startsWith('STUDIO_INVALID:'))return {status:422,message:error.message.substring(16).trim()};
 return {status:503,message:'Studio could not complete the request. Your unsaved text is still in this page.'};
}

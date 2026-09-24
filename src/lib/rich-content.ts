import type { JSONContent } from '@tiptap/react';
import { safeHttps, type Block, type InlineText } from './editorial';

function inlineNodes(parts: InlineText[]): JSONContent[] {
  return parts.flatMap(part => part.text.split('\n').flatMap((text, index) => [
    ...(index ? [{type: 'hardBreak'}] : []),
    ...(text ? [{type: 'text', text, marks: [
      ...(part.bold ? [{type:'bold'}] : []), ...(part.italic ? [{type:'italic'}] : []),
      ...(part.strike ? [{type:'strike'}] : []), ...(part.code ? [{type:'code'}] : []),
      ...(safeHttps(part.href) ? [{type:'link',attrs:{href:part.href}}] : []),
    ]}] : []),
  ]));
}
function readInline(node: JSONContent): InlineText[] {
  if(node.type === 'hardBreak') return [{text:'\n'}];
  if(node.type === 'text') {
    const marks=node.marks ?? [];
    const href=marks.find(mark=>mark.type==='link')?.attrs?.href;
    return [{text:node.text ?? '',
      ...(marks.some(m=>m.type==='bold') ? {bold:true} : {}),
      ...(marks.some(m=>m.type==='italic') ? {italic:true} : {}),
      ...(marks.some(m=>m.type==='strike') ? {strike:true} : {}),
      ...(marks.some(m=>m.type==='code') ? {code:true} : {}),
      ...(safeHttps(href) ? {href} : {}),
    }];
  }
  return (node.content ?? []).flatMap((child,index)=>[
    ...(index && child.type==='paragraph' ? [{text:'\n'}] : []), ...readInline(child),
  ]);
}
const plain=(parts:InlineText[])=>parts.map(part=>part.text).join('');
export function blocksToContent(blocks: Block[]): JSONContent {
  return {type:'doc',content:blocks.map(block=>{
    if(block.type==='image') return {type:'image',attrs:{src:block.url ?? '',alt:block.alt ?? '',title:block.caption ?? '',credit:block.credit ?? '',sourceUrl:block.sourceUrl ?? '',sourceName:block.sourceName ?? '',rightsNote:block.rightsNote ?? '',ownership:block.ownership ?? ''}};
    const parts=block.inline ?? [{text:block.text,...(block.type==='link' && safeHttps(block.url)?{href:block.url}:{})}];
    if(block.type==='heading') return {type:'heading',attrs:{level:block.level ?? 2},content:inlineNodes(parts)};
    if(block.type==='quote') return {type:'blockquote',content:[{type:'paragraph',content:inlineNodes(parts)}]};
    if(block.type==='list') return {type:block.ordered?'orderedList':'bulletList',content:(block.items ?? block.text.split('\n').map(text=>[{text}])).map(item=>({type:'listItem',content:[{type:'paragraph',content:inlineNodes(item)}]}))};
    return {type:'paragraph',content:inlineNodes(parts)};
  })};
}
export function contentToBlocks(doc: JSONContent): Block[] {
  const blocks:Block[]=(doc.content ?? []).map(node=>{
    if(node.type==='image') return {type:'image',text:'',url:node.attrs?.src ?? '',alt:node.attrs?.alt ?? '',caption:node.attrs?.title ?? '',credit:node.attrs?.credit ?? '',sourceUrl:node.attrs?.sourceUrl ?? '',sourceName:node.attrs?.sourceName ?? '',rightsNote:node.attrs?.rightsNote ?? '',ownership:node.attrs?.ownership ?? ''};
    const inline=readInline(node);
    if(node.type==='bulletList'||node.type==='orderedList') {
      const items=(node.content ?? []).map(readInline);
      return {type:'list',text:items.map(plain).join('\n'),items,ordered:node.type==='orderedList'};
    }
    return {type:node.type==='heading'?'heading':node.type==='blockquote'?'quote':'paragraph',text:plain(inline),inline,...(node.type==='heading'?{level:node.attrs?.level===3?3:2}:{})};
  });
  return blocks.length?blocks:[{type:'paragraph',text:''}];
}
export function sameBlocks(a: Block[], b: Block[]) {
  return JSON.stringify(blocksToContent(a))===JSON.stringify(blocksToContent(b));
}

import { useEffect, useState } from 'react';
import { emptyArticle, sections, type ArticlePayload, type Block, type StudioArticle } from '../../lib/editorial';
import './studio.css';
type Props={article:StudioArticle|null;roles:string[];userId:string};
export default function ArticleEditor({article:initial,roles,userId}:Props){
 const [article,setArticle]=useState(initial);const [draft,setDraft]=useState<ArticlePayload>(()=>initial?.payload??emptyArticle());
 const [dirty,setDirty]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [reason,setReason]=useState('');
 const admin=roles.includes('admin'), editor=admin||roles.includes('editor'),publisher=admin||roles.includes('publisher');
 const canEdit=editor||((!article||article.creator_id===userId)&&roles.includes('writer'));
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function change<K extends keyof ArticlePayload>(key:K,value:ArticlePayload[K]){setDraft(p=>({...p,[key]:value}));setDirty(true);}
 function block(index:number,changeValue:Partial<Block>){change('blocks',draft.blocks.map((b,i)=>i===index?{...b,...changeValue}:b));}
 function move(index:number,delta:number){const blocks=[...draft.blocks];[blocks[index],blocks[index+delta]]=[blocks[index+delta],blocks[index]];change('blocks',blocks);}
 async function act(action:string){
  setBusy(true);setMessage('');
  try{
   const response=await fetch('/studio/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:article?.id,version:article?.version,action,payload:['save','create'].includes(action)?draft:{reason}})});
   if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Your session may have expired. Sign in again in another tab before retrying; keep this draft open.');
   const result=await response.json();if(!response.ok)throw new Error(result.error??'The request failed.');
   if(action==='create'){setDirty(false);window.location.assign('/studio/articles/'+result.data.id);return;}
   const refreshed=await fetch('/studio/api?id='+article!.id);if(!refreshed.ok)throw new Error('The action completed, but refresh failed. Reload before making further changes.');
   const current=await refreshed.json();setArticle(current.data);setDraft(current.data.payload);setDirty(false);setReason('');
   setMessage(action==='save'?'Draft saved as a new revision.':action==='publish'||action==='override_publish'?'Published. The canonical article is now available.':'Action recorded.');
  }catch(error){setMessage(error instanceof Error?error.message:'Connection failed. Keep this page open; your unsaved text is retained.');}finally{setBusy(false);}
 }
 return <div className="studio-workspace">
  <div className="studio-top"><div><span className="studio-state">{article?.state.replaceAll('_',' ')??'New draft'} {dirty?'· unsaved changes':''}</span><h1>{article?'Edit article':'Write an article'}</h1></div><a href="/studio">All articles</a></div>
  {message&&<p className="studio-message" role="status">{message}</p>}
  <p className="studio-help">Public sources appear with the article. Keep confidential identities and research in Private notes. Save before requesting a workflow action.</p>
  <div className="studio-columns"><section>
   <fieldset disabled={!canEdit||busy} className="studio-fields"><legend>Article</legend>
    <label>Headline<input maxLength={180} value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
    <label>Summary<textarea maxLength={500} rows={3} value={draft.summary} onChange={e=>change('summary',e.target.value)}/></label>
    <div className="studio-pair"><label>Section<select value={draft.section} onChange={e=>change('section',e.target.value as ArticlePayload['section'])}>{sections.map(s=><option key={s}>{s}</option>)}</select></label><label>Public byline<input maxLength={160} value={draft.byline} onChange={e=>change('byline',e.target.value)}/></label></div>
    <label>URL slug<input maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={e=>change('slug',e.target.value)}/></label><small>Lowercase words separated by hyphens. After publication, headline and slug edits do not change the canonical URL.</small>
    <h2>Article body</h2>
    {draft.blocks.map((b,i)=><section className="studio-block" key={i}><div className="studio-block-tools"><label>Block {i+1}<select value={b.type} onChange={e=>block(i,{type:e.target.value as Block['type']})}>{['paragraph','heading','quote','list','link'].map(t=><option key={t}>{t}</option>)}</select></label><button type="button" disabled={i===0} onClick={()=>move(i,-1)} aria-label={'Move block '+(i+1)+' up'}>↑</button><button type="button" disabled={i===draft.blocks.length-1} onClick={()=>move(i,1)} aria-label={'Move block '+(i+1)+' down'}>↓</button><button type="button" onClick={()=>change('blocks',draft.blocks.filter((_,j)=>j!==i))}>Remove block {i+1}</button></div><label>{b.type==='list'?'List items (one per line)':b.type==='link'?'Link text':'Text'}<textarea rows={b.type==='heading'?2:5} maxLength={10000} value={b.text} onChange={e=>block(i,{text:e.target.value})}/></label>{b.type==='link'&&<label>HTTPS link<input type="url" value={b.url??''} maxLength={2048} onChange={e=>block(i,{url:e.target.value})}/></label>}</section>)}
    <button type="button" disabled={draft.blocks.length>=100} onClick={()=>change('blocks',[...draft.blocks,{type:'paragraph',text:''}])}>Add content block</button>
    <h2>Public sources</h2><p>At least one complete source is required to submit. These details are public when published.</p>
    {draft.sources.map((s,i)=><section className="studio-block" key={i}><label>Source {i+1} label<input maxLength={200} value={s.label} onChange={e=>change('sources',draft.sources.map((v,j)=>i===j?{...v,label:e.target.value}:v))}/></label><label>Source URL<input type="url" maxLength={2048} value={s.url} onChange={e=>change('sources',draft.sources.map((v,j)=>i===j?{...v,url:e.target.value}:v))}/></label><label>What this supports (public)<textarea maxLength={1000} value={s.note} onChange={e=>change('sources',draft.sources.map((v,j)=>i===j?{...v,note:e.target.value}:v))}/></label><button type="button" onClick={()=>change('sources',draft.sources.filter((_,j)=>i!==j))}>Remove source {i+1}</button></section>)}
    <button type="button" disabled={draft.sources.length>=30} onClick={()=>change('sources',[...draft.sources,{label:'',url:'',note:''}])}>Add source</button>
    <label>Private notes<textarea rows={5} maxLength={12000} value={draft.privateNotes} onChange={e=>change('privateNotes',e.target.value)}/></label>
    <label>Change classification<select value={draft.changeKind} onChange={e=>change('changeKind',e.target.value as ArticlePayload['changeKind'])}>{['initial','minor','update','correction'].map(s=><option key={s}>{s}</option>)}</select></label>
    <label>Public correction/update note<textarea maxLength={2000} value={draft.correctionNote} onChange={e=>change('correctionNote',e.target.value)}/></label>
   </fieldset>
   {canEdit&&<button className="studio-save" disabled={busy} onClick={()=>act(article?'save':'create')}>{busy?'Working…':article?'Save new revision':'Create draft'}</button>}
  </section><aside className="studio-sidebar">
   <h2>Editorial workflow</h2>{article?<><p>Revision {article.current_revision} · Version {article.version}</p>{article.canonical_path&&<a href={article.canonical_path}>Open {article.withdrawn?'withdrawn':'published'} article ↗</a>}
    <div className="studio-actions">
    {canEdit&&['draft','changes_requested'].includes(article.state)&&<button disabled={busy||dirty} onClick={()=>act('submit')}>Submit for review</button>}
    {editor&&['submitted','approved'].includes(article.state)&&<><button disabled={busy||dirty} onClick={()=>act('approve')}>Approve revision</button><button disabled={busy||dirty||reason.trim().length<5} onClick={()=>act('request_changes')}>Request changes</button></>}
    {publisher&&article.state==='approved'&&<button disabled={busy||dirty} onClick={()=>act('publish')}>Publish approved revision</button>}
    <label>Review note / action reason<textarea rows={4} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    {publisher&&article.public_revision&&<button disabled={busy||dirty||reason.trim().length<10} onClick={()=>act('withdraw')}>Withdraw with public notice</button>}
    {admin&&<details><summary>Emergency Admin publication</summary><p>Bypasses ordinary editorial approval, not validation or MFA. Explain why normal review cannot be completed. The reason is permanently audited.</p><button disabled={busy||dirty||reason.trim().length<20} onClick={()=>act('override_publish')}>Publish with audited override</button></details>}
    </div><h2>Activity</h2><ol className="studio-history">{article.events.map(e=><li key={e.id}><strong>{e.action.replaceAll('_',' ')}</strong> · revision {e.revision}<br/><time>{new Date(e.recorded_at).toISOString().slice(0,16).replace('T',' ')} UTC</time>{e.message&&<p>{e.message}</p>}</li>)}</ol><h2>Saved revisions</h2><ol className="studio-history">{article.revisions.map(r=><li key={r.revision}>Revision {r.revision}: {r.title}</li>)}</ol></>:<p>Create the draft to begin review. Drafts are private and never appear on the publication.</p>}
  </aside></div>
 </div>;
}

import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import AvatarUpload from './AvatarUpload';
type Profile = { display_name: string; handle: string; bio: string; avatar_url?: string | null };
export default function CreatorProfileEditor({ profile }: { profile: Profile | null }) {
  const saved=useRef(false);
  const empty={display_name:'',handle:'',bio:''};
  const [editing,setEditing]=useState(false),[draft,setDraft]=useState<Profile>(profile??empty);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmDiscard,setConfirmDiscard]=useState(false);
  const dirty=editing&&JSON.stringify(draft)!==JSON.stringify(profile??empty);
  useEffect(()=>{
    if(!dirty)return;
    const prevent=(event:BeforeUnloadEvent)=>{if(saved.current)return;event.preventDefault();};
    window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);
  },[dirty]);
  async function save(event:SyntheticEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError('');
    try{
      const response=await fetch('/account/api/creator-profile',{method:'POST',headers:{Accept:'application/json'},body:new FormData(event.currentTarget)});
      const body=await response.json();if(!response.ok)throw new Error(body.error??'Could not save profile.');
      saved.current=true;setEditing(false);window.location.assign('/account?profile=saved');
    }catch(e){setError(e instanceof Error?e.message:'Could not save profile. Please retry.');setBusy(false);}
  }
  if(!editing)return <div className="creator-profile-view">
    {profile?<><h3>{profile.display_name}</h3><p className="muted">@{profile.handle}</p><p>{profile.bio||'Add a short bio to introduce yourself.'}</p></>:<p>Create your public identity to share your builds.</p>}
    <button type="button" className="button" onClick={()=>{setDraft(profile??empty);setError('');setEditing(true);}}>{profile?'Edit Profile':'Create profile'}</button>
  </div>;
  return <div className="creator-profile-edit">
    <section aria-label="Profile image"><h3>Profile image</h3><p className="muted">PNG, JPEG or WebP, up to 2 MB. Image uploads save immediately.</p><AvatarUpload/></section>
    <form className="account-creator-form" onSubmit={save} aria-label="Edit creator profile" aria-busy={busy}>
      <div className="account-form-grid">
        <label><span>Display name</span><input name="display_name" maxLength={60} required disabled={busy} value={draft.display_name} onChange={e=>setDraft(d=>({...d,display_name:e.target.value}))}/></label>
        <label><span>Handle</span><input name="handle" maxLength={24} minLength={3} pattern="[a-z0-9_]{3,24}" required disabled={busy} value={draft.handle} onChange={e=>setDraft(d=>({...d,handle:e.target.value}))}/></label>
      </div>
      <label><span>Bio</span><textarea name="bio" maxLength={240} rows={3} disabled={busy} value={draft.bio} onChange={e=>setDraft(d=>({...d,bio:e.target.value}))}/></label>
      {error&&<p role="alert">{error}</p>}
      <div className="lab-action-row"><button className="button" disabled={busy} type="submit">{busy?'Saving…':'Save profile'}</button><button className="secondary" type="button" disabled={busy} onClick={()=>{if(dirty){setConfirmDiscard(true);return;}setEditing(false);setError('');}}>Cancel</button></div>
      {confirmDiscard&&<div role="alertdialog" aria-labelledby="discard-profile-title"><p id="discard-profile-title">Discard your unsaved profile changes?</p><div className="lab-action-row"><button type="button" className="secondary" onClick={()=>setConfirmDiscard(false)}>Keep editing</button><button type="button" className="secondary" onClick={()=>{setDraft(profile??empty);setConfirmDiscard(false);setEditing(false);setError('');}}>Discard edits</button></div></div>}
    </form>
  </div>;
}

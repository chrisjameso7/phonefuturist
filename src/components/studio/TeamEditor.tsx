import { useInstrumentReady } from '../../lib/use-instrument-ready';
import { useRef, useState, type SubmitEvent } from 'react';
import { emptyTeamMember, type TeamMember } from '../../lib/team';

type Creator = { user_id: string; handle: string; display_name: string };
export default function TeamEditor({ initial, creators }: { initial: TeamMember[]; creators: Creator[] }) {
  useInstrumentReady('TeamEditor');
  const [members, setMembers] = useState(initial);
  const [draft, setDraft] = useState<TeamMember>(emptyTeamMember);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const locked = useRef(false);

  function change<K extends keyof TeamMember>(key: K, value: TeamMember[K]) {
    setDraft(current => ({ ...current, [key]: value }));
    setDirty(true);
    setMessage('');
  }
  function select(member: TeamMember) {
    if (dirty && !window.confirm('Discard your unsaved team profile edits?')) return;
    setDraft(structuredClone(member));
    setDirty(false);
    setMessage('');
  }
  async function operation(work: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    try { await work(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Please retry.'); }
    finally { locked.current = false; setBusy(false); }
  }
  async function request(body: Record<string, unknown>) {
    const response = await fetch('/studio/api/team', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Please retry.');
    return result;
  }
  function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void operation(async () => {
      const { member } = await request({ action: 'save', id: draft.id || null, version: draft.version, data: draft });
      setMembers(current => [...current.filter(item => item.id !== member.id), member]);
      setDraft(member);
      setDirty(false);
      setMessage(member.published ? 'Team profile published.' : 'Team draft saved.');
    });
  }
  function remove() {
    if (!draft.id || !window.confirm('Remove this team profile from the site? The linked account and articles will remain available.')) return;
    void operation(async () => {
      await request({ action: 'delete', id: draft.id, version: draft.version });
      setMembers(current => current.filter(item => item.id !== draft.id));
      setDraft(emptyTeamMember());
      setDirty(false);
      setMessage('Team profile removed.');
    });
  }
  function upload(image: File | undefined) {
    if (!image) return;
    void operation(async () => {
      const form = new FormData();
      form.set('image', image);
      const response = await fetch('/studio/api/team-image', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Photo upload failed.');
      change('image_url', result.url);
      setMessage('Photo uploaded. Save the profile to publish it.');
    });
  }

  return <div className="team-editor">
    <aside aria-label="Team profiles">
      <button type="button" disabled={busy} onClick={() => select(emptyTeamMember())}>Add team member</button>
      {[...members].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)).map(member =>
        <button key={member.id} type="button" disabled={busy} aria-pressed={draft.id === member.id}
          onClick={() => select(member)}>{member.name} · {member.published ? 'Published' : 'Draft'}</button>)}
      {!members.length && <p>No team profiles yet.</p>}
    </aside>
    <form onSubmit={save}>
      <fieldset disabled={busy}>
        <legend>{draft.id ? 'Edit team member' : 'New team member'}</legend>
        <div className="team-fields">
          <label>Name<input required maxLength={120} value={draft.name} onChange={event => change('name', event.target.value)} /></label>
          <label>Role or title<input required maxLength={120} value={draft.title} onChange={event => change('title', event.target.value)} /></label>
          <label>Profile slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={80} value={draft.slug} onChange={event => change('slug', event.target.value)} /><small>Lowercase letters, numbers and hyphens. Appears in /team/your-slug.</small></label>
          <label>Linked account<select value={draft.user_id ?? ''} onChange={event => change('user_id', event.target.value || null)}>
            <option value="">No linked account</option>
            {creators.map(creator => <option key={creator.user_id} value={creator.user_id}>{creator.display_name} (@{creator.handle})</option>)}
          </select><small>Published articles are matched to this account’s original article authorship.</small></label>
        </div>
        <label>Biography<textarea rows={6} maxLength={6000} value={draft.bio} onChange={event => change('bio', event.target.value)} /></label>
        <label>Responsibilities<textarea rows={3} maxLength={3000} value={draft.responsibilities} onChange={event => change('responsibilities', event.target.value)} /></label>
        <label>Professional interests<textarea rows={3} maxLength={2000} value={draft.interests} onChange={event => change('interests', event.target.value)} /></label>
        <label>Upload photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => upload(event.target.files?.[0])} /><small>PNG, JPEG or WebP up to 2 MB. Uploaded photos use public image storage.</small></label>
        <label>Photo URL<input type="url" maxLength={2000} value={draft.image_url} onChange={event => change('image_url', event.target.value)} /></label>
        {draft.image_url && <img className="team-photo-preview" src={draft.image_url} alt="Team photo preview" />}
        <h2>Social and professional links</h2>
        {draft.social_links.map((link, index) => <div className="team-detail-row" key={index}>
          <label>Link label<input required maxLength={80} value={link.label} onChange={event => change('social_links', draft.social_links.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} /></label>
          <label>HTTPS link<input required type="url" maxLength={2000} value={link.url} onChange={event => change('social_links', draft.social_links.map((item, i) => i === index ? { ...item, url: event.target.value } : item))} /></label>
          <button type="button" onClick={() => change('social_links', draft.social_links.filter((_, i) => i !== index))}>Remove link {index + 1}</button>
        </div>)}
        <button type="button" disabled={draft.social_links.length >= 12} onClick={() => change('social_links', [...draft.social_links, { label: '', url: '' }])}>Add social link</button>
        <h2>Additional public details</h2>
        {draft.extra_details.map((detail, index) => <div className="team-detail-row" key={index}>
          <label>Detail label<input required maxLength={80} value={detail.label} onChange={event => change('extra_details', draft.extra_details.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} /></label>
          <label>Detail text<textarea required maxLength={2000} value={detail.value} onChange={event => change('extra_details', draft.extra_details.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} /></label>
          <button type="button" onClick={() => change('extra_details', draft.extra_details.filter((_, i) => i !== index))}>Remove detail {index + 1}</button>
        </div>)}
        <button type="button" disabled={draft.extra_details.length >= 20} onClick={() => change('extra_details', [...draft.extra_details, { label: '', value: '' }])}>Add detail</button>
        <label>Display order<input type="number" min={0} max={10000} step={1} value={draft.sort_order} onChange={event => change('sort_order', Number(event.target.value))} /></label>
        <label className="team-publish"><input type="checkbox" checked={draft.published} onChange={event => change('published', event.target.checked)} />Publish on About and the team profile page</label>
        <div className="team-actions">
          <button type="submit" aria-busy={busy}>{busy ? 'Working…' : 'Save team profile'}</button>
          {draft.id && <button type="button" onClick={remove}>Remove team member</button>}
          {draft.published && draft.id && !dirty && <a href={'/team/' + draft.slug}>View public profile ↗</a>}
        </div>
      </fieldset>
      <p role="status">{message}</p>
    </form>
  </div>;
}

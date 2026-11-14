import { useState, type SyntheticEvent } from 'react';
export default function AvatarUpload() { const [busy, setBusy] = useState(false), [status, setStatus] = useState(''); async function upload(event: SyntheticEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget), file = data.get('avatar'); if (!(file instanceof File) || file.size > 2 * 1024 * 1024) {
    setStatus('Choose an image up to 2 MB.');
    return;
} setBusy(true); try {
    const response = await fetch('/account/api/avatar', { method: 'POST', body: data });
    const body = await response.json();
    if (!response.ok)
        throw new Error(body.error ?? 'Upload failed.');
    setStatus('Avatar saved. Refreshing your profile…');
    window.location.assign('/account?avatar=saved');
}
catch (error) {
    setStatus(error instanceof Error ? error.message : 'Upload failed. Please try again.');
}
finally {
    setBusy(false);
} } return <form className="account-creator-form" onSubmit={upload}><label>Choose an avatar<input type="file" name="avatar" accept="image/png,image/jpeg,image/webp" required disabled={busy}/></label><button className="button" disabled={busy} aria-busy={busy}>{busy ? 'Uploading…' : 'Upload avatar'}</button><p role="status">{status}</p></form>; }

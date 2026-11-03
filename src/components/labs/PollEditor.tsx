import { useState } from 'react';
export default function PollEditor() {
    const [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
    async function send(event: React.SyntheticEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget, data = new FormData(form), action = String(data.get('action')); setBusy(true); try {
        const payload = action === 'create' ? { action, topic: data.get('topic'), forks: String(data.get('forks')).split('\n').map(s => s.trim()).filter(Boolean), closesAt: new Date(String(data.get('closesAt'))).toISOString() } : { action, topic: data.get('topic'), winner: data.get('winner'), source: data.get('source') };
        const response = await fetch('/api/labs/polls', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        const body = await response.json();
        if (!response.ok)
            throw new Error(body.error);
        setStatus(action === 'create' ? 'Poll created: ' + body.id : 'Poll resolved. Scores and qualifying badges assigned.');
        form.reset();
    }
    catch (error) {
        setStatus(error instanceof Error ? error.message : 'Operation failed.');
    }
    finally {
        setBusy(false);
    } }
    return <div className="lab-card-grid"><form className="lab-panel lab-fields lab-one" onSubmit={send}><h2>Publish a poll</h2><input type="hidden" name="action" value="create"/><label>Prediction question<input name="topic" required minLength={5} maxLength={300}/></label><label>Design forks · one per line<textarea name="forks" required rows={4}/></label><label>Closing date · your local time<input name="closesAt" type="datetime-local" required/></label><button disabled={busy}>Publish poll</button></form><form className="lab-panel lab-fields lab-one" onSubmit={send}><h2>Resolve a closed poll</h2><input type="hidden" name="action" value="resolve"/><label>Poll ID<input name="topic" required/></label><label>Winning fork · exact option text<input name="winner" required/></label><label>Source URL<input name="source" type="url" required placeholder="https://"/></label><p className="lab-note">Resolution is final. Confirm the outcome against the linked source before submitting.</p><button disabled={busy}>Resolve & award scores</button></form><p role="status">{status}</p></div>;
}

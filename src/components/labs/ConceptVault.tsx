import { useEffect, useRef, useState } from 'react';
type Poll = {
    id: string;
    topic: string;
    forks: string[];
    closesAt: string;
    resolved: boolean;
    selectedFork: string | null;
    winningFork: string | null;
    resolutionSource: string | null;
    total: number;
    percentages: number[] | null;
};
export default function ConceptVault() {
    const [polls, setPolls] = useState<Poll[]>([]), [signedIn, setSignedIn] = useState(false), [status, setStatus] = useState('Loading active polls…'), [pending, setPending] = useState<string | null>(null);
    const requestSequence = useRef(0);
    async function load(signal?: AbortSignal) { const sequence=++requestSequence.current; const response = await fetch('/api/labs/vault', { signal }); const body = await response.json(); if (!response.ok)
        throw new Error(body.error ?? 'Vault unavailable.'); if(sequence!==requestSequence.current)return; setPolls(body.polls); setSignedIn(body.signedIn); setStatus(body.polls.length ? '' : 'No active polls yet. Check back for the next design fork.'); }
    useEffect(() => { const controller = new AbortController(); load(controller.signal).catch(error => { if (error.name !== 'AbortError')
        setStatus(error.message); }); const timer = setInterval(() => { if (!document.hidden)
        load(controller.signal).catch(() => { }); }, 30000); return () => { controller.abort(); requestSequence.current++; clearInterval(timer); }; }, []);
    async function lock(poll: Poll, fork: string) { if (!window.confirm('Lock in “' + fork + '”? Your prediction cannot be changed.'))
        return; setPending(poll.id); setStatus('Locking prediction…'); try {
        const response = await fetch('/api/labs/vault', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topic: poll.id, fork }) });
        const body = await response.json();
        if (!response.ok)
            throw new Error(body.error ?? 'Could not lock prediction.');
        await load();
        setStatus('Prediction locked. Community results revealed.');
    }
    catch (error) {
        setStatus(error instanceof Error ? error.message : 'Please try again.');
    }
    finally {
        setPending(null);
    } }
    return <section aria-label="Concept prediction vault"><div className="lab-vault-head"><div><p className="lab-kicker">03 / Commit to a perspective</p><h2>Make your call.</h2></div><p>Vote blind. Lock once. See where the community stands.</p></div><p role="status">{status}</p><div className="lab-poll-grid">{polls.map(poll => <article className="lab-glass" key={poll.id}><span className="lab-kicker">{poll.resolved ? 'Resolved' : new Date(poll.closesAt) <= new Date() ? 'Voting closed' : 'Open prediction'}</span><h3>{poll.topic}</h3><p className="lab-note">Closes {new Date(poll.closesAt).toLocaleString()}</p>{poll.resolved && poll.resolutionSource && <p>Outcome: {poll.winningFork} · <a href={poll.resolutionSource} rel="noopener noreferrer" target="_blank">Source ↗</a></p>}{poll.forks.map((fork, index) => <div className="lab-fork" key={fork}><button disabled={!signedIn || !!poll.selectedFork || pending !== null || poll.resolved || new Date(poll.closesAt) <= new Date()} onClick={() => lock(poll, fork)}>{fork}{poll.selectedFork === fork ? ' · Your prediction' : ''}</button>{poll.percentages && <><meter min="0" max="100" value={poll.percentages[index]} aria-label={fork + ' community percentage'}/><span>{poll.percentages[index].toFixed(1)}%</span></>}</div>)}{!signedIn && <a href="/login?next=%2Flabs%2Fvault">Sign in to lock a prediction →</a>}{!poll.percentages && <p className="lab-note">Community results stay hidden until you lock a prediction or voting closes.</p>}{poll.percentages && <p>{poll.total} locked predictions</p>}</article>)}</div><p className="lab-note">Build your prediction record. Earn the Industry Oracle badge.</p></section>;
}

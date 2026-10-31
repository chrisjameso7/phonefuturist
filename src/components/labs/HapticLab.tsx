import { useEffect, useMemo, useRef, useState } from 'react';
import { HAPTIC_PROFILES, compileHaptic, hapticPack, hapticWav, type HapticInput } from '../../lib/labs/haptics';
const defaultInput: HapticInput = { pattern: [...HAPTIC_PROFILES[0].pattern], tempo: 100, repeats: 1, tone: HAPTIC_PROFILES[0].tone, volume: .15 };
function cancelVibration() { try {
    navigator.vibrate?.(0);
}
catch { /* The browser may block vibration independently of audio. */ } }
export default function HapticLab() {
    const [input, setInput] = useState(defaultInput), [name, setName] = useState('Mechanical Click'), [profile, setProfile] = useState('mechanical'), [status, setStatus] = useState(''), [support, setSupport] = useState(false), [playing, setPlaying] = useState(false), [audio, setAudio] = useState(true);
    const context = useRef<AudioContext | null>(null), nodes = useRef<OscillatorNode[]>([]), timer = useRef<ReturnType<typeof setTimeout> | null>(null), generation = useRef(0);
    const compiled = useMemo(() => {
        try {
            return { result: compileHaptic(input), error: '' };
        }
        catch (error) {
            return { result: null, error: error instanceof Error ? error.message : 'Invalid pattern.' };
        }
    }, [input]);
    function stop() {
        generation.current++;
        nodes.current.forEach(n => {
            try {
                n.stop();
            }
            catch { /* Already ended. */ }
        });
        nodes.current = [];
        cancelVibration();
        if (timer.current)
            clearTimeout(timer.current);
        setPlaying(false);
    }
    useEffect(() => {
        setSupport(typeof navigator.vibrate === 'function');
        const hidden = () => {
            if (document.hidden)
                stop();
        };
        document.addEventListener('visibilitychange', hidden);
        return () => {
            document.removeEventListener('visibilitychange', hidden);
            generation.current++;
            nodes.current.forEach(n => {
                try {
                    n.stop();
                }
                catch { }
            });
            cancelVibration();
            if (timer.current)
                clearTimeout(timer.current);
            void context.current?.close().catch(() => { });
        };
    }, []);
    function update(patch: Partial<HapticInput>) { stop(); setInput(current => ({ ...current, ...patch })); setProfile('custom'); }
    async function play() {
        stop();
        if (!compiled.result)
            return;
        const job = generation.current;
        // Vibration is dispatched inside the original user gesture, before awaiting audio.
        let sent = false;
        try {
            sent = navigator.vibrate?.(compiled.result.pattern) ?? false;
        }
        catch {
            sent = false;
        }
        setPlaying(true);
        setStatus(sent ? 'Pattern sent to your device.' : 'Audio preview · vibration is unavailable or disabled on this device.');
        if (audio && input.volume > 0) {
            try {
                context.current ??= new AudioContext();
                const ctx = context.current;
                await ctx.resume();
                if (job !== generation.current)
                    return;
                const start = ctx.currentTime + .012;
                for (const pulse of compiled.result.pulses) {
                    const oscillator = ctx.createOscillator(), gain = ctx.createGain(), time = start + pulse.startMs / 1000, length = Math.min(.028, pulse.durationMs / 1000);
                    oscillator.type = 'sine';
                    oscillator.frequency.value = input.tone;
                    gain.gain.setValueAtTime(0, time);
                    gain.gain.linearRampToValueAtTime(input.volume, time + .001);
                    gain.gain.exponentialRampToValueAtTime(.00001, time + Math.max(.003, length));
                    oscillator.connect(gain);
                    gain.connect(ctx.destination);
                    oscillator.start(time);
                    oscillator.stop(time + length + .004);
                    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
                    nodes.current.push(oscillator);
                }
            }
            catch {
                setStatus(sent ? 'Vibration started. Audio is unavailable.' : 'Audio and vibration are unavailable in this browser.');
            }
        }
        else if (!sent)
            setStatus('Vibration is unavailable or disabled. Enable audio and raise the volume for a sound preview.');
        if (job !== generation.current)
            return;
        timer.current = setTimeout(() => { setPlaying(false); nodes.current = []; }, compiled.result.durationMs + 80);
    }
    function download(kind: 'json' | 'wav') {
        try {
            const contents = kind === 'json' ? JSON.stringify(hapticPack(name, input), null, 2) : hapticWav(input);
            const blob = new Blob([contents as BlobPart], { type: kind === 'json' ? 'application/json' : 'audio/wav' }), url = URL.createObjectURL(blob), a = document.createElement('a');
            a.href = url;
            a.download = 'phonefuturist-' + (name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'haptic') + '.' + kind;
            document.body.append(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setStatus(kind === 'json' ? 'Vibration pack downloaded.' : 'Audio preview downloaded.');
        }
        catch {
            setStatus('Could not export this pattern.');
        }
    }
    return <section className="lab-split" aria-label="Haptic playground"><div className="lab-glass"><h2>Pattern controls</h2><div className="lab-profile-grid">{HAPTIC_PROFILES.map(p => <button key={p.id} aria-pressed={profile === p.id} onClick={() => { stop(); setProfile(p.id); setName(p.name); setInput({ ...defaultInput, pattern: [...p.pattern], tone: p.tone }); }}>{p.name}</button>)}</div><div className="lab-fields lab-one"><label>Pattern name<input value={name} maxLength={80} onChange={e => setName(e.currentTarget.value)}/></label><label>Tempo · {input.tempo}%<input type="range" min="50" max="200" step="5" value={input.tempo} onChange={e => update({ tempo: Number(e.currentTarget.value) })}/></label><label>Repeats<select value={input.repeats} onChange={e => update({ repeats: Number(e.currentTarget.value) })}>{[1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}</select></label><label>Click tone · {input.tone} Hz<input type="range" min="80" max="3000" step="10" value={input.tone} onChange={e => update({ tone: Number(e.currentTarget.value) })}/></label><label>Click volume · {Math.round(input.volume * 100)}%<input type="range" min="0" max=".4" step=".01" value={input.volume} onChange={e => update({ volume: Number(e.currentTarget.value) })}/></label><label className="lab-toggle"><input type="checkbox" checked={audio} onChange={e => { stop(); setAudio(e.currentTarget.checked); }}/>Audio clicks</label></div></div>
  <div className="lab-glass lab-results"><p className="lab-kicker">{support ? 'Vibration API available' : 'Audio preview available'}</p><h2>{name || 'Custom pattern'}</h2><div className={'lab-haptic-pad' + (playing ? ' is-playing' : '')}><span>{playing ? 'Playing' : 'Ready to feel it'}</span></div><div className="lab-metric-row"><div><strong>{compiled.result?.durationMs ?? '—'} ms</strong><span>Pattern duration</span></div><div><strong>{compiled.result?.pulses.length ?? '—'}</strong><span>Pulses</span></div></div><div className="lab-pulse-strip" aria-label="Pulse and pause timeline">{compiled.result?.pattern.map((n, i) => <span key={i} className={i % 2 === 0 ? 'pulse' : 'pause'} style={{ flexGrow: n }} title={(i % 2 === 0 ? 'Pulse ' : 'Pause ') + n + ' ms'}/>)}</div><div className="lab-action-row"><button onClick={play} disabled={!compiled.result}>Test pattern ▶</button><button onClick={() => { stop(); setStatus('Stopped.'); }}>Stop ■</button><button disabled={!compiled.result} onClick={() => download('wav')}>Download audio ↓</button></div><details className="lab-advanced-export"><summary>Advanced export</summary><button disabled={!compiled.result} onClick={() => download('json')}>Download vibration pattern (.json)</button></details><p role="status">{compiled.error || status}</p><p className="lab-note">Vibration works on supported mobile browsers. iPhone browsers use the audio preview. Pulse strength depends on your device. Downloaded packs do not automatically install as system notifications.</p><details open><summary>Customize pulse timing</summary><div className="lab-pattern-editor">{input.pattern.map((n, i) => <label key={i}>{i % 2 === 0 ? 'Pulse' : 'Pause'} {Math.floor(i / 2) + 1} · ms<input type="number" min="1" max="1000" step="1" value={n} onChange={e => {
                const value = Number(e.currentTarget.value);
                if (Number.isInteger(value) && value >= 1 && value <= 1000)
                    update({ pattern: input.pattern.map((v, j) => j === i ? value : v) });
            }}/></label>)}</div><div className="lab-action-row"><button disabled={input.pattern.length >= 29} onClick={() => update({ pattern: [...input.pattern, 40, 18] })}>Add pulse +</button><button disabled={input.pattern.length <= 1} onClick={() => update({ pattern: input.pattern.slice(0, -2) })}>Remove last pulse</button></div></details></div></section>;
}

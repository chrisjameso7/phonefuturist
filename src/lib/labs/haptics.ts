export const HAPTIC_PROFILES = [
    { id: 'mechanical', name: 'Mechanical Click', pattern: [18, 24, 8], tone: 1800 },
    { id: 'spring', name: 'Heavyweight Spring', pattern: [65, 22, 38, 28, 18, 34, 10], tone: 170 },
    { id: 'tap', name: 'Subtle Tap', pattern: [10], tone: 1200 },
    { id: 'vinyl', name: 'Vinyl Record Friction', pattern: [7, 25, 10, 16, 6, 40, 12, 19, 7, 32, 9], tone: 700 },
] as const;
export type HapticInput = {
    pattern: readonly number[];
    tempo: number;
    repeats: number;
    tone: number;
    volume: number;
};
export type HapticPulse = {
    startMs: number;
    durationMs: number;
};
export function compileHaptic(input: HapticInput) {
    if (!Array.isArray(input.pattern) || input.pattern.length < 1 || input.pattern.length > 31 || input.pattern.some(n => !Number.isInteger(n) || n < 1 || n > 1000) || !Number.isFinite(input.tempo) || input.tempo < 50 || input.tempo > 200 || !Number.isInteger(input.repeats) || input.repeats < 1 || input.repeats > 4 || !Number.isFinite(input.tone) || input.tone < 80 || input.tone > 3000 || !Number.isFinite(input.volume) || input.volume < 0 || input.volume > .4)
        throw new Error('Choose up to 31 pulse steps and a pattern no longer than 8 seconds.');
    const one = input.pattern.map(n => Math.max(1, Math.round(n * 100 / input.tempo)));
    if (one.length % 2 === 0)
        one.pop(); // A pack always ends with a pulse, never a dangling pause.
    const pattern: number[] = [];
    for (let i = 0; i < input.repeats; i++) {
        if (i)
            pattern.push(180);
        pattern.push(...one);
    }
    const durationMs = pattern.reduce((sum, n) => sum + n, 0);
    if (durationMs > 8000 || pattern.length > 99)
        throw new Error('Shorten the pattern or reduce repeats to stay within 8 seconds and 99 steps.');
    let cursor = 0;
    const pulses: HapticPulse[] = [];
    pattern.forEach((n, i) => {
        if (i % 2 === 0)
            pulses.push({ startMs: cursor, durationMs: n });
        cursor += n;
    });
    return { pattern, pulses, durationMs };
}
export function hapticPack(name: string, input: HapticInput) {
    const result = compileHaptic(input);
    return { format: 'phonefuturist-haptics', version: 1, name: name.trim().slice(0, 80) || 'Custom haptic', patternMs: result.pattern, durationMs: result.durationMs, audio: { toneHz: input.tone, gain: input.volume }, requiresUserActivation: true };
}
// A portable PCM preview shares the same pulse offsets as Web Audio playback.
export function hapticWav(input: HapticInput): Uint8Array {
    const { pulses, durationMs } = compileHaptic(input), rate = 44100, count = Math.ceil((durationMs / 1000 + .08) * rate), bytes = new Uint8Array(44 + count * 2), view = new DataView(bytes.buffer);
    const word = (offset: number, text: string) => {
        for (let i = 0; i < text.length; i++)
            view.setUint8(offset + i, text.charCodeAt(i));
    };
    word(0, 'RIFF');
    view.setUint32(4, 36 + count * 2, true);
    word(8, 'WAVE');
    word(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    word(36, 'data');
    view.setUint32(40, count * 2, true);
    for (const pulse of pulses) {
        const first = Math.round(pulse.startMs * rate / 1000), length = Math.round(Math.min(pulse.durationMs, 28) * rate / 1000);
        for (let i = 0; i < length; i++) {
            const t = i / rate, attack = Math.min(1, t / .001), envelope = attack * Math.exp(-t * 180), sample = Math.sin(2 * Math.PI * input.tone * t) * envelope * input.volume;
            view.setInt16(44 + (first + i) * 2, Math.round(sample * 32767), true);
        }
    }
    return bytes;
}

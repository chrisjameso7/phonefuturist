import { it, expect } from 'vitest';
import { HAPTIC_PROFILES, compileHaptic, hapticPack, hapticWav, type HapticInput } from '../src/lib/labs/haptics';
const input: HapticInput = { pattern: [20, 30, 10], tempo: 100, repeats: 1, tone: 1200, volume: .15 };
it('compiles timing and repeats without mutating presets', () => {
    expect(compileHaptic(input)).toEqual({ pattern: [20, 30, 10], pulses: [{ startMs: 0, durationMs: 20 }, { startMs: 50, durationMs: 10 }], durationMs: 60 });
    expect(compileHaptic({ ...input, tempo: 200, repeats: 2 }).pattern).toEqual([10, 15, 5, 180, 10, 15, 5]);
    for (const p of HAPTIC_PROFILES)
        expect(compileHaptic({ ...input, pattern: p.pattern }).durationMs).toBeLessThan(8000);
    expect(input.pattern).toEqual([20, 30, 10]);
});
it('bounds untrusted durations and large packs', () => {
    for (const patch of [{ pattern: [] }, { pattern: [NaN] }, { pattern: [0] }, { pattern: [1001] }, { tempo: 0 }, { repeats: 5 }, { volume: 1 }, { tone: 4000 }, { pattern: Array(31).fill(1000) }, { pattern: Array(31).fill(1), repeats: 4 }])
        expect(() => compileHaptic({ ...input, ...patch })).toThrow();
});
it('exports self-contained timing data and a valid non-clipping PCM audio file', () => {
    expect(hapticPack('Test click', input)).toMatchObject({ name: 'Test click', patternMs: [20, 30, 10], durationMs: 60, requiresUserActivation: true });
    const wav = hapticWav(input), view = new DataView(wav.buffer);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe('RIFF');
    expect(new TextDecoder().decode(wav.slice(8, 12))).toBe('WAVE');
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint32(40, true)).toBe(wav.length - 44);
    let peak = 0;
    for (let i = 44; i < wav.length; i += 2)
        peak = Math.max(peak, Math.abs(view.getInt16(i, true)));
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThan(32767 * .16);
    expect(hapticWav({ ...input, volume: 0 }).slice(44).every(n => n === 0)).toBe(true);
});

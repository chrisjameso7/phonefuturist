export type PwmInput = {
    frequency: number;
    duty: number;
    brightness: number;
    dc: boolean;
};
export function calculatePwm(input: PwmInput) {
    if (!Number.isFinite(input.frequency) || input.frequency < 60 || input.frequency > 10000 || !Number.isFinite(input.duty) || input.duty < 1 || input.duty > 100 || !Number.isFinite(input.brightness) || input.brightness < 1 || input.brightness > 100 || typeof input.dc !== 'boolean')
        throw new Error('Invalid display waveform.');
    const periodMs = 1000 / input.frequency, duty = input.dc ? 1 : input.duty / 100;
    return { periodMs, onMs: periodMs * duty, offMs: periodMs * (1 - duty), meanRelativeLuminance: input.brightness * duty, modulationPercent: input.dc || input.duty === 100 ? 0 : 100 };
}
/** Step waveform for a fixed 8 ms time window; this never flashes the screen. */
export function pwmWaveform(input: PwmInput) { const result = calculatePwm(input); const points: Array<[
    number,
    number
]> = []; const level = 1 - input.brightness / 100; if (input.dc || input.duty === 100)
    return [[0, level], [8, level]] as Array<[
        number,
        number
    ]>; points.push([0, level]); for (let start = 0; start < 8; start += result.periodMs) {
    const off = Math.min(8, start + result.onMs), end = Math.min(8, start + result.periodMs);
    points.push([start, level], [off, level], [off, 1], [end, 1], [end, level]);
} return points; }

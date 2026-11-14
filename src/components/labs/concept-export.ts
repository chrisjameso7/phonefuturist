import type { DeviceConcept, calculateDeviceConcept } from '../../lib/labs/device-concepts';
export async function downloadConceptReceipt(concept: DeviceConcept, metrics: ReturnType<typeof calculateDeviceConcept>, cover: boolean) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('Canvas unavailable');
    ctx.fillStyle = '#080e18';
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = '#75e4d1';
    ctx.font = '24px sans-serif';
    ctx.fillText('PHONEFUTURIST / INTERACTIVE LEAKS', 64, 90);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText(concept.name || 'Untitled concept', 64, 180, 940);
    ctx.font = '26px sans-serif';
    const lines = ['SIMULATED CONCEPT', concept.formFactor.replaceAll('_', ' '), concept.width + ' × ' + concept.height + ' × ' + concept.thickness + ' mm', concept.weight + ' g', (cover ? 'Cover' : 'Primary') + ' display: ' + metrics.activeDisplay.ppi?.toFixed(0) + ' PPI', 'Display area: ' + ((metrics.activeDisplay.areaMm2 ?? 0) / 100).toFixed(1) + ' cm²', 'Battery: ' + metrics.energyWh.toFixed(1) + ' Wh', 'Runtime: ' + metrics.runtimeHours.toFixed(1) + ' h at ' + metrics.powerW + ' W', 'Ideal charge minimum: ' + metrics.idealChargeMinutes.toFixed(0) + ' min', 'Charger: ' + concept.chargeW + ' W / ' + concept.chargeEfficiency + '% efficiency'];
    lines.forEach((line, i) => ctx.fillText(line, 64, 300 + i * 65, 940));
    ctx.fillStyle = '#aebbc9';
    ctx.font = '22px sans-serif';
    ctx.fillText('Real runtime and charging will vary.', 64, 1240, 940);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
    if (!blob)
        throw new Error('Export failed');
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url;
    a.download = 'phonefuturist-device-concept.png';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

import { BOM_OPTIONS, type BomInput, calculateBom } from '../../lib/labs/bom';
export async function downloadBomCard(input: BomInput, result: ReturnType<typeof calculateBom>) {
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
    ctx.fillText('PHONEFUTURIST / LABS', 64, 80);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 58px sans-serif';
    ctx.fillText('YOUR COMPONENT BUILD', 64, 180, 950);
    ctx.font = '26px sans-serif';
    let y = 260;
    for (const key of ['sensor', 'display', 'chassis', 'silicon'] as const) {
        const item = BOM_OPTIONS[key].find(item => item.id === input[key]);
        ctx.fillText(item?.name ?? key, 64, y, 950);
        y += 54;
    }
    const rows = [...result.items.map(item => item.label + ': $' + item.cost.toFixed(0)), input.resolution + 'p / ' + input.refresh + ' Hz', 'Estimated BOM: $' + result.total.toFixed(0), 'Retail: $' + input.retail, 'Component margin: ' + result.grossMargin.toFixed(1) + '%', 'Suggested MSRP: $' + result.msrp];
    y += 35;
    for (const row of rows) {
        ctx.fillText(row, 64, y, 950);
        y += 54;
    }
    ctx.fillStyle = '#9baabd';
    ctx.font = '20px sans-serif';
    ctx.fillText('ILLUSTRATIVE ESTIMATE · Not a supplier quotation', 64, 1250, 950);
    ctx.fillText('Excludes R&D, tax, warranty, distribution and marketing.', 64, 1290, 950);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob)
        throw new Error('Export failed');
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;
    link.download = 'phonefuturist-bom-spec.png';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}

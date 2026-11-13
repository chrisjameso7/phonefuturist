import { type BomInput, calculateBom } from '../../lib/labs/bom';
import {downloadLongCanvas} from '../../lib/downloads/result-pdf';
export async function downloadBomCard(input: BomInput, result: ReturnType<typeof calculateBom>) {
    const rows = result.items.filter(item => item.cost > 0), height = Math.max(1350, 480 + rows.length * 100);
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('Canvas unavailable');
    ctx.fillStyle = '#080e18';
    ctx.fillRect(0, 0, 1080, height);
    ctx.fillStyle = '#75e4d1';
    ctx.font = '24px sans-serif';
    ctx.fillText('PHONEFUTURIST / LABS', 64, 70);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(input.name?.trim() || 'YOUR COMPONENT BUILD', 64, 145, 950);
    ctx.font = '30px sans-serif';
    ctx.fillText('Estimated BOM: $' + result.total.toFixed(2), 64, 210, 950);
    ctx.font = '24px sans-serif';
    ctx.fillText('MSRP: $' + result.msrp + '  /  Component margin: ' + result.grossMargin.toFixed(1) + '%', 64, 258, 950);
    let y = 335;
    for (const row of rows) {
        ctx.fillStyle = '#75e4d1';
        ctx.font = '20px sans-serif';
        ctx.fillText(row.label + ' · $' + row.cost.toFixed(2) + (row.quantity !== 1 ? ' · ' + row.quantity + ' units' : ''), 64, y, 950);
        ctx.fillStyle = '#fff';
        ctx.font = '26px sans-serif';
        ctx.fillText(row.name, 64, y + 39, 950);
        y += 100;
    }
    ctx.fillStyle = '#9baabd';
    ctx.font = '22px sans-serif';
    ctx.fillText(input.resolution + 'p / ' + input.refresh + ' Hz · USD', 64, height - 65, 950);
    if(await downloadLongCanvas(canvas,'phonefuturist-bom-spec',{
        title:'Bill of materials',subtitle:input.name?.trim()||'Untitled concept',
        summary:'Estimated BOM: $'+result.total.toFixed(2)+' / MSRP: $'+result.msrp+' / Margin: '+result.grossMargin.toFixed(1)+'%',
        footer:'PhoneFuturist / Estimated BOM / USD / '+input.resolution+'p / '+input.refresh+' Hz',
    },{top:300,bottom:300+rows.length*100,breaks:rows.map((_,i)=>400+i*100)}))return;
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

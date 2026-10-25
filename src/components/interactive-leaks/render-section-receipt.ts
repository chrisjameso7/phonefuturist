import type { ReceiptMetric, ReceiptKind } from './DownloadSectionReceipt';

/** Loaded only when a reader downloads a result; no simulation logic lives here. */
export async function renderSectionReceipt({ kind, deviceName, metrics, thermalPoints }: {
  kind: ReceiptKind;
  deviceName: string;
  metrics: ReceiptMetric[];
  thermalPoints?: Array<{ second: number; performancePercent: number; temperatureC: number }>;
}) {
  const rows = metrics.filter(m => m.value !== undefined && m.value !== null && String(m.value).trim() !== ''
    && !(typeof m.value === 'number' && !Number.isFinite(m.value))
    && !/\b(?:NaN|Infinity|undefined|null)\b/i.test(String(m.value)));
  const points = (thermalPoints?.filter(p => Number.isFinite(p.second) && Number.isFinite(p.performancePercent) && Number.isFinite(p.temperatureC)) ?? []).sort((a, b) => a.second - b.second);
  const chart = kind === 'Thermal' && points.length > 1;
  const width = 1080;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  // Lay out complete lines before sizing the bitmap. Never squeeze long text
  // horizontally or let a value collide with its label on a phone screen.
  function lines(text: string, font: string, available: number): string[] {
    ctx!.font = font;
    const output: string[] = [];
    let line = '';
    for (const word of text.replace(/\s+/g, ' ').trim().split(' ')) {
      const candidate = line ? line + ' ' + word : word;
      if (ctx!.measureText(candidate).width <= available) {
        line = candidate; continue;
      }
      if (line) output.push(line);
      line = '';
      // Also handle a pasted identifier with no spaces.
      for (const character of word) {
        if (line && ctx!.measureText(line + character).width > available) {
          output.push(line); line = '';
        }
        line += character;
      }
    }
    if (line.trim()) output.push(line.trim());
    return output;
  }
  const title = lines(deviceName || 'Custom device', 'bold 42px Arial', 940);
  const layout = rows.map(metric => ({
    label: lines(metric.label, '23px Arial', 894),
    value: lines(String(metric.value), 'bold 38px Arial', 894),
  }));
  const headerHeight = 226 + title.length * 51;
  const rowHeight = (row: typeof layout[number]) => 44 + row.label.length * 30 + row.value.length * 47;
  const height = headerHeight + 45 + layout.reduce((sum, row) => sum + rowHeight(row) + 16, 0) + (chart ? 430 : 0) + 190;
  // 1080px is already social-ready; 2x tall receipts waste mobile memory.
  canvas.width = width; canvas.height = height;
  ctx.fillStyle = '#081524'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#22d3ee'; ctx.fillRect(0, 0, 12, height);
  ctx.fillStyle = '#7dd3fc'; ctx.font = 'bold 25px Arial'; ctx.fillText('PHONEFUTURIST  /  INTERACTIVE LEAKS', 64, 79);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 61px Arial'; ctx.fillText(kind.toUpperCase(), 64, 165, 950);
  ctx.fillStyle = '#cbd5e1'; ctx.font = 'bold 42px Arial';
  title.forEach((line, i) => ctx.fillText(line, 64, 227 + i * 51));
  ctx.fillStyle = '#64748b'; ctx.fillRect(64, headerHeight, 952, 2);
  let y = headerHeight + 35;
  for (const row of layout) {
    ctx.fillStyle = '#14263a'; ctx.beginPath(); ctx.roundRect(64, y, 952, rowHeight(row), 18); ctx.fill();
    ctx.fillStyle = '#9bb1c7'; ctx.font = '23px Arial';
    row.label.forEach((line, i) => ctx.fillText(line, 90, y + 34 + i * 30));
    ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 38px Arial';
    row.value.forEach((line, i) => ctx.fillText(line, 90, y + 48 + row.label.length * 30 + i * 47));
    y += rowHeight(row) + 16;
  }
  if (chart) {
    y += 25;
    ctx.fillStyle = '#cbd5e1'; ctx.font = 'bold 24px Arial'; ctx.fillText('PERFORMANCE STABILITY', 64, y + 6);
    const chartLeft = 110, chartTop = y + 65, chartW = 860, chartH = 235;
    const minTime = points[0].second;
    const maxTime = Math.max(minTime + 1, points[points.length - 1].second);
    const temperatures = points.map(p => p.temperatureC);
    const tempMin = Math.floor(Math.min(...temperatures) - 2);
    const tempMax = Math.ceil(Math.max(...temperatures) + 2);
    const xAt = (second: number) => chartLeft + ((second - minTime) / (maxTime - minTime)) * chartW;
    const performanceY = (value: number) => chartTop + (1 - Math.max(0, Math.min(100, value)) / 100) * chartH;
    const temperatureY = (value: number) => chartTop + (1 - (value - tempMin) / Math.max(1, tempMax - tempMin)) * chartH;
    ctx.font = '19px Arial';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const yy = chartTop + i * chartH / 4;
      ctx.strokeStyle = '#334155';
      ctx.beginPath(); ctx.moveTo(chartLeft, yy); ctx.lineTo(chartLeft + chartW, yy); ctx.stroke();
      ctx.fillStyle = '#9bb1c7';
      ctx.textAlign = 'right'; ctx.fillText(String(100 - i * 25) + '%', chartLeft - 14, yy + 6);
      ctx.textAlign = 'left'; ctx.fillText((tempMax - i * (tempMax - tempMin) / 4).toFixed(0) + '°C', chartLeft + chartW + 12, yy + 6);
      const time = minTime + i * (maxTime - minTime) / 4;
      ctx.textAlign = 'center'; ctx.fillText((time / 60).toFixed(1) + 'm', chartLeft + i * chartW / 4, chartTop + chartH + 32);
    }
    ctx.textAlign = 'left';
    for (const [color, mapY] of [
      ['#38bdf8', (p: typeof points[number]) => performanceY(p.performancePercent)],
      ['#fb923c', (p: typeof points[number]) => temperatureY(p.temperatureC)],
    ] as const) {
      ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      points.forEach((point, i) => { if (i === 0) ctx.moveTo(xAt(point.second), mapY(point)); else ctx.lineTo(xAt(point.second), mapY(point)); });
      ctx.stroke();
    }
    ctx.font = '20px Arial';
    ctx.fillStyle = '#38bdf8'; ctx.fillText('● Performance (%)', chartLeft, chartTop + chartH + 76);
    ctx.fillStyle = '#fb923c'; ctx.fillText('● Temperature (°C)', chartLeft + 300, chartTop + chartH + 76);
    y += 400;
  }
  ctx.fillStyle='#94a3b8'; ctx.font='22px Arial';
  ctx.fillText('PHONEFUTURIST LAB  •  SIMULATION RESULTS',64,height-133,950);
  ctx.font='21px Arial'; ctx.fillText('Estimates and scenarios. Not a measured device test.',64,height-97,950);
  ctx.font='19px Arial';ctx.fillText(new Date().toLocaleDateString('en-GB', {year:'numeric',month:'short',day:'numeric'}),64,height-68);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve,'image/png'));
  if (!blob) throw new Error('Could not generate image');
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=`phonefuturist-${kind.toLowerCase()}-${safeFilename(deviceName)}.png`;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65) || 'concept';
}

import type { ReceiptMetric, ReceiptKind } from './DownloadSectionReceipt';

/** Loaded only when a reader downloads a result; no simulation logic lives here. */
export async function renderSectionReceipt({ kind, deviceName, metrics, thermalPoints }: {
  kind: ReceiptKind;
  deviceName: string;
  metrics: ReceiptMetric[];
  thermalPoints?: Array<{ second: number; performancePercent: number; temperatureC: number }>;
}) {
  const rows = metrics.filter(m => m.value !== undefined && m.value !== null && String(m.value).trim() !== '');
  const points = (thermalPoints?.filter(p => Number.isFinite(p.second) && Number.isFinite(p.performancePercent) && Number.isFinite(p.temperatureC)) ?? []).sort((a, b) => a.second - b.second);
  const chart = kind === 'Thermal' && points.length > 1;
  const width = 1080;
  const height = 420 + rows.length * 108 + (chart ? 430 : 0) + 145;
  const canvas = document.createElement('canvas');
  canvas.width = width * 2; canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.scale(2, 2);
  ctx.fillStyle = '#081524'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#22d3ee'; ctx.fillRect(0, 0, 12, height);
  ctx.fillStyle = '#7dd3fc'; ctx.font = 'bold 25px Arial'; ctx.fillText('PHONEFUTURIST  /  INTERACTIVE LEAKS', 64, 79);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 61px Arial'; ctx.fillText(kind.toUpperCase(), 64, 165, 950);
  ctx.fillStyle = '#cbd5e1'; ctx.font = '29px Arial'; ctx.fillText(deviceName || 'Custom device', 64, 222, 950);
  ctx.fillStyle = '#64748b'; ctx.fillRect(64, 255, 952, 2);
  let y = 300;
  for (const metric of rows) {
    ctx.fillStyle = '#14263a'; ctx.beginPath(); ctx.roundRect(64, y, 952, 92, 14); ctx.fill();
    ctx.fillStyle = '#9bb1c7'; ctx.font = '22px Arial'; ctx.fillText(metric.label, 89, y + 34, 500);
    ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 34px Arial'; ctx.textAlign = 'right';
    ctx.fillText(String(metric.value), 992, y + 61, 440); ctx.textAlign = 'left';
    y += 108;
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
  ctx.fillText('PHONEFUTURIST LAB  •  SIMULATION RESULTS',64,height-103,950);
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

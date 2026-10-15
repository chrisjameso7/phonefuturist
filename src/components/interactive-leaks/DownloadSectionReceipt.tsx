import { useState } from 'react';

export type ReceiptMetric = { label: string; value: string | number | undefined | null };
export type ReceiptKind = 'Benchmark' | 'Battery' | 'Charging' | 'Display' | 'Thermal' | 'Camera';

/** Produces a standalone branded, legible PNG without extra canvas dependencies. */
export default function DownloadSectionReceipt({
  kind, deviceName, metrics, thermalPoints,
}: {
  kind: ReceiptKind;
  deviceName: string;
  metrics: ReceiptMetric[];
  thermalPoints?: Array<{ second: number; performancePercent: number; temperatureC: number }>;
}) {
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  async function download() {
    try {
      setError('');
      setDownloading(true);
      const { renderSectionReceipt } = await import('./render-section-receipt');
      await renderSectionReceipt({ kind, deviceName, metrics, thermalPoints });
    } catch (e) { setError(e instanceof Error ? e.message : 'Download failed'); }
    finally { setDownloading(false); }
  }
  return <div style={{margin:'12px 0 20px'}}>
    <button type="button" onClick={download} disabled={downloading} aria-busy={downloading} className="il-section-receipt-button">{downloading ? 'Preparing…' : `↓ Download ${kind} results`}</button>
    {error && <small role="alert" style={{display:'block',marginTop:6}}>{error}</small>}
  </div>;
}

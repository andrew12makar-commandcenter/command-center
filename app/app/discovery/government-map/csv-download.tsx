'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

export default function CsvDownload({ csv, filename }: { csv: string; filename: string }) {
  const [ready, setReady] = useState(false);
  function download() {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setReady(true);
  }
  return <button className="text-sm text-cyan-300 underline" type="button" onClick={download}>
    {ready ? 'CSV download started ✓' : 'Download CSV ↓'} <Download size={13} className="inline"/>
  </button>;
}

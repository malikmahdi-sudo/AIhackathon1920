"use client";
import { useState } from "react";

export function DownloadPdf({ date, localOnly = false }: { date: string; localOnly?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (localOnly) { window.print(); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/editions/${date}/pdf`, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error); }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `morning-paper-${date}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { setError(error instanceof Error ? error.message : "Download failed. Please retry."); }
    finally { setBusy(false); }
  }
  return <div className="pdf-control"><button className="button" onClick={download} disabled={busy}>{busy ? "Preparing PDF…" : localOnly ? "Print / Save as PDF" : "Download PDF ↓"}</button>{error && <div className="form-error" role="alert"><p>{error}</p><button className="text-button" onClick={() => window.print()}>Print this edition / Save as PDF</button></div>}</div>;
}

"use client";
import { useState } from "react";

export function DownloadPdf({ date }: { date: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/editions/${date}/pdf`);
      if (!response.ok) { const result = await response.json(); throw new Error(result.error); }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `morning-paper-${date}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { setError(error instanceof Error ? error.message : "Download failed. Please retry."); }
    finally { setBusy(false); }
  }
  return <div><button className="button" onClick={download} disabled={busy}>{busy ? "Preparing PDF…" : "Download PDF"}</button>{error && <p role="alert" className="form-error">{error}</p>}</div>;
}

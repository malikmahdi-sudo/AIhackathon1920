"use client";
import { useState } from "react";
import type { DailyEdition } from "@/types/paper";

export function DownloadPdf({ edition }: { edition: DailyEdition }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {

    setBusy(true); setError("");
    try {
      const response = await fetch("/api/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edition), signal: AbortSignal.timeout(30_000) });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error); }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `morning-paper-${edition.date}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { setError(error instanceof Error ? error.message : "Download failed. Please retry."); }
    finally { setBusy(false); }
  }
  return <div className="pdf-control"><button className="button" onClick={download} disabled={busy}>{busy ? "Preparing PDF…" : "Download PDF ↓"}</button>{error && <div className="form-error" role="alert"><p>{error}</p><button className="text-button" onClick={() => window.print()}>Print this edition / Save as PDF</button></div>}</div>;
}

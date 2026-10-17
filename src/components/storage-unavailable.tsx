import Link from "next/link";
import { Masthead } from "./masthead";

export function StorageUnavailable() {
  return <div className="paper-shell"><Masthead /><main id="main-content" className="empty-edition">
    <p className="eyebrow">A brief interruption</p><h1>Your reading desk is reconnecting.</h1>
    <p>We cannot reach your saved collection right now. If you saved a browser preference backup, you can restore it in your profile. Please retry shortly.</p>
    <div className="form-actions"><a href="/paper" className="button">Retry connection</a><Link href="/onboarding">Open your preferences</Link></div>
  </main></div>;
}

"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main-content" className="paper-shell empty-edition"><p className="eyebrow">A brief interruption</p><h1>We couldn’t open this page.</h1><p>Your saved editions have not been replaced. Please try again.</p><div className="form-actions"><button className="button" onClick={reset}>Try again</button><Link href="/">Return home</Link></div></main>;
}

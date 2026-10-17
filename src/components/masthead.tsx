import Link from "next/link";

export function Masthead() {
  return (
    <header className="masthead">
      <div className="edition-line"><span>Made for curious minds</span><span>NaSCon ’26 · Your daily perspective</span></div>
      <Link href="/" className="wordmark" aria-label="The Morning Paper home">The Morning Paper<span className="accent">.</span></Link>
      <p>A little perspective, every day.</p>
      <nav aria-label="Main navigation"><Link href="/paper" prefetch={false}>Today’s paper</Link><Link href="/archives">Archives</Link><Link href="/onboarding">Your preferences</Link></nav>
    </header>
  );
}

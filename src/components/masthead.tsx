import Link from "next/link";

export function Masthead({ date, timezone = "UTC" }: { date?: string; timezone?: string }) {
  const now = date ? new Date(`${date}T12:00:00Z`) : new Date();
  const display = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: date ? "UTC" : timezone }).format(now);
  return (
    <header className="masthead">
      <div className="edition-line"><span>{display}</span><span>{date ? `Edition ${date.replaceAll("-", "")}` : "Independent perspective · Personal selection"}</span><Link className="profile-badge" href="/onboarding">Your profile ↗</Link></div>
      <Link href="/" className="wordmark" aria-label="The Daily Morning Paper home">The Daily Morning Paper<span className="accent">.</span></Link>
      <p>A little perspective, every day.</p>
      <nav aria-label="Main navigation"><Link href="/paper" prefetch={false}>Today’s paper</Link><Link href="/archives">Archives</Link><Link href="/onboarding">Your preferences</Link></nav>
    </header>
  );
}

import { FeatureCard } from "@/components/feature-card";
import { Masthead } from "@/components/masthead";
import Link from "next/link";

export default function Home() {
  return (
    <div className="paper-shell">
      <Masthead />
      <main id="main-content">
        <section className="hero" aria-labelledby="welcome-title">
          <div className="hero-copy">
            <p className="eyebrow">Less scrolling. More understanding.</p>
            <h1 id="welcome-title">The world is noisy.<br />Make your morning <em>clear.</em></h1>
            <p className="intro">A daily collection of stories that matter to you, brought together in one thoughtful paper. Pour a coffee. Find your perspective.</p>
            <Link className="button" href="/paper" prefetch={false}>Read your morning paper <span aria-hidden="true">→</span></Link>
            <p className="preview-note">Your interests. Your daily edition. Always here to revisit.</p>
          </div>
          <aside className="editor-note" aria-labelledby="editor-title">
            <div className="sun" aria-hidden="true">☀</div>
            <p className="eyebrow">A note from the desk</p>
            <h2 id="editor-title">Good mornings begin with a fresh point of view.</h2>
            <p>A quieter corner of the internet. One that starts with your interests and leaves you with something worth knowing.</p>
            <span className="note-signature">The Morning Paper</span>
          </aside>
        </section>
        <section id="inside" className="inside" aria-labelledby="inside-title">
          <div className="section-heading"><h2 id="inside-title">A new morning ritual</h2><span className="eyebrow">Made for you</span></div>
          <div className="feature-grid">
            <FeatureCard number="01 / YOUR PERSPECTIVE" title="Follow your curiosity">Choose the topics you care about. Your interests will shape each day’s edition.</FeatureCard>
            <FeatureCard number="02 / YOUR DAILY EDITION" title="Read at your own pace">Discover stories in a clean reading experience, with original sources a click away.</FeatureCard>
            <FeatureCard number="03 / YOUR COLLECTION" title="Keep a little perspective">Revisit your saved editions anytime. A classic newspaper PDF is coming next.</FeatureCard>
          </div>
        </section>
      </main>
      <footer><span>The Morning Paper</span><span>Built with curiosity · NaSCon ’26</span></footer>
    </div>
  );
}

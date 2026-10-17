type FeatureCardProps = { number: string; title: string; children: React.ReactNode };

export function FeatureCard({ number, title, children }: FeatureCardProps) {
  return (
    <article className="feature-card">
      <span className="eyebrow">{number}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

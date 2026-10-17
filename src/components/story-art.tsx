export function StoryArt({ topic, index }: { topic: string; index: number }) {
  return <div className={`story-art art-${index % 3}`} aria-hidden="true"><span className="art-orbit" /><span className="art-label">{topic || "Perspective"}</span><span className="art-number">{String(index + 1).padStart(2, "0")}</span></div>;
}

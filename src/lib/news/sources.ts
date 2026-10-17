export type FeedSource = { id: string; name: string; url: string; topics: string[]; articleHosts: string[] };

const bbc = (id: string, section: string, topics: string[]): FeedSource => ({
  id, name: "BBC News", url: `https://feeds.bbci.co.uk/news/${section}/rss.xml`, topics,
  articleHosts: ["bbc.com", "bbc.co.uk"],
});

export const FEED_SOURCES: FeedSource[] = [
  bbc("bbc-tech", "technology", ["Technology"]),
  bbc("bbc-science", "science_and_environment", ["Science"]),
  bbc("bbc-business", "business", ["Business"]),
  bbc("bbc-world", "world", ["World"]),
  bbc("bbc-health", "health", ["Health"]),
  bbc("bbc-culture", "entertainment_and_arts", ["Arts & Culture"]),
  { id: "guardian-ai", name: "The Guardian", url: "https://www.theguardian.com/technology/artificialintelligenceai/rss", topics: ["Artificial Intelligence", "Technology"], articleHosts: ["theguardian.com"] },
  { id: "guardian-climate", name: "The Guardian", url: "https://www.theguardian.com/environment/climate-crisis/rss", topics: ["Climate"], articleHosts: ["theguardian.com"] },
  { id: "bbc-sport", name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", topics: ["Sports"], articleHosts: ["bbc.com", "bbc.co.uk"] },
  { id: "dawn-pakistan", name: "Dawn", url: "https://www.dawn.com/feeds/pakistan", topics: ["Pakistan"], articleHosts: ["dawn.com"] },
];

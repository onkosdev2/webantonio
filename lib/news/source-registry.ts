export type NewsSource = {
  id: string;
  name: string;
  category: "journal" | "society" | "regulatory" | "discovery";
  url: string;
  focusHints: string[];
  priority: number;
};

export const newsSources: NewsSource[] = [
  {
    id: "google-oncology",
    name: "Google News · Oncology",
    category: "discovery",
    url: "https://news.google.com/rss/search?q=oncology+when:7d&hl=en-US&gl=US&ceid=US:en",
    focusHints: ["oncology"],
    priority: 4
  },
  {
    id: "google-lung-cancer",
    name: "Google News · Lung Cancer",
    category: "discovery",
    url: "https://news.google.com/rss/search?q=%22lung+cancer%22+oncology+when:7d&hl=en-US&gl=US&ceid=US:en",
    focusHints: ["lung cancer", "egfr", "alk", "pd-l1"],
    priority: 5
  },
  {
    id: "google-breast-cancer",
    name: "Google News · Breast Cancer",
    category: "discovery",
    url: "https://news.google.com/rss/search?q=%22breast+cancer%22+oncology+when:7d&hl=en-US&gl=US&ceid=US:en",
    focusHints: ["breast cancer", "her2", "hormonal"],
    priority: 5
  },
  {
    id: "google-asco",
    name: "Google News · ASCO Oncology",
    category: "society",
    url: "https://news.google.com/rss/search?q=ASCO+oncology+when:14d&hl=en-US&gl=US&ceid=US:en",
    focusHints: ["asco", "congress", "trial"],
    priority: 6
  },
  {
    id: "google-fda-oncology",
    name: "Google News · FDA Oncology",
    category: "regulatory",
    url: "https://news.google.com/rss/search?q=FDA+oncology+approval+when:30d&hl=en-US&gl=US&ceid=US:en",
    focusHints: ["fda", "approval", "accelerated approval"],
    priority: 7
  }
];

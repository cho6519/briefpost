import Parser from "rss-parser";

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) BriefPost-Bot/1.0",
  },
});

export interface LiveIssueItem {
  title: string;
  source: string;
  link?: string;
  publishedAt?: string;
  snippet?: string;
}

/**
 * Google News 실시간 RSS 수집
 */
export async function fetchGoogleNewsRSS(keyword: string): Promise<LiveIssueItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`;
    const feed = await parser.parseURL(url);

    return (feed.items || []).slice(0, 8).map((item) => ({
      title: item.title || "",
      source: "Google News RSS",
      link: item.link,
      publishedAt: item.pubDate,
      snippet: item.contentSnippet || item.summary,
    }));
  } catch (err) {
    console.warn(`[GoogleNewsRSS] '${keyword}' 수집 중 에러:`, err);
    return [];
  }
}

/**
 * 대한민국 정책브리핑 (공공기관 공식 브리핑 RSS)
 */
export async function fetchPolicyBriefingRSS(): Promise<LiveIssueItem[]> {
  try {
    // 대한민국 정책브리핑 종합 뉴스 RSS
    const url = "https://www.korea.kr/rss/policy.xml";
    const feed = await parser.parseURL(url);

    return (feed.items || []).slice(0, 8).map((item) => ({
      title: item.title || "",
      source: "대한민국 정책브리핑(공식)",
      link: item.link,
      publishedAt: item.pubDate,
      snippet: item.contentSnippet,
    }));
  } catch (err) {
    console.warn("[PolicyBriefing] 공공 브리핑 RSS 수집 실패:", err);
    return [];
  }
}

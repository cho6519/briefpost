/**
 * ==============================================================================
 * [RSS 피드 설정 파일]
 * IT, 경제, 부동산, 보도자료 등 원하는 분야의 RSS 피드를 이곳에 자유롭게 추가/수정/삭제할 수 있습니다.
 * enabled: false로 설정하면 해당 피드 수집을 임시로 중단할 수 있습니다.
 * ==============================================================================
 */

import { ArticleCategory } from "@/lib/ai";

export interface RssFeedConfig {
  id: string;
  name: string;
  category: ArticleCategory | string;
  url: string;
  enabled: boolean;
  description?: string;
}

export const RSS_FEEDS: RssFeedConfig[] = [
  // --- 1. 정부 및 공공기관 공식 RSS 피드 ---
  {
    id: "korea-kr-policy",
    name: "대한민국 정책브리핑 (종합 정책 뉴스)",
    category: "정책·지원금",
    url: "https://www.korea.kr/rss/policy.xml",
    enabled: true,
    description: "대한민국 정부 대표 종합 정책 뉴스 및 국민 지원 정책 피드",
  },
  {
    id: "korea-kr-press",
    name: "대한민국 정책브리핑 (정부 공식 보도자료)",
    category: "정책·지원금",
    url: "https://www.korea.kr/rss/pressRelease.xml",
    enabled: true,
    description: "각 부처 정부 부처 공식 합동 브리핑 및 보도자료 피드",
  },
  {
    id: "moef-press",
    name: "기획재정부 (세제·경제 정책 보도자료)",
    category: "부동산·세제",
    url: "https://www.moef.go.kr/rss.do?bbsId=MOSFBBS_000000000028",
    enabled: true,
    description: "세제 개편안, 세법 시행령, 거시경제 정책 공식 발표 피드",
  },
  {
    id: "molit-press",
    name: "국토교통부 (부동산·주택 청약 정책 보도자료)",
    category: "부동산·세제",
    url: "https://www.molit.go.kr/USR/NEWS/m_71/lst.jsp?rss=Y",
    enabled: true,
    description: "주택 공급, 부동산 청약 제도, 교통/국토 정책 보도자료 피드",
  },

  // --- 2. 정책·지원금·금융 실시간 뉴스 피드 (안정적인 실시간 공급망) ---
  {
    id: "google-news-policy",
    name: "구글 뉴스 (정부 지원금/복지 정책)",
    category: "정책·지원금",
    url: "https://news.google.com/rss/search?q=%EC%A0%95%EB%B6%80+%EC%A7%80%EC%9B%90%EA%B8%88+%EB%B3%B5%EC%A7%80+%ED%98%9C%ED%83%9D&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    description: "정부 지원금, 서민 금융, 청년 바우처 등 실시간 복지 속보",
  },
  {
    id: "google-news-realestate-tax",
    name: "구글 뉴스 (부동산/세제 트렌드)",
    category: "부동산·세제",
    url: "https://news.google.com/rss/search?q=%EB%B6%80%EB%8F%99%EC%82%B0+%EC%84%B8%EC%A0%9C+%EC%96%91%EB%8F%84%EC%84%B8+%EC%B2%AD%EC%95%BD&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    description: "취득세·양도세 개편, 아파트 분양 및 청약 실시간 동향",
  },
  {
    id: "google-news-finance",
    name: "구글 뉴스 (금융/경제)",
    category: "금융·경제",
    url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    description: "금리 변동, 대출 규제 완화, 가계 경제 동향 피드",
  },
  {
    id: "google-news-tech",
    name: "구글 뉴스 (테크/IT)",
    category: "테크·IT",
    url: "https://news.google.com/rss/headlines/section/topic/SCITECH?hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    description: "AI 및 디지털 신기술 산업 속보 피드",
  },
  {
    id: "google-news-society",
    name: "구글 뉴스 (사회/문화)",
    category: "사회·문화",
    url: "https://news.google.com/rss/headlines/section/topic/NATION?hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    description: "사회 복지, 교육, 문화 트렌드 종합 피드",
  },
];

/**
 * 활성화(enabled: true)된 RSS 피드 목록만 반환
 * .env 환경변수(RSS_FEED_URLS)가 지정되어 있을 경우 해당 URL들을 최우선 결합/반영
 */
export function getActiveRssFeeds(): RssFeedConfig[] {
  // 1. 설정 파일의 활성화된 피드 필터링
  const activeFeeds = RSS_FEEDS.filter((feed) => feed.enabled);

  // 2. 환경변수 RSS_FEED_URLS가 존재할 경우 추가 병합 (쉼표 구분)
  const envFeedUrls = process.env.RSS_FEED_URLS;
  if (envFeedUrls) {
    const customUrls = envFeedUrls
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);

    customUrls.forEach((url, idx) => {
      activeFeeds.push({
        id: `env-feed-${idx + 1}`,
        name: `환경변수 지정 피드 #${idx + 1}`,
        category: "Tech",
        url,
        enabled: true,
      });
    });
  }

  return activeFeeds;
}

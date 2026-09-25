/**
 * ==============================================================================
 * [RSS 피드 설정 파일 - 4대 카테고리별 공공·공식 기관 화이트리스트]
 * 1. 정책·지원금: 대한민국 정책브리핑(korea.kr), 기업마당(bizinfo.go.kr), 소진공(semas.or.kr)
 * 2. 금융·경제: 한국은행(bok.or.kr), 금융위원회(fsc.go.kr), 금융감독원(fss.or.kr), KDI 경제정보센터(kdi.re.kr)
 * 3. 테크·IT: 과학기술정보통신부(msit.go.kr), 한국인터넷진흥원(kisa.or.kr), 정보통신산업진흥원(nipa.or.kr)
 * 4. 사회·문화: 문화체육관광부(mcst.go.kr), 보건복지부(mohw.go.kr), 고용노동부(moel.go.kr)
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
  officialDomain?: string;
}

export const RSS_FEEDS: RssFeedConfig[] = [
  // ===========================================================================
  // 1. 정책·지원금 (대한민국 정책브리핑, 중기부 기업마당, 소진공 공고)
  // ===========================================================================
  {
    id: "policy-semas-announcement",
    name: "소상공인시장진흥공단 정책자금 및 지원사업 공고",
    category: "정책·지원금",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("site:semas.or.kr (정책자금 OR 경영자금 OR 소상공인 OR 대환대출 OR 지원사업 OR 공고)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "semas.or.kr",
    description: "소상공인시장진흥공단(semas.or.kr) 정책자금, 경영안정자금 및 소상공인 지원사업 공식 공고",
  },
  {
    id: "policy-bizinfo-direct",
    name: "중소벤처기업부 기업마당 지원사업 공고",
    category: "정책·지원금",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("site:bizinfo.go.kr (소상공인 OR 지원사업 OR 정책자금 OR 보조금 OR 바우처)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "bizinfo.go.kr",
    description: "중소벤처기업부 기업마당(bizinfo.go.kr) 정부 지원사업 및 보조금 공식 공고",
  },
  {
    id: "policy-korea-kr-briefing",
    name: "대한민국 정책브리핑 정책지원금·민생회복 공식 발표",
    category: "정책·지원금",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("site:korea.kr (민생지원금 OR 정책지원금 OR 소상공인 OR 보조금 OR 정부지원금)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "korea.kr",
    description: "대한민국 공식 정책브리핑(korea.kr) 범정부 정책지원금 및 민생회복 지원 프로젝트",
  },

  // ===========================================================================
  // 2. 금융·경제 (한국은행, 금융위원회, 금융감독원, KDI 경제정보센터)
  // ===========================================================================
  {
    id: "finance-bok-official",
    name: "한국은행 기준금리 및 통화정책 보도자료",
    category: "금융·경제",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("site:bok.or.kr (기준금리 OR 통화정책 OR 경제전망 OR 물가 OR 금융안정)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "bok.or.kr",
    description: "한국은행(bok.or.kr) 기준금리 결정, 통화정책 방향, 물가 및 거시경제 공식 보도자료",
  },
  {
    id: "finance-fsc-fss-official",
    name: "금융위원회·금융감독원 금융제도 및 서민금융 정책",
    category: "금융·경제",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("(site:fsc.go.kr OR site:fss.or.kr) (금융 OR 대출 OR 서민금융 OR 금리 OR 채무조정 OR 금융지원)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "fsc.go.kr",
    description: "금융위원회 및 금융감독원 공식 보도자료 기반 대출 규제, 금리 정책, 서민금융 지원 발표",
  },
  {
    id: "finance-kdi-official",
    name: "KDI 경제정보센터 및 한국개발연구원 거시경제 분석",
    category: "금융·경제",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("site:kdi.re.kr (경제동향 OR 경제전망 OR 정책포커스 OR 거시경제 OR 금융)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "kdi.re.kr",
    description: "KDI 한국개발연구원 및 경제정보센터(kdi.re.kr)의 국내외 경제동향 및 정책 분석",
  },
  {
    id: "finance-korea-kr-economy",
    name: "대한민국 정책브리핑 금융·거시경제 공식 발표",
    category: "금융·경제",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("site:korea.kr (기획재정부 OR 금융위원회) (금리 OR 거시경제 OR 물가 OR 수출 OR 금융)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "korea.kr",
    description: "대한민국 공식 정책브리핑(korea.kr) 기획재정부·금융위원회 경제 지표 및 금융 정책",
  },

  // ===========================================================================
  // 3. 테크·IT (과기정통부, 한국인터넷진흥원, 정보통신산업진흥원)
  // ===========================================================================
  {
    id: "tech-msit-official",
    name: "과학기술정보통신부 ICT·AI·반도체 공식 보도자료",
    category: "테크·IT",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("site:msit.go.kr (인공지능 OR AI OR 디지털 OR 반도체 OR 통신 OR 클라우드)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "msit.go.kr",
    description: "과학기술정보통신부(msit.go.kr) 인공지능(AI), 반도체, 미래 신기술 공식 보도자료",
  },
  {
    id: "tech-kisa-nipa-official",
    name: "한국인터넷진흥원 및 정보통신산업진흥원 디지털 정책",
    category: "테크·IT",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("(site:kisa.or.kr OR site:nipa.or.kr) (정보보안 OR AI OR 소프트웨어 OR 클라우드 OR 디지털)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "kisa.or.kr",
    description: "KISA(kisa.or.kr) 및 NIPA(nipa.or.kr)의 사이버 보안, ICT 신산업 육성 및 소프트웨어 지원 사업",
  },
  {
    id: "tech-korea-kr-official",
    name: "대한민국 정책브리핑 디지털 혁신 및 미래산업 발표",
    category: "테크·IT",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("site:korea.kr (과기정통부 OR 과학기술정보통신부) (인공지능 OR AI OR 소프트웨어 OR 미래기술 OR 디지털)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "korea.kr",
    description: "대한민국 정책브리핑(korea.kr) 국가 인공지능 전략 및 디지털 플랫폼 정부 보도자료",
  },

  // ===========================================================================
  // 4. 사회·문화 (고용노동부, 보건복지부, 문화체육관광부)
  // ===========================================================================
  {
    id: "society-moel-official",
    name: "고용노동부 일자리·노동·고용 정책 공식 브리핑",
    category: "사회·문화",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("site:moel.go.kr (고용 OR 노동 OR 일자리 OR 직업훈련 OR 최저임금 OR 근로)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "moel.go.kr",
    description: "고용노동부(moel.go.kr) 청년 일자리, 근로 복지, 고용 지원 제도 공식 보도자료",
  },
  {
    id: "society-mohw-official",
    name: "보건복지부 보건·복지·돌봄 안전망 공식 발표",
    category: "사회·문화",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("site:mohw.go.kr (보건 OR 복지 OR 돌봄 OR 건강보험 OR 국민연금 OR 의료)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "mohw.go.kr",
    description: "보건복지부(mohw.go.kr) 사회보장, 복지 사각지대 지원, 보건의료 체계 공식 발표",
  },
  {
    id: "society-mcst-official",
    name: "문화체육관광부 문화·예술·관광 진흥 공식 보도",
    category: "사회·문화",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("site:mcst.go.kr (문화 OR 관광 OR 콘텐츠 OR 예술 OR 체육 OR K컬처)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "mcst.go.kr",
    description: "문화체육관광부(mcst.go.kr) K-콘텐츠, 문화예술 및 관광 산업 활성화 정책 보도자료",
  },
  {
    id: "society-korea-kr-official",
    name: "대한민국 정책브리핑 사회·문화·보건·노동 종합 브리핑",
    category: "사회·문화",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent("site:korea.kr (보건복지부 OR 고용노동부 OR 문화체육관광부) (복지 OR 일자리 OR 문화 OR 관광 OR 보건)")}&hl=ko&gl=KR&ceid=KR:ko`,
    enabled: true,
    officialDomain: "korea.kr",
    description: "대한민국 정책브리핑(korea.kr) 주요 사회 부처의 국민 생활 밀착형 공식 정책 발표",
  },
];

/**
 * 활성화(enabled: true)된 공공기관 공식 RSS 피드 목록만 반환
 */
export function getActiveRssFeeds(): RssFeedConfig[] {
  return RSS_FEEDS.filter((feed) => feed.enabled);
}

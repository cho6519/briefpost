/**
 * ==============================================================================
 * [RSS 피드 설정 파일 - 공공·공식 기관 화이트리스트 전용]
 * 개인 블로그, 기자 칼럼, 사설, 오피니언 섹션을 원천 배제하고
 * 대한민국 정책브리핑(korea.kr), 소상공인시장진흥공단(semas.or.kr),
 * 기업마당(bizinfo.go.kr), 정부24(gov.kr), 지자체 공식 보도자료 등
 * 공식 공공기관 및 정부 부처에서 발표한 '공식 보도·공고문'으로만 한정합니다.
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
  officialDomain?: string; // 공공기관 공식 도메인 (korea.kr, semas.or.kr, bizinfo.go.kr, gov.kr 등)
}

export const RSS_FEEDS: RssFeedConfig[] = [
  // --- 1. 소상공인시장진흥공단 (semas.or.kr) 및 기업마당 (bizinfo.go.kr) 공식 공고·보도 ---
  {
    id: "portal-semas-general-management",
    name: "소상공인시장진흥공단 일반경영자금 및 경영애로자금 (공식 공고)",
    category: "정책·지원금",
    url: "https://news.google.com/rss/search?q=(site:semas.or.kr+OR+site:bizinfo.go.kr+OR+site:mss.go.kr)+소상공인+(일반경영자금+OR+경영애로자금+OR+정책자금)&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    officialDomain: "semas.or.kr",
    description: "소상공인시장진흥공단(semas.or.kr) 및 중기부 공식 일반경영자금, 일시적 경영애로자금 공고",
  },
  {
    id: "portal-semas-recovery-debt",
    name: "소진공 대환대출 및 경영안정 금융지원 (공식 보도·공고)",
    category: "정책·지원금",
    url: "https://news.google.com/rss/search?q=(site:semas.or.kr+OR+site:bizinfo.go.kr)+소상공인+(대환대출+OR+이차보전+OR+경영안정)&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    officialDomain: "semas.or.kr",
    description: "소진공 고금리 대환대출, 이차보전 지원, 희망리턴패키지 공식 공고",
  },
  {
    id: "portal-semas-direct",
    name: "소상공인시장진흥공단 소상공인 지원사업 (semas.or.kr 공식)",
    category: "정책·지원금",
    url: "https://news.google.com/rss/search?q=site:semas.or.kr+(정책자금+OR+지원사업+OR+스마트상점+OR+공고)&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    officialDomain: "semas.or.kr",
    description: "소상공인시장진흥공단(semas.or.kr) 소상공인 지원사업 및 정책자금 실시간 공식 발표",
  },
  {
    id: "portal-bizinfo-direct",
    name: "중소벤처기업부 기업마당 지원사업 공고 (bizinfo.go.kr 공식)",
    category: "정책·지원금",
    url: "https://news.google.com/rss/search?q=site:bizinfo.go.kr+(소상공인+OR+지원사업+OR+정책자금+OR+보조금)&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    officialDomain: "bizinfo.go.kr",
    description: "중소벤처기업부 기업마당(bizinfo.go.kr) 전국 소상공인·자영업자 중앙 및 지자체 공식 지원사업 공고",
  },

  // --- 2. 대한민국 정책브리핑 (korea.kr) 정부 부처 공식 보도자료 ---
  {
    id: "portal-korea-kr-minsaeng",
    name: "대한민국 정책브리핑 민생회복·민생지원금 공식 발표 (korea.kr)",
    category: "정책·지원금",
    url: "https://news.google.com/rss/search?q=site:korea.kr+(민생지원금+OR+민생회복지원금+OR+소상공인+지원)&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    officialDomain: "korea.kr",
    description: "대한민국 공식 정책브리핑(korea.kr) 범정부 민생지원금, 민생회복 프로젝트 공식 보도자료",
  },
  {
    id: "portal-korea-kr-smallbiz",
    name: "대한민국 정책브리핑 소상공인·자영업자 정책 (korea.kr)",
    category: "정책·지원금",
    url: "https://news.google.com/rss/search?q=site:korea.kr+(소상공인+정책자금+OR+경영안정+OR+지원대책)&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    officialDomain: "korea.kr",
    description: "대한민국 공식 정책브리핑(korea.kr) 중기부·기재부·금융위 소상공인 공식 정책 보도",
  },
  {
    id: "portal-korea-kr-welfare",
    name: "대한민국 정책브리핑 복지·지원금 공식 발표 (korea.kr)",
    category: "정책·지원금",
    url: "https://news.google.com/rss/search?q=site:korea.kr+(정부지원금+OR+보조금+OR+바우처+OR+환급금)&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    officialDomain: "korea.kr",
    description: "대한민국 공식 정책브리핑(korea.kr) 국민 체감 복지 지원제도 및 환급금 공식 보도자료",
  },

  // --- 3. 정부24 / 보조금24 (gov.kr) & 온통청년 (youthcenter.go.kr) 공식 포털 ---
  {
    id: "portal-gov-kr-benefit",
    name: "정부24 및 보조금24 맞춤형 혜택 공고 (gov.kr 공식)",
    category: "정책·지원금",
    url: "https://news.google.com/rss/search?q=(site:gov.kr+OR+site:plus.gov.kr)+(보조금24+OR+혜택알리미+OR+지원금+OR+환급)&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    officialDomain: "gov.kr",
    description: "정부24·보조금24(gov.kr) 국민 맞춤형 공공서비스 혜택, 정부 보조금, 감면·환급 공식 공고",
  },
  {
    id: "portal-youth-center-official",
    name: "국무조정실 온통청년 청년지원제도 (youthcenter.go.kr 공식)",
    category: "정책·지원금",
    url: "https://news.google.com/rss/search?q=site:youthcenter.go.kr+(청년정책+OR+청년수당+OR+일자리+OR+주거지원)&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    officialDomain: "youthcenter.go.kr",
    description: "국무조정실 온통청년(youthcenter.go.kr) 전국 청년 지원 정책 및 일자리·주거 지원 공식 공고",
  },

  // --- 4. 지자체(서울, 경기, 부산 등 go.kr) 공식 보도자료 및 공고문 ---
  {
    id: "portal-local-gov-minsaeng",
    name: "전국 지자체 공식 보도자료 (지자체 지원금·지역화폐)",
    category: "정책·지원금",
    url: "https://news.google.com/rss/search?q=(site:seoul.go.kr+OR+site:gg.go.kr+OR+site:busan.go.kr+OR+site:incheon.go.kr)+(민생지원금+OR+재난지원금+OR+소상공인+지원+OR+지역화폐)&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    officialDomain: "go.kr",
    description: "서울시, 경기도, 부산시, 인천시 등 지자체 공식 포털(go.kr)의 민생지원금 및 소상공인 보도자료",
  },

  // --- 5. 부동산·세제 / 금융·경제 공공기관 공식 보도 (국토부, 기재부, 금융위, 국세청) ---
  {
    id: "portal-realestate-tax-official",
    name: "국토교통부·국세청 부동산 세제 및 청약 공식 발표",
    category: "부동산·세제",
    url: "https://news.google.com/rss/search?q=(site:molit.go.kr+OR+site:nts.go.kr+OR+site:moef.go.kr)+(부동산+대책+OR+양도세+OR+취득세+OR+공공분양+OR+청약)&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    officialDomain: "go.kr",
    description: "국토교통부, 국세청, 기획재정부 공식 보도자료 기반 부동산 정책 및 세제 개편 발표",
  },
  {
    id: "portal-finance-official",
    name: "금융위원회·한국은행 금융 지원 및 제도 공식 발표",
    category: "금융·경제",
    url: "https://news.google.com/rss/search?q=(site:fsc.go.kr+OR+site:bok.or.kr+OR+site:fss.or.kr)+(서민금융+OR+소상공인+대출+OR+금리+OR+채무조정)&hl=ko&gl=KR&ceid=KR:ko",
    enabled: true,
    officialDomain: "fsc.go.kr",
    description: "금융위원회, 금융감독원, 한국은행 공식 보도자료 기반 금융 지원 및 금리 정책 발표",
  },
];

/**
 * 활성화(enabled: true)된 공공기관 공식 RSS 피드 목록만 반환
 */
export function getActiveRssFeeds(): RssFeedConfig[] {
  return RSS_FEEDS.filter((feed) => feed.enabled);
}

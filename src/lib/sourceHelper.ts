/**
 * ==============================================================================
 * [기사 출처명 정규화 헬퍼 모듈]
 * 긴 URL 대신 독자가 직관적으로 인식할 수 있는 깔끔한 한글 출처명을 생성합니다.
 * 예) "출처: 정부 보조금 포털", "출처: 대한민국 정책브리핑", "출처: 연합인포맥스"
 * ==============================================================================
 */

const MEDIA_KEYWORDS = [
  "대한민국 정책브리핑",
  "정부24 보조금24",
  "서울청년포털",
  "온통청년 청년센터",
  "정부 보조금 포털",
  "기획재정부",
  "국토교통부",
  "보건복지부",
  "금융위원회",
  "한국은행",
  "연합인포맥스",
  "연합뉴스",
  "YTN",
  "KBS 뉴스",
  "MBC 뉴스",
  "SBS 뉴스",
  "한국경제",
  "매일경제",
  "아시아경제",
  "머니투데이",
  "전자신문",
  "디지털타임스",
  "경향신문",
  "한겨레",
  "조선일보",
  "중앙일보",
  "동아일보",
  "더게임스",
  "경향게임스",
  "스포츠조선",
  "newsis",
  "뉴시스",
  "블룸버그",
  "로이터",
];

export function getSourceDisplayName(
  sourceUrl?: string | null,
  title?: string | null,
  category?: string | null
): string {
  // 1. 도메인 기반 공공기관 포털 식별
  if (sourceUrl) {
    const url = sourceUrl.toLowerCase();
    if (url.includes("korea.kr")) return "대한민국 정책브리핑";
    if (url.includes("youth.seoul.go.kr")) return "서울시 청년몽땅정보통";
    if (url.includes("plus.gov.kr") || url.includes("gov.kr")) return "정부 보조금 포털";
    if (url.includes("youthcenter.go.kr")) return "온통청년 청년센터";
    if (url.includes("moef.go.kr")) return "기획재정부";
    if (url.includes("molit.go.kr")) return "국토교통부";
    if (url.includes("bok.or.kr")) return "한국은행";
    if (url.includes("fsc.go.kr")) return "금융위원회";
  }

  // 2. 기사 제목에서 언론사/출처명 매칭
  if (title) {
    for (const media of MEDIA_KEYWORDS) {
      if (title.includes(media)) {
        return media;
      }
    }
  }

  // 3. 카테고리 기반 친화적 출처 라벨
  if (category) {
    switch (category) {
      case "정책·지원금":
        return "정부 보조금 포털";
      case "부동산·세제":
        return "부동산·세제 정책 포털";
      case "금융·경제":
        return "금융·경제 언론 보도";
      case "테크·IT":
        return "테크·IT 미디어";
      case "사회·문화":
        return "사회·문화 종합 뉴스";
      default:
        return "공식 보도자료";
    }
  }

  return "정부 보조금 포털";
}

import {
  KeywordHunterInput,
  KeywordHunterOutput,
  HuntedKeyword,
  SearchIntentType,
} from "./types";
import { callGemini } from "./geminiClient";
import { pipelineStore } from "./pipelineStore";

/**
 * STEP 1. KEYWORD HUNTER AGENT
 * 
 * 단일 책임:
 * - 시장 트렌드, 최신 기술/이슈, 산업 동향에서 가치 있는 원천 키워드 후보군 수집
 * - [중요 제한] 검색량, CPC 등의 정량 데이터가 없을 경우 절대 실제치인 양 날조하지 않고
 *   추정치(Estimated)임을 명확히 플래그(isSearchVolumeEstimate: true, isCpcEstimate: true)로 마킹
 * - 검색의도(INFORMATIONAL, COMMERCIAL 등)를 1차 판별하여 반환
 */
export class KeywordHunterAgent {
  public readonly name = "KEYWORD_HUNTER";

  public async hunt(input: KeywordHunterInput = {}): Promise<KeywordHunterOutput> {
    const domain = input.domain || "자영업자·소상공인 실전 정책자금 및 세무/지원금 가이드";
    const seedKeywords = input.seedKeywords || [
      "소상공인 정책자금 직접대출",
      "소상공인 경영안정자금 신청",
      "소상공인 전기요금 특별지원",
      "노란우산공제 소득공제 한도",
      "희망리턴패키지 점포 철거비 지원",
      "두루누리 4대 보험료 지원",
    ];
    const count = input.count || 6;

    const prompt = `
당신은 대한민국 700만 자영업자·소상공인을 위한 정책자금·세무·지원금 전문 분석가이자 "KEYWORD HUNTER" 에이전트입니다.
단순 뉴스 시황이나 글로벌 테크 이슈를 엄격히 배제하고, 소상공인의 생존과 직결된 아래 5대 핵심 실전 분야의 공식 공고 및 정부 보도자료 키워드 ${count}개를 발굴하십시오.

[5대 소상공인·자영업자 핵심 분야]
1. 소상공인 정책자금·직접/대리 대출 (소진공, 신용보증재단, 저금리 대환대출, 특례보증)
2. 정부 지원금·경영안정 바우처·공공요금 지원 (전기요금 특별지원, 가스/수도 지원, 민생회복지원금)
3. 세금·부가가치세·종합소득세 절세 및 노란우산공제 (간이과세자 기준, 부가세 확정신고, 공제 한도)
4. 인건비·일자리 안정·4대 보험 지원 (두루누리 사회보험료, 청년일자리도약장려금, 최저임금 연계)
5. 폐업 점포 철거비 지원 및 희망리턴패키지 (원상복구비 평당 지원금, 재도약·재취업 장려금)

[작업 가이드]
- 도메인: ${domain}
- 참고 시드: ${seedKeywords.join(", ")}
- [중요 원칙]: 검색량이나 CPC 데이터가 외부 툴 연동 전이라면, 추정값을 절대 실제 데이터처럼 단정하지 말고 '추정치'임을 명확히 표시하십시오.
- 검색의도(searchIntent)는 다음 4가지 중 정확히 하나를 부여하십시오:
  * INFORMATIONAL: 자격 요건, 지원 금액, 혜택 내용 등 정보 탐색
  * TRANSACTIONAL: 온라인 신청 방법, 접수 절차, 제출 서류
  * COMMERCIAL: 시중은행 대출 비교, 대환대출 금리 비교
  * NAVIGATIONAL: 소상공인정책자금 누리집, 소진공24 등 공식 포털

반드시 아래 JSON 형식으로만 응답하십시오:
{
  "huntedKeywords": [
    {
      "keyword": "키워드명 (예: 2026 소상공인 경영안정자금 신청 자격)",
      "category": "정책·지원금",
      "source": "중소벤처기업부 / 소상공인시장진흥공단 공식 공고",
      "context": "고금리·고물가 속 자영업자 유동성 확보를 위한 2026년도 신규 접수 및 요건 완화",
      "trendScore": 96,
      "searchIntent": "TRANSACTIONAL",
      "searchVolume": 45000,
      "isSearchVolumeEstimate": true,
      "cpc": 3.8,
      "isCpcEstimate": true
    }
  ]
}
`;

    try {
      const responseText = await callGemini(prompt, { temperature: 0.6 });
      const parsed = JSON.parse(responseText) as {
        huntedKeywords: Array<{
          keyword: string;
          category?: string;
          source: string;
          context: string;
          trendScore: number;
          searchIntent?: SearchIntentType;
          searchVolume?: number | null;
          isSearchVolumeEstimate?: boolean;
          cpc?: number | null;
          isCpcEstimate?: boolean;
        }>;
      };

      const huntedKeywords: HuntedKeyword[] = parsed.huntedKeywords.map((item, idx) => ({
        id: `hunt_${Date.now()}_${idx}`,
        keyword: item.keyword.trim(),
        category: item.category || "정책·지원금",
        source: item.source || "소상공인시장진흥공단 공고",
        context: item.context,
        trendScore: Number(item.trendScore) || 85,
        searchIntent: item.searchIntent || "INFORMATIONAL",
        searchVolume: item.searchVolume ?? null,
        isSearchVolumeEstimate: true,
        cpc: item.cpc ?? null,
        isCpcEstimate: true,
        discoveredAt: new Date().toISOString(),
      }));

      // 수집된 키워드를 영구 저장소에 저장
      pipelineStore.saveHuntedKeywords(huntedKeywords);

      return {
        query: domain,
        huntedKeywords,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      pipelineStore.recordApiError("KEYWORD_HUNTER/hunt", errorMsg);

      // 소상공인 5대 실전 분야 공고 기반 Fallback Mock 데이터
      const mockKeywords: HuntedKeyword[] = [
        {
          id: `hunt_mock_${Date.now()}_1`,
          keyword: "2026 소상공인 경영안정자금 신청 자격 및 온라인 접수 방법",
          category: "정책·지원금",
          source: "중소벤처기업부 및 소상공인시장진흥공단 2026 공고",
          context: "원자재 가격 상승 및 고금리 장기화로 어려움을 겪는 소상공인 대상 초저금리 직접대출 신청 개시",
          trendScore: 98,
          searchIntent: "TRANSACTIONAL",
          searchVolume: 52000,
          isSearchVolumeEstimate: true,
          cpc: 4.2,
          isCpcEstimate: true,
          discoveredAt: new Date().toISOString(),
        },
        {
          id: `hunt_mock_${Date.now()}_2`,
          keyword: "소상공인 전기요금 특별지원 20만원 지원 대상 및 신청 기간",
          category: "정책·지원금",
          source: "한국전력공사 및 중기부 소상공인 공공요금 부담완화 지침",
          context: "연 매출 6,000만 원 이하 영세 소상공인 대상 사업자당 최대 20만 원 전기요금 감면 바우처 접수",
          trendScore: 95,
          searchIntent: "INFORMATIONAL",
          searchVolume: 48000,
          isSearchVolumeEstimate: true,
          cpc: 3.5,
          isCpcEstimate: true,
          discoveredAt: new Date().toISOString(),
        },
        {
          id: `hunt_mock_${Date.now()}_3`,
          keyword: "노란우산공제 2026년 소득공제 한도 개편 및 복리 이자 혜택",
          category: "금융·경제",
          source: "중소기업중앙회 노란우산공제 운영 규정",
          context: "자영업자 종합소득세 절세를 위한 공제 한도 상향(최대 500만 원) 및 폐업 시 안전망 퇴직금 제도",
          trendScore: 91,
          searchIntent: "COMMERCIAL",
          searchVolume: 34000,
          isSearchVolumeEstimate: true,
          cpc: 5.1,
          isCpcEstimate: true,
          discoveredAt: new Date().toISOString(),
        },
        {
          id: `hunt_mock_${Date.now()}_4`,
          keyword: "희망리턴패키지 폐업 점포 철거비 평당 13만원 지원금 신청",
          category: "정책·지원금",
          source: "소상공인시장진흥공단 희망리턴패키지 사업 지침",
          context: "경영 악화로 폐업하는 자영업자의 원상복구 철거 비용을 전용면적 기준 최대 250만 원 국비 지원",
          trendScore: 89,
          searchIntent: "TRANSACTIONAL",
          searchVolume: 29000,
          isSearchVolumeEstimate: true,
          cpc: 4.0,
          isCpcEstimate: true,
          discoveredAt: new Date().toISOString(),
        },
        {
          id: `hunt_mock_${Date.now()}_5`,
          keyword: "두루누리 사회보험료 80% 지원 자격 및 근로자 4대 보험 혜택",
          category: "금융·경제",
          source: "근로복지공단 두루누리 지원 포털",
          context: "10인 미만 소규모 사업장 사업주 및 저임금 근로자 고용보험·국민연금 80% 국비 지원 제도",
          trendScore: 87,
          searchIntent: "INFORMATIONAL",
          searchVolume: 22000,
          isSearchVolumeEstimate: true,
          cpc: 2.8,
          isCpcEstimate: true,
          discoveredAt: new Date().toISOString(),
        },
        {
          id: `hunt_mock_${Date.now()}_6`,
          keyword: "소상공인 저금리 대환대출 자격 조건 및 7% 이상 고금리 전환",
          category: "금융·경제",
          source: "금융위원회 및 신용보증기금 저금리 대환 프로그램",
          context: "7% 이상 고금리 사업자 대출을 5%대 이하 저금리 보증부 대출로 갈아타는 금융비용 경감 지원",
          trendScore: 93,
          searchIntent: "COMMERCIAL",
          searchVolume: 39000,
          isSearchVolumeEstimate: true,
          cpc: 6.2,
          isCpcEstimate: true,
          discoveredAt: new Date().toISOString(),
        },
      ];

      const chosen = mockKeywords.slice(0, count);
      pipelineStore.saveHuntedKeywords(chosen);

      return {
        query: domain,
        huntedKeywords: chosen,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

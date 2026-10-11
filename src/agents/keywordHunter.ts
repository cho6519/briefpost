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
    const domain = input.domain || "AI & 테크놀로지 / IT 비즈니스";
    const seedKeywords = input.seedKeywords || ["AI 에이전트", "온디바이스 AI", "디지털 비즈니스", "생성형 AI"];
    const count = input.count || 6;

    const prompt = `
당신은 최고의 시장 트렌드 발굴 전문가이자 "KEYWORD HUNTER" 에이전트입니다.
현재 가장 급부상하고 있거나 정보 수요가 높은 가치 있는 원천 키워드 후보를 ${count}개 수집하십시오.

[작업 가이드]
- 도메인: ${domain}
- 참고 시드: ${seedKeywords.join(", ")}
- [중요 원칙]: 검색량이나 CPC 데이터가 외부 툴 연동 전이라면, 추정값을 절대 실제 데이터처럼 단정하지 말고 '추정치'임을 명확히 표시하십시오.
- 검색의도(searchIntent)는 다음 4가지 중 정확히 하나를 부여하십시오:
  * INFORMATIONAL: 개념, 원리, 방법 등 정보 탐색
  * COMMERCIAL: 솔루션 비교, 도입 비용 분석, 제품 검토
  * TRANSACTIONAL: 실행, 다운로드, 즉각적 적용
  * NAVIGATIONAL: 특정 브랜드, 공식 서비스 탐색

반드시 아래 JSON 형식으로만 응답하십시오:
{
  "huntedKeywords": [
    {
      "keyword": "키워드명 (명확한 전문 용어)",
      "category": "${domain}",
      "source": "발굴 출처 (예: 글로벌 테크 컨퍼런스, 검색 쿼리 급상승 등)",
      "context": "이 키워드가 현재 주목받는 구체적 시장/산업 배경 (1~2문장)",
      "trendScore": 88,
      "searchIntent": "INFORMATIONAL",
      "searchVolume": 12000,
      "isSearchVolumeEstimate": true,
      "cpc": 2.5,
      "isCpcEstimate": true
    }
  ]
}
`;

    try {
      const responseText = await callGemini(prompt, { temperature: 0.7 });
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
        category: item.category || domain,
        source: item.source || "글로벌 테크 트렌드 리포트",
        context: item.context,
        trendScore: Number(item.trendScore) || 80,
        searchIntent: item.searchIntent || "INFORMATIONAL",
        searchVolume: item.searchVolume ?? null,
        isSearchVolumeEstimate: true, // [원칙] 외부 실제 연동 전에는 항시 추정치로 명시
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

      // Fallback/Mock 모드 (안전한 샘플 데이터)
      const mockKeywords: HuntedKeyword[] = [
        {
          id: `hunt_mock_${Date.now()}_1`,
          keyword: "Agentic AI 워크플로우 자동화",
          category: domain,
          source: "글로벌 IT 엔지니어링 포럼 및 주요 빅테크 로드맵",
          context: "단순 챗봇을 넘어 자율적으로 도구를 사용하고 다중 에이전트 협업을 수행하는 파이프라인 수요 급증",
          trendScore: 95,
          searchIntent: "INFORMATIONAL",
          searchVolume: 18500,
          isSearchVolumeEstimate: true,
          cpc: 3.2,
          isCpcEstimate: true,
          discoveredAt: new Date().toISOString(),
        },
        {
          id: `hunt_mock_${Date.now()}_2`,
          keyword: "소형 온디바이스 SLM 도입 비용",
          category: domain,
          source: "모바일 칩셋 제조사 및 오픈소스 LLM 벤치마크",
          context: "클라우드 API 비용 절감과 데이터 프라이버시 보호를 위한 기업용 소형 언어 모델 비교 분석",
          trendScore: 91,
          searchIntent: "COMMERCIAL",
          searchVolume: 9200,
          isSearchVolumeEstimate: true,
          cpc: 2.8,
          isCpcEstimate: true,
          discoveredAt: new Date().toISOString(),
        },
        {
          id: `hunt_mock_${Date.now()}_3`,
          keyword: "AI 검색 생성 최적화 GEO 전략",
          category: domain,
          source: "글로벌 디지털 마케팅 및 검색엔진 점유율 보고서",
          context: "전통적 구글 SEO에서 AI 검색 답변에 자사 정보가 인용되도록 최적화하는 생성형 검색엔진 최적화 대두",
          trendScore: 89,
          searchIntent: "INFORMATIONAL",
          searchVolume: 14000,
          isSearchVolumeEstimate: true,
          cpc: 4.1,
          isCpcEstimate: true,
          discoveredAt: new Date().toISOString(),
        },
        {
          id: `hunt_mock_${Date.now()}_4`,
          keyword: "멀티모달 VLM 실시간 비전 솔루션",
          category: domain,
          source: "산업용 스마트 비전 및 로보틱스 연구 동향",
          context: "이미지 및 영상을 실시간으로 추론하여 제조 불량 감지 및 유통 자동화를 실현하는 비전 언어 모델",
          trendScore: 85,
          searchIntent: "COMMERCIAL",
          searchVolume: 6500,
          isSearchVolumeEstimate: true,
          cpc: 2.1,
          isCpcEstimate: true,
          discoveredAt: new Date().toISOString(),
        },
        {
          id: `hunt_mock_${Date.now()}_5`,
          keyword: "차세대 AI 전력망 및 저전력 NPU",
          category: domain,
          source: "반도체 공급망 및 데이터센터 친환경 에너지 규제 분석",
          context: "데이터센터 전력 소모 폭증을 해결하기 위한 고효율 액체 냉각 및 저전력 반도체 설계 수요 급증",
          trendScore: 82,
          searchIntent: "INFORMATIONAL",
          searchVolume: 8000,
          isSearchVolumeEstimate: true,
          cpc: 1.9,
          isCpcEstimate: true,
          discoveredAt: new Date().toISOString(),
        },
        {
          id: `hunt_mock_${Date.now()}_6`,
          keyword: "RAG 하이브리드 검색 아키텍처",
          category: domain,
          source: "엔터프라이즈 AI 엔지니어링 표준 가이드",
          context: "벡터 검색과 키워드 BM25를 결합하여 정확도를 극대화하는 엔터프라이즈 지식베이스 구축 기법",
          trendScore: 88,
          searchIntent: "INFORMATIONAL",
          searchVolume: 11000,
          isSearchVolumeEstimate: true,
          cpc: 3.5,
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

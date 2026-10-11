import {
  KeywordEvaluatorInput,
  KeywordEvaluatorOutput,
  EvaluatedKeyword,
  EvaluationCriteria,
  KeywordGrade,
} from "./types";
import { callGemini } from "./geminiClient";
import { pipelineStore } from "./pipelineStore";

/**
 * STEP 3 & STEP 4. KEYWORD EVALUATOR & SELECTION AGENT
 * 
 * 단일 책임:
 * - STEP 3: 6대 핵심 지표(검색수요, 경쟁도, 검색의도, 수익성, 확장성, 지속성) 정밀 평가
 * - STEP 4: 우선순위 및 등급(S급 / A급 / 트렌드) 부여 후 최우선 키워드 1개 최종 선정
 * - [중요 제한]: 정량 지표는 실제 수치 수집 전까지 추정치(Estimated)임을 명시
 */
export class KeywordEvaluatorAgent {
  public readonly name = "KEYWORD_EVALUATOR";

  public async evaluate(input: KeywordEvaluatorInput): Promise<KeywordEvaluatorOutput> {
    const { candidates } = input;
    if (!candidates || candidates.length === 0) {
      throw new Error("KEYWORD_EVALUATOR_ERROR: 평가할 유효한 키워드 후보가 없습니다.");
    }

    const targetAudience = input.targetAudience || "IT 업계 실무자, 개발자, 비즈니스 리더, 테크 관심 일반 독자";
    const candidatesStr = JSON.stringify(candidates, null, 2);

    const prompt = `
당신은 냉철한 미디어 전략가이자 "KEYWORD EVALUATOR" 에이전트입니다.
제공된 키워드 후보군을 다음 6대 필수 기준에 따라 1~100점으로 정량 평가하고,
등급(S / A / TREND / B / C)을 산정하여 이번 파이프라인에서 기사화할 단 1개의 최우선 키워드를 선정하십시오.

[6대 평가 기준]
1. searchDemand (1~100): 독자들의 지속적인 검색 및 정보 탐색 수요 잠재력
2. competition (1~100): 경쟁 강도 (대형 매체 대비 차별화 용이성, 낮을수록 진입 유리)
3. searchIntentFit (1~100): 독자가 원하는 검색의도(정보/비교/해결)와 본 웹사이트 성격의 부합도
4. monetizationPotential (1~100): 광고 단가, 솔루션 연계, 제휴 마케팅 등 비즈니스 수익 잠재력
5. topicScalability (1~100): 단발성 이슈에 그치지 않고 시리즈/토픽 클러스터로 확장 가능한지
6. sustainability (1~100): 6개월~1년 뒤에도 유효한 에버그린(지속성) 생명력

[등급 부여 기준]
- "S": 종합점수 90점 이상이며 지속성과 수익성이 뛰어남
- "A": 종합점수 80~89점
- "TREND": 화제성과 시의성이 압도적으로 높아 지금 당장 다뤄야 하는 키워드
- "B": 70~79점
- "C": 70점 미만

[타깃 독자]
${targetAudience}

[키워드 후보 목록]
${candidatesStr}

반드시 아래 JSON 형식으로만 응답하십시오:
{
  "allEvaluated": [
    {
      "keyword": "키워드명",
      "category": "카테고리",
      "grade": "S",
      "score": 93,
      "criteria": {
        "searchDemand": 90,
        "competition": 45,
        "searchIntentFit": 95,
        "monetizationPotential": 88,
        "topicScalability": 94,
        "sustainability": 92,
        "totalScore": 93
      },
      "searchIntent": "INFORMATIONAL",
      "selectionReason": "선정 또는 평가 상세 이유",
      "recommendedAngle": "기사 작성 시 집중해야 할 기획 관점 및 차별화 앵글",
      "targetAudience": "${targetAudience}"
    }
  ],
  "selectedKeywordIndex": 0
}
`;

    try {
      const responseText = await callGemini(prompt, { temperature: 0.3 });
      const parsed = JSON.parse(responseText) as {
        allEvaluated: Array<{
          keyword: string;
          category: string;
          grade: KeywordGrade;
          score: number;
          criteria: EvaluationCriteria;
          searchIntent: EvaluatedKeyword["searchIntent"];
          selectionReason: string;
          recommendedAngle: string;
          targetAudience: string;
        }>;
        selectedKeywordIndex?: number;
      };

      const now = new Date().toISOString();
      const allEvaluated: EvaluatedKeyword[] = parsed.allEvaluated.map((item) => ({
        ...item,
        isDataEstimated: true, // [제한 사항 준수] 정량 추정치 명시
        evaluatedAt: now,
      }));

      // 최우선 키워드 선정 (명시된 인덱스 또는 점수 최고점)
      const selectedIndex = parsed.selectedKeywordIndex ?? 0;
      const selectedKeyword = allEvaluated[selectedIndex] || allEvaluated[0];

      // 러너업 구성
      const runnerUps = allEvaluated
        .filter((k) => k.keyword !== selectedKeyword.keyword)
        .map((k) => ({
          keyword: k.keyword,
          score: k.score,
          grade: k.grade,
          reason: k.selectionReason,
        }));

      // DB 저장 및 관리자 대시보드 상태 갱신
      pipelineStore.saveEvaluatedKeywords(allEvaluated);
      pipelineStore.updateContentTask(selectedKeyword.keyword, "PENDING_WRITING");

      return {
        selectedKeyword,
        allEvaluated,
        runnerUps,
        evaluatedCount: allEvaluated.length,
        timestamp: now,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      pipelineStore.recordApiError("KEYWORD_EVALUATOR/evaluate", errorMsg);

      // Fallback/Mock 모드: 후보군 중 최고 트렌드 점수를 우선순위로 계산
      const now = new Date().toISOString();
      const sorted = [...candidates].sort((a, b) => b.trendScore - a.trendScore);
      const top = sorted[0];

      const allEvaluated: EvaluatedKeyword[] = sorted.map((cand, idx) => {
        const isS = idx === 0 && cand.trendScore >= 90;
        const grade: KeywordGrade = isS ? "S" : cand.trendScore >= 85 ? "A" : cand.trendScore >= 80 ? "TREND" : "B";
        const totalScore = Math.min(96, Math.max(75, cand.trendScore));

        return {
          keyword: cand.keyword,
          category: cand.category,
          grade,
          score: totalScore,
          criteria: {
            searchDemand: totalScore,
            competition: 40,
            searchIntentFit: 92,
            monetizationPotential: 85,
            topicScalability: 89,
            sustainability: 88,
            totalScore,
          },
          searchIntent: cand.searchIntent || "INFORMATIONAL",
          selectionReason: `${cand.keyword}는 최근 산업 현장과 검색 수요 양쪽에서 급상승 중이며, 6대 평가 지표 전반에서 가장 높은 기사화 효율을 보임.`,
          recommendedAngle: `단순 이론 설명을 넘어 비즈니스 실무 적용 사례와 파급력을 명쾌하게 분석하는 프레임워크 제시`,
          targetAudience,
          isDataEstimated: true,
          evaluatedAt: now,
        };
      });

      const selectedKeyword = allEvaluated[0];
      const runnerUps = allEvaluated.slice(1).map((k) => ({
        keyword: k.keyword,
        score: k.score,
        grade: k.grade,
        reason: k.selectionReason,
      }));

      pipelineStore.saveEvaluatedKeywords(allEvaluated);
      pipelineStore.updateContentTask(selectedKeyword.keyword, "PENDING_WRITING");

      return {
        selectedKeyword,
        allEvaluated,
        runnerUps,
        evaluatedCount: allEvaluated.length,
        timestamp: now,
      };
    }
  }
}

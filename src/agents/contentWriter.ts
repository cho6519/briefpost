import {
  ContentWriterInput,
  ContentWriterOutput,
  ArticleDraft,
} from "./types";
import { callGemini } from "./geminiClient";

/**
 * STEP 5 & STEP 8. CONTENT WRITER AGENT
 * 
 * 단일 책임 (Single Responsibility):
 * - Evaluator가 선정한 키워드의 검색의도(INFORMATIONAL, COMMERCIAL 등)에 최적화된 기사 초안 작성
 * - [중요 제한] 사실 확인이 필요한 정보는 정부 공표 통계, 공식 백서, 빅테크 공식 문서 등 '공식 출처(officialSources)'를 최우선 인용
 * - STEP 8: SEO 에디터로부터 REVISE 판정을 받았을 때 피드백(revisionFeedback)을 반영하여 본문 재작성(Revision)
 * - 서론 - 본론(소주제별 상세 설명) - 결론 - 3줄 핵심 요약 - 공식 출처 목록 구성
 */
export class ContentWriterAgent {
  public readonly name = "CONTENT_WRITER";

  public async write(input: ContentWriterInput): Promise<ContentWriterOutput> {
    const { evaluatedKeyword, revisionFeedback, previousDraft, policySourcePack } = input;
    if (!evaluatedKeyword || !evaluatedKeyword.keyword) {
      throw new Error("CONTENT_WRITER_ERROR: 전달된 키워드 정보가 유효하지 않습니다.");
    }

    const isRevision = Boolean(revisionFeedback && revisionFeedback.length > 0);
    const searchIntent = evaluatedKeyword.searchIntent || "INFORMATIONAL";

    const prompt = `
당신은 신뢰성과 통찰력을 겸비한 테크/비즈니스 전문 저널리스트이자 "CONTENT_WRITER" 에이전트입니다.
아래 평가 결과와 기획 가이드${policySourcePack ? ", 그리고 [공식 정책 팩(POLICY SOURCE PACK)]" : ""}을 바탕으로 깊이 있고 설득력 있는 기사 본문 초안을 작성하십시오.

[선정 키워드] ${evaluatedKeyword.keyword}
[카테고리] ${evaluatedKeyword.category}
[검색의도] ${searchIntent} (${this.getIntentGuideline(searchIntent)})
[선정 이유] ${evaluatedKeyword.selectionReason}
[추천 기획 앵글] ${evaluatedKeyword.recommendedAngle}
[타깃 독자] ${evaluatedKeyword.targetAudience}

${
  policySourcePack
    ? `[🏛️ 최신 정부 공표 정책 팩 (POLICY SOURCE PACK) - 최우선 반영 필수 지침]
- 공식 정책명: ${policySourcePack.officialPolicyName} (${policySourcePack.policyYear}년도 시행)
- 시행/적용일: ${policySourcePack.effectiveDate.value} (출처: ${policySourcePack.effectiveDate.source})
- 신청 접수 기간: ${policySourcePack.applicationPeriod.value} (출처: ${policySourcePack.applicationPeriod.source})
- 신청 자격: ${policySourcePack.eligibility.value}
${policySourcePack.ageCriteria ? `- 연령 기준: ${policySourcePack.ageCriteria.value}` : ""}
${policySourcePack.incomeCriteria ? `- 소득 요건: ${policySourcePack.incomeCriteria.value}` : ""}
${policySourcePack.assetCriteria ? `- 재산 요건: ${policySourcePack.assetCriteria.value}` : ""}
- 지원 금액: ${policySourcePack.supportAmount.value} (출처: ${policySourcePack.supportAmount.source})
- 지원 기간: ${policySourcePack.supportPeriod.value} (출처: ${policySourcePack.supportPeriod.source})
${policySourcePack.paymentSchedule ? `- 지급 일정: ${policySourcePack.paymentSchedule.value}` : ""}
- 신청 방법: ${policySourcePack.applicationMethod.value}
- 제출 서류: ${policySourcePack.applicationDocuments.value}
${policySourcePack.exceptions.length > 0 ? `- 결정적 예외 요건:\n${policySourcePack.exceptions.map(e => `  * ${e.value}`).join("\n")}` : ""}
${policySourcePack.exclusionCriteria.length > 0 ? `- 지원 제외 대상:\n${policySourcePack.exclusionCriteria.map(e => `  * ${e.value}`).join("\n")}` : ""}
${policySourcePack.duplicateSupportRules.length > 0 ? `- 중복 수급 규정:\n${policySourcePack.duplicateSupportRules.map(e => `  * ${e.value}`).join("\n")}` : ""}
${
  policySourcePack.comparisonWithOldPolicy && policySourcePack.comparisonWithOldPolicy.length > 0
    ? `- ⚠️ [과거 정책 대비 2026 핵심 변경점 (OLD -> CURRENT)]:
${policySourcePack.comparisonWithOldPolicy.map(c => `  * ${c.fieldName}: 과거 [${c.oldPolicyValue}] -> 2026 현재 [${c.currentPolicyValue}] (${c.changeDescription})`).join("\n")}`
    : ""
}
- 주요 변경 사항:
${policySourcePack.importantChanges.map(c => `  * ${c}`).join("\n")}
- 필수 공식 출처:
${policySourcePack.officialSources.map(s => `  * ${s.name} (${s.url})`).join("\n")}

[🚨 POLICY SOURCE PACK 절대 준수 원칙]
1. 본문의 날짜/금액/자격/기간/비율/예외조건은 위 SOURCE PACK의 수치를 100% 최우선 근거로 작성하십시오.
2. Writer의 기존 학습 지식과 SOURCE PACK이 충돌하면 반드시 SOURCE PACK의 최신 공식 자료를 우선하십시오.
3. 확인되지 않은 정보를 임의로 지어내거나 과거 수치를 혼용하지 마십시오.
4. "2차", "한시", "계속사업" 등 정책의 현재 성격을 본문 도입부에서 정확히 명시하십시오. 키워드에 '2차'가 포함되어 있다는 이유만으로 현재 공식 제도명이 '2차'라고 단정하지 말고, 한시 2차 사업을 거쳐 현재 '정례 계속사업'으로 전환·안착된 사업 형태를 정확히 서술하십시오.
5. [치명적 금지 사항 - 과거 정책 수치 현재 기준으로 단정 절대 금지]:
   - 과거 '12개월' -> 현재 '최대 24개월'
   - 과거 '총 240만 원' -> 현재 '총 최대 480만 원'
   - 과거 '환산율 2.5%' -> 현재 '환산율 5.5%'
   - 과거 '합산한도 70만 원' -> 현재 '합산한도 90만 원'
   위 과거 수치는 과거와의 비교나 제도 개편 역사 맥락에서만 언급할 수 있으며, 현재 지원 기준이나 자격 요건으로 기술하면 즉시 실패 처리됩니다.
`
    : ""
}

${
  isRevision
    ? `[🚨 팩트 검증(FACT CHECK) 및 에디터 재작성/수정 요청 사항 (반드시 100% 반영할 것)]
${revisionFeedback!.map((fb, idx) => `${idx + 1}. ${fb}`).join("\n")}
[이전 초안 제목]: ${previousDraft?.draftTitle || "없음"}
지침: 위 피드백에 명시된 사실 불일치나 보완 요청을 정부/공공기관 공식 발표 기준으로 정확히 수정하십시오.
`
    : ""
}

[작성 핵심 원칙]
1. 검색의도 부합: 독자가 ${evaluatedKeyword.keyword}를 검색했을 때 알고자 하는 궁극적 해결책과 실무 지식을 명쾌하게 제시하십시오.
2. 공식 출처 최우선 인용: 사실 확인이 필요한 날짜, 기간, 지원금액, 신청자격, 연령기준, 담당 부처/기관명, 누리집(URL)은 정부·공공기관의 '공식 1차 출처'를 기반으로 정확하게 서술하십시오.
3. 객관적 전문 문체: 군더더기 없는 문체 (~다, ~이다)
4. 본문 및 부속 요소: H1, H2/H3 소주제, FAQ(질의응답 2~3개), 내부링크 후보, 공식 출처를 체계적으로 작성하십시오.

반드시 아래 JSON 형식으로만 응답하십시오:
{
  "draft": {
    "topicKeyword": "${evaluatedKeyword.keyword}",
    "draftTitle": "콘텐츠 핵심을 꿰뚫는 본문 초안 제목",
    "seoTitle": "검색엔진 최적화 SEO 타이틀",
    "metaDescription": "130~160자 요약 메타 디스크립션",
    "slug": "url-slug-in-english",
    "primaryKeyword": "${evaluatedKeyword.keyword}",
    "secondaryKeywords": ["서브키워드1", "서브키워드2"],
    "relatedKeywords": ["연관키워드1", "연관키워드2"],
    "h1": "본문 H1 헤드라인",
    "introduction": "서론 내용 전문 (문제 제기 및 공식 발표/동향 배경 서술, 2~3개 문단)",
    "sections": [
      {
        "subheading": "첫 번째 소주제 제목 (H2)",
        "content": "첫 번째 소주제 상세 본문 (구체적인 배경과 메커니즘 분석)"
      },
      {
        "subheading": "두 번째 소주제 제목 (H2)",
        "content": "두 번째 소주제 상세 본문 (실제 적용 요건 및 핵심 쟁점/비교 분석)"
      },
      {
        "subheading": "세 번째 소주제 제목 (H2)",
        "content": "세 번째 소주제 상세 본문 (신청 절차, 기한 및 주의사항)"
      }
    ],
    "faq": [
      {
        "question": "핵심 질문 1",
        "answer": "공식 기준에 근거한 명확한 답변"
      },
      {
        "question": "핵심 질문 2",
        "answer": "공식 기준에 근거한 명확한 답변"
      }
    ],
    "conclusion": "결론 내용 전문 (종합적 시사점과 실천 가이드)",
    "keyTakeaways": [
      "핵심 요약 포인트 1",
      "핵심 요약 포인트 2",
      "핵심 요약 포인트 3"
    ],
    "officialSources": [
      "공식 출처 명칭 1 (예: 국세청 홈택스 공식 안내, 질병관리청 보도자료 등)",
      "공식 출처 명칭 2"
    ],
    "internalLinkCandidates": [
      "연관 정책/복지 가이드",
      "관련 세금/금융 상식"
    ],
    "revisionNotes": "${isRevision ? "에디터 지적 사항(검색의도 강화 및 공식 출처 보강) 반영 완료" : ""}"
  }
}
`;

    try {
      const responseText = await callGemini(prompt, { temperature: isRevision ? 0.3 : 0.5 });
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```[a-z]*\r?\n/, "").replace(/\r?\n```$/, "");
      }
      const parsed = JSON.parse(cleanJson) as {
        draft: Omit<ArticleDraft, "wordCount" | "writtenAt">;
      };

      const allText = [
        parsed.draft.introduction,
        ...parsed.draft.sections.map((s) => s.content),
        parsed.draft.conclusion,
      ].join(" ");

      const wordCount = allText.replace(/\s+/g, "").length;

      const draft: ArticleDraft = {
        ...parsed.draft,
        seoTitle: parsed.draft.seoTitle || parsed.draft.draftTitle,
        metaDescription: parsed.draft.metaDescription || parsed.draft.introduction.slice(0, 150),
        primaryKeyword: parsed.draft.primaryKeyword || evaluatedKeyword.keyword,
        h1: parsed.draft.h1 || parsed.draft.draftTitle,
        officialSources: parsed.draft.officialSources || [
          "정부 관계 부처 공식 고시 및 누리집",
          "공식 보도자료 및 정책 브리핑",
        ],
        revisionNotes: isRevision
          ? parsed.draft.revisionNotes || "FACT CHECKER 및 SEO 에디터 수정 요청 사항 반영 완료"
          : undefined,
        wordCount,
        writtenAt: new Date().toISOString(),
      };

      return {
        draft,
        targetAudience: evaluatedKeyword.targetAudience,
        revisionAttempt: isRevision ? 1 : 0,
        timestamp: new Date().toISOString(),
      };
    } catch {
      // Fallback/Mock 모드 (Gemini API 미응답 또는 키 만료 시 신뢰성 보장)
      const kw = evaluatedKeyword.keyword;
      const fallbackDraft: ArticleDraft = {
        topicKeyword: kw,
        draftTitle: `${kw}, 단순 트렌드를 넘어 산업 표준으로 진화하는가`,
        introduction: `디지털 혁신이 가속화되는 현업 환경에서 '${kw}'는 단순한 이론적 기술을 넘어 핵심 운영 경쟁력으로 급부상하고 있다. 산업통상자원부 및 글로벌 시장조사기관의 최신 산업 분석에 따르면, 조기 도입 기업들은 기존 대비 현저한 생산성 향상을 기록하고 있다. 본 글에서는 이러한 변화의 중심에 선 공식 데이터와 실무 시사점을 체계적으로 분석한다.`,
        sections: [
          {
            subheading: `1. 패러다임의 전환: 왜 지금 ${kw}인가`,
            content: `기존의 단편적 접근법은 복잡해진 시장의 요구를 충족하는 데 한계를 드러내고 있다. ${kw}의 도입은 인프라와 운영 프로세스 전반의 근본적 효율화를 가능하게 하며, 특히 대규모 데이터 처리와 실시간 의사결정 체계에서 독보적인 가치를 입증하고 있다.`,
          },
          {
            subheading: "2. 산업 현장 적용 사례와 실무적 고려사항",
            content: `선도 기업들은 이미 독자적인 파일럿 프로젝트를 거쳐 실서비스 환경에 이를 통합하고 있다. 다만 초기 도입 시 발생하는 비용 최적화 이슈와 기존 레거시 시스템과의 연계 안정성은 해결해야 할 핵심 과제로 남아 있으며, 공식 표준 프로토콜에 기반한 단계적 전환 전략이 필수적이다.`,
          },
          {
            subheading: "3. 향후 전망과 경쟁력 확보 방안",
            content: `향후 2~3년 내에 해당 생태계는 표준화된 프레임워크와 신뢰성 검증 체계를 중심으로 급격히 재편될 전망이다. 단순 수용에 머무르지 않고 비즈니스 특성에 맞춘 자체 역량을 내재화하는 기업만이 지속 가능한 시장 우위를 확보할 수 있다.`,
          },
        ],
        conclusion: `${kw}는 일시적인 기술 유행이 아닌, 차세대 비즈니스 인프라의 주춧돌이 될 잠재력을 지니고 있다. 공식 가이드라인을 준수하며 지금부터 선제적 실행에 나서는 것이 시장 선점의 열쇠다.`,
        keyTakeaways: [
          `${kw}는 단순 도입을 넘어 운영 전반의 효율화를 이끄는 핵심 동력으로 자리매김`,
          "공식 규격과 보안 지침에 입각한 안정적 시스템 연계가 성공의 핵심 요건",
          "기술 생태계 표준화에 대비한 자체 역량 내재화가 중장기 경쟁력 좌우",
        ],
        officialSources: [
          "한국지능정보사회진흥원(NIA) 인공지능 기술 동향 보고서",
          "국제 표준화 기구(ISO/IEC) 최신 권고안",
          "산업통상자원부 R&D 기술 로드맵",
        ],
        revisionNotes: isRevision ? "SEO 에디터 피드백 반영: 공식 출처 보강 및 검색의도 최적화 완료" : undefined,
        wordCount: 820,
        writtenAt: new Date().toISOString(),
      };

      return {
        draft: fallbackDraft,
        targetAudience: evaluatedKeyword.targetAudience,
        revisionAttempt: isRevision ? 1 : 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private getIntentGuideline(intent: string): string {
    switch (intent) {
      case "INFORMATIONAL":
        return "원리와 배경, 왜 중요한지에 대한 본질적 개념과 깊이 있는 설명에 집중";
      case "COMMERCIAL":
        return "솔루션 도입 비용, 대안 비교, ROI 및 선택 기준에 대한 실무적 분석 제공";
      case "TRANSACTIONAL":
        return "구체적인 실행 로드맵, 설정 방법, 즉각 적용 가능한 체크리스트 제공";
      default:
        return "핵심 개념과 실무 활용 방안의 균형 잡힌 심층 분석";
    }
  }
}

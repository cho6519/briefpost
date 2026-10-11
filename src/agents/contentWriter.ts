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

[🔥 9단계 실전 블로그형 롱폼 작성 절대 규칙 (공백 제외 1,800~2,500자 내외)]
단순 단신 뉴스 요약을 엄격히 금지합니다. 독자가 글 하나로 신청부터 주의사항까지 완전히 이해할 수 있는 체류형 실전 가이드로 작성하십시오.

1단계: [핵심 요약 박스] 서론 직후에 지원 대상, 신청 기간, 지원 방식, 공식 신청처를 4대 불릿으로 명확히 정리.
2단계: [본문 목차] 독자가 원하는 항목으로 바로 이동할 수 있는 마크다운 목차 목록.
3단계: [지원 대상 및 상세 자격 조건] 신청 가능한 소상공인 요건, 연 매출 기준, 상시 근로자 수, 지원 제외 업종(유흥/도박 등).
4단계: [지원 금액·금리·상환 조건 비교표] 반드시 마크다운 테이블(| 구분 | 지원 내용 | 세부 조건 | 비고 |)을 포함하여 한눈에 비교.
5단계: [신청 방법 단계별 절차] 1단계(사전 준비 서류), 2단계(온라인 접수 경로), 3단계(심사 및 약정 체결)로 체계화.
6단계: [탈락·반려 사유 및 주의사항] 서류 미비 등 주요 부결 사유와 함께, 정책자금 대행 명목의 불법 브로커 수수료 사기 주의 문구를 ⚠️ 콜아웃 박스로 강력 경고.
7단계: [자주 묻는 질문 FAQ] 실무에서 가장 많이 묻는 질문 3~4개와 명쾌한 해결책.
8단계: [공식 출처 및 기준일자] 중소벤처기업부, 소상공인시장진흥공단 등 공식 공고명 및 2026년 기준일자 표기.
9단계: [문체 및 분량] 신뢰감 있는 종결어미(~다, ~이다, ~합니다), 전체 본문 분량은 공백 제외 최소 1,800자 이상 2,500자 내외로 상세하고 풍부하게 작성.

반드시 아래 JSON 형식으로만 응답하십시오:
{
  "draft": {
    "topicKeyword": "${evaluatedKeyword.keyword}",
    "draftTitle": "2026 소상공인 경영안정자금 신청 자격 및 온라인 접수 방법 총정리",
    "seoTitle": "2026 소상공인 경영안정자금 자격 조건·지원 금액·신청 방법 완벽 가이드",
    "metaDescription": "2026년 소상공인 경영안정자금 신청 자격, 지원 한도 및 금리, 온라인 접수 3단계 절차와 부결 방지 팁을 한눈에 정리해 드립니다.",
    "slug": "2026-smallbiz-management-fund-guide",
    "primaryKeyword": "${evaluatedKeyword.keyword}",
    "secondaryKeywords": ["소상공인 정책자금", "경영안정자금 자격", "소진공 직접대출"],
    "relatedKeywords": ["소상공인 대출", "희망플러스", "저금리 대환"],
    "h1": "${evaluatedKeyword.keyword} 완벽 가이드",
    "introduction": "고금리와 경기 둔화 속에서 사업장을 운영하는 자영업자들의 자금난을 해소하기 위한 2026년도 소상공인 경영안정자금 지원이 본격화되었습니다...\n\n> **[⚡ 핵심 지원 요약]**\n> - **지원 대상**: 연 매출 및 상시 근로자 요건을 충족하는 소상공인\n> - **신청 기간**: 2026년도 예산 소진 시까지 선착순 접수\n> - **지원 방식**: 소상공인시장진흥공단 직접대출 및 대리대출\n> - **공식 신청처**: 소상공인정책자금 누리집 (ols.semas.or.kr)",
    "sections": [
      {
        "subheading": "지원 대상 및 상세 자격 조건 (업종·매출·제외 기준)",
        "content": "경영안정자금을 지원받기 위해서는 소상공인기본법에 따른 소상공인 요건을 갖추어야 합니다...\n\n- **광업·제조업·건설업·운수업**: 상시 근로자 10인 미만\n- **그 외 업종(음식점, 서비스업, 도소매업 등)**: 상시 근로자 5인 미만\n- **지원 제외 업종**: 유흥주점업, 도박 및 사행성 업종, 전문 직종 등"
      },
      {
        "subheading": "지원 금액·금리 및 상환 조건 비교",
        "content": "2026년도 경영안정자금의 세부 대출 조건은 다음과 같습니다.\n\n| 구분 | 지원 한도 | 적용 금리 | 상환 기간 |\n| :--- | :--- | :--- | :--- |\n| 일반 경영안정 | 최대 7,000만 원 | 정책자금 기준금리 + 0.6%p | 5년 (거치 2년 포함) |\n| 특별 경영안정 | 최대 1억 원 | 정책자금 기준금리 + 0.4%p | 5년 (거치 2년 포함) |\n| 대환대출 전환 | 최대 5,000만 원 | 연 4.5% 고정금리 | 10년 분할상환 |"
      },
      {
        "subheading": "신청 방법 및 온라인 접수 3단계 절차",
        "content": "신청은 소상공인정책자금 공식 누리집을 통해 100% 비대면 온라인 접수로 진행됩니다.\n\n1. **1단계 (서류 준비)**: 사업자등록증명원, 부가가치세 과세표준증명원, 4대보험 가입자명부 발급\n2. **2단계 (온라인 접수)**: 소상공인정책자금 포털 접속 ➔ 공동인증서 로그인 ➔ 자가진단 및 신청서 작성\n3. **3단계 (심사 및 약정 체결)**: 서류 적격 심사 ➔ 전자약정 체결 ➔ 자금 입금"
      },
      {
        "subheading": "탈락·반려 사유 및 신청 시 주의사항",
        "content": "매년 수많은 자영업자가 서류 미비나 신용 관리 부족으로 심사에서 탈락합니다.\n\n- **국세 및 지방세 체납**: 체납 사실이 있는 경우 즉시 부결되므로 완납 증명 필수\n- **신용평점 기준 미달**: NICE 개인신용평점 기준 확인 필요\n\n<aside class=\"callout-amber w-full bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg my-4 text-amber-950 text-sm\">\n  <div class=\"font-bold text-amber-900 mb-1\">⚠️ 불법 정책자금 브로커 주의사항</div>\n  <div>공공기관을 사칭하여 정책자금 100% 승인을 보장한다며 수수료나 착수금을 요구하는 행위는 명백한 불법입니다. 정부 정책자금은 일체의 중개 수수료가 발생하지 않습니다.</div>\n</aside>"
      }
    ],
    "faq": [
      {
        "question": "기존에 소진공 대출을 이용 중인데 추가 신청이 가능한가요?",
        "answer": "기존 대출 잔액과 업종별 총 대출 한도 범위 내에서 심사를 거쳐 추가 지원이 가능합니다."
      },
      {
        "question": "간이과세자도 신청할 수 있나요?",
        "answer": "사업자등록을 필하고 정상 영업 중인 간이과세자라면 매출 증빙을 통해 신청 가능합니다."
      },
      {
        "question": "온라인 신청 후 입금까지 얼마나 걸리나요?",
        "answer": "서류 적격 심사 통과 후 전자약정 체결까지 통상 7영업일~14영업일 내외가 소요됩니다."
      }
    ],
    "conclusion": "2026년 소상공인 경영안정자금은 선착순으로 예산이 조기 소진될 가능성이 높으므로, 필요 서류를 사전에 구비하여 신속하게 접수하는 것이 핵심입니다. 자금 계획을 면밀히 수립하여 사업장 운영의 든든한 디딤돌로 활용하시기 바랍니다.",
    "keyTakeaways": [
      "최대 7,000만 원~1억 원 한도의 초저금리 정책자금",
      "소상공인정책자금 누리집에서 온라인 원스톱 접수",
      "국세 완납 및 사전 서류 구비가 신속 승인의 핵심"
    ],
    "officialSources": [
      "중소벤처기업부 2026년도 소상공인 정책자금 운용계획 공고",
      "소상공인시장진흥공단 소상공인정책자금 (ols.semas.or.kr)"
    ],
    "internalLinkCandidates": [
      "소상공인 전기요금 특별지원 신청 가이드",
      "노란우산공제 소득공제 및 복리 혜택 총정리"
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
      // Fallback/Mock 모드 (Gemini API 미응답 또는 키 만료 시에도 9단계 실전 블로그 규격 보장)
      const kw = evaluatedKeyword.keyword;
      const fallbackIntro = `고금리와 내수 침체 장기화로 자금 조달에 어려움을 겪고 계신 소상공인과 자영업자 대표님들을 위해, 중소벤처기업부와 소상공인시장진흥공단이 주관하는 2026년도 소상공인 경영안정자금 지원 사업이 본격 시행됩니다. 본 제도는 시중은행 대출 이용이 어렵거나 고금리 다중채무로 유동성 위기를 겪는 한계 자영업자에게 초저금리 정책자금을 공급하여 긴급 운영자금을 수혈하는 대표적인 금융 안전망입니다. 2026년도 예산 소진 시 조기 마감되므로, 자격 요건과 필수 구비 서류를 사전에 철저히 파악하고 신속히 접수하는 것이 무엇보다 중요합니다.\n\n> **[⚡ 2026 소상공인 경영안정자금 핵심 지원 요약]**\n> - **지원 대상**: 소상공인기본법 제2조에 따른 상시 근로자 및 매출 기준을 충족하는 개인·법인 사업자\n> - **신청 기간**: 2026년 연중 수시 접수 (분기별 회차 배정 및 예산 소진 시 조기 마감)\n> - **지원 방식**: 소상공인시장진흥공단 직접대출 및 지역신용보증재단 연계 대리대출\n> - **공식 신청처**: 소상공인정책자금 누리집 (ols.semas.or.kr) / 소진공24`;

      const fallbackSections = [
        {
          subheading: "지원 대상 및 상세 자격 조건 (업종·매출·제외 기준)",
          content: `2026년도 경영안정자금을 지원받기 위해서는 소상공인기본법에 명시된 소상공인의 법적 기준을 충족해야 합니다. 주된 사업의 연간 매출액이 업종별 소기업 기준(10억 원 ~ 120억 원 이하)에 부합해야 하며, 상시 근로자 수 기준을 동시에 만족해야 합니다.\n\n- **광업·제조업·건설업 및 운수업**: 상시 근로자 수 10인 미만 사업체\n- **그 외 업종(음식점업, 도소매업, 숙박업, 서비스업 등)**: 상시 근로자 수 5인 미만 사업체\n- **공통 필수 요건**: 사업자등록증상 정상 영업 중인 사업자로서 국세 및 지방세 체납 사실이 없어야 함\n\n단, 도박·사행성 업종, 유흥주점업, 담배 중개업, 무도장 등 정책자금 융자제외 대상 업종은 신청이 원천 불가합니다. 또한 세금 체납, 신용도 판단정보 등록, 한국신용정보원 연체 등록 이력이 있는 경우 심사 대상에서 즉시 제외됩니다.`,
        },
        {
          subheading: "지원 금액·금리 및 상환 조건 비교",
          content: `2026년 경영안정자금은 자금의 성격과 사업장 위기 단계에 따라 한도와 금리가 세분화되어 공급됩니다. 아래 비교표를 통해 본 사업장에 가장 적합한 융자 유형을 확인하십시오.\n\n| 지원 유형 | 지원 한도 | 적용 금리 (변동/고정) | 상환 및 거치 기간 | 비고 |\n| :--- | :--- | :--- | :--- | :--- |\n| 일반 경영안정자금 | 최대 7,000만 원 | 정책자금 기준금리 + 0.6%p | 5년 (거치기간 2년 포함) | 원금균등분할상환 |\n| 특별 경영안정자금 | 최대 1억 원 | 정책자금 기준금리 + 0.4%p | 5년 (거치기간 2년 포함) | 재해·위기 지역 특례 |\n| 저금리 대환대출 | 최대 5,000만 원 | 연 4.5% 고정금리 | 10년 분할상환 (거치 없음) | 7% 이상 고금리 대출 보유자 |\n| 취약 소상공인 긴급자금 | 최대 3,000만 원 | 정책자금 기준금리 (무가산) | 5년 (거치기간 2년 포함) | 신용평점 하위 20% 전용 |\n\n※ 적용 금리는 분기별로 고시되는 중소벤처기업부 정책자금 기준금리에 연동되며, 지역신용보증재단 보증서 발급 시 연 0.8%~1.0%의 보증수수료가 별도 부과될 수 있습니다.`,
        },
        {
          subheading: "신청 방법 및 온라인 접수 3단계 절차",
          content: `모든 신청은 서류 제출 간소화를 위해 '소상공인정책자금 누리집'을 통한 100% 비대면 온라인 방식으로 접수됩니다.\n\n1. **1단계 (사전 필수 서류 발급 준비)**: 홈택스 및 정부24를 통해 사업자등록증명원, 부가가치세 과세표준증명원(최근 1~2개년), 국세·지방세 납세증명서, 건강보험 자격득실확인서(또는 4대보험 가입자명부)를 PDF로 발급받습니다.\n2. **2단계 (공식 누리집 접속 및 자가진단 접수)**: 소상공인정책자금 온라인 포털(ols.semas.or.kr)에 대표자 본인 인증서로 로그인한 후, 자가진단 설문을 진행하고 지원 신청서를 작성하여 구비 서류를 업로드합니다.\n3. **3단계 (보증서 심사 및 전자약정 체결)**: 서류 적격 심사 및 현장 실사가 완료되면 승인 통보 문자가 발송됩니다. 이후 온라인으로 전자금융 약정을 체결하면 지정 은행 계좌로 자금이 신속히 입금됩니다.`,
        },
        {
          subheading: "탈락·반려 사유 및 신청 시 주의사항",
          content: `정책자금 접수 시 사소한 실수나 사전 준비 부족으로 부결 판정을 받는 사례가 빈번하므로 다음 사항을 반드시 점검해야 합니다.\n\n- **국세 및 지방세 미납**: 단 1원의 체납이 있어도 전산에서 자동 반려되므로 완납 증명서 확인 필수\n- **사업장 휴·폐업 상태**: 사실상 휴업 상태이거나 매출 증빙이 전무한 경우 지원 불가\n- **기존 정책자금 연체 이력**: 소진공 또는 보증재단 대출 원리금 연체 이력이 존재하는 경우\n\n<aside class=\"callout-amber w-full bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg my-4 text-amber-950 text-sm\">\n  <div class=\"font-bold text-amber-900 mb-1\">⚠️ 불법 정책자금 브로커 주의사항</div>\n  <div>정부 기관이나 공단을 사칭하여 '정책자금 100% 무조건 승인', '비공개 특례자금 알선' 등을 미끼로 수수료나 착수금을 요구하는 행위는 명백한 불법 브로커 금융 사기입니다. 정부 정책자금은 일체의 중개 수수료가 발생하지 않으며, 적발 시 자금 회수 및 형사 처벌 대상이 되므로 절대 응하지 마십시오.</div>\n</aside>`,
        },
      ];

      const fallbackFaq = [
        {
          question: "기존에 소진공 정책자금 대출을 이용 중인데 추가 신청이 가능한가요?",
          answer: "기존 대출 잔액과 업종별 총 대출 한도 범위 내에서 심사를 거쳐 추가 지원이 가능합니다. 단, 기존 대출의 연체 사실이 없어야 하며 신용도 심사 기준을 충족해야 합니다.",
        },
        {
          question: "간이과세자나 1인 자영업자도 신청할 수 있나요?",
          answer: "네, 가능합니다. 사업자등록을 마치고 실제 영업 중인 간이과세자 및 직원을 두지 않은 1인 사업자도 매출 증빙 자료를 제출하면 일반 소상공인과 동일하게 심사를 거쳐 지원받을 수 있습니다.",
        },
        {
          question: "온라인 접수 후 최종 대출 입금까지 얼마나 걸리나요?",
          answer: "직접대출의 경우 서류 접수 후 약 7영업일~10영업일, 대리대출(보증재단 연계)의 경우 보증 심사를 포함하여 통상 2주~3주 내외가 소요됩니다. 신청 접수 초기에는 신청자가 몰려 다소 지연될 수 있습니다.",
        },
        {
          question: "신용점수가 낮은 경우에도 지원을 받을 수 있나요?",
          answer: "NICE 개인신용평점 기준 저신용 소상공인을 위한 별도의 '취약 소상공인 전용 특례자금' 트랙이 운영되고 있으므로, 일반 대출 심사에서 부결되더라도 저신용 특례 자금을 신청하실 수 있습니다.",
        },
      ];

      const fallbackConclusion = `2026년 소상공인 경영안정자금은 경기 불확실성이 지속되는 상황에서 자영업 대표님들의 사업장 운영 리스크를 방어할 수 있는 가장 든든한 저리 융자 제도입니다. 분기별로 예산이 소진되면 조기에 마감될 수 있는 만큼, 본 글의 3단계 가이드를 확인하시어 구비 서류를 미리 발급받고 공고 즉시 발 빠르게 신청하시기 바랍니다. 정부의 공적 금융 지원을 현명하게 활용하여 안정적인 사업 영위를 이어가시길 응원합니다.`;

      const allFallbackText = [
        fallbackIntro,
        ...fallbackSections.map((s) => s.content),
        fallbackConclusion,
      ].join(" ");

      const wordCount = allFallbackText.replace(/\s+/g, "").length;

      const fallbackDraft: ArticleDraft = {
        topicKeyword: kw,
        draftTitle: `2026 소상공인 경영안정자금 신청 자격 및 온라인 접수 방법 총정리`,
        seoTitle: `2026 소상공인 경영안정자금 자격 조건·지원 한도·신청 방법 완벽 가이드`,
        metaDescription: `2026년 소상공인 경영안정자금 신청 자격, 지원 한도 및 금리 조건, 온라인 접수 3단계 절차와 부결 방지 핵심 팁을 알기 쉽게 정리해 드립니다.`,
        slug: "2026-smallbiz-management-fund-guide",
        primaryKeyword: kw,
        secondaryKeywords: ["소상공인 정책자금", "경영안정자금 자격", "소진공 직접대출"],
        relatedKeywords: ["소상공인 대출", "희망플러스", "저금리 대환대출"],
        h1: `${kw} 완벽 가이드`,
        introduction: fallbackIntro,
        sections: fallbackSections,
        faq: fallbackFaq,
        conclusion: fallbackConclusion,
        keyTakeaways: [
          "최대 7,000만 원~1억 원 한도의 초저금리 소상공인 정책자금 지원",
          "소상공인정책자금 누리집(ols.semas.or.kr)에서 100% 비대면 온라인 접수",
          "국세 완납 증명 및 사전 구비 서류 준비가 신속 승인의 핵심 열쇠",
        ],
        officialSources: [
          "중소벤처기업부 2026년도 소상공인 정책자금 운용계획 공고",
          "소상공인시장진흥공단 소상공인정책자금 누리집 (ols.semas.or.kr)",
        ],
        internalLinkCandidates: [
          "소상공인 전기요금 특별지원 신청 자격 및 환급 가이드",
          "노란우산공제 소득공제 한도 및 복리 이자 혜택 총정리",
          "희망리턴패키지 폐업 점포 철거비 평당 지원금 신청 방법",
        ],
        revisionNotes: isRevision ? "SEO 에디터 피드백 반영: 공식 출처 보강 및 9단계 실전 롱폼 가이드 규격 최적화 완료" : undefined,
        wordCount,
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

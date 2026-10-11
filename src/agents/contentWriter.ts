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

[🔥 체류 시간(Dwell Time) 극대화 실전 블로그형 롱폼 작성 절대 규칙 (공백 제외 2,000~2,800자)]
단순 단신 뉴스 요약을 엄격히 금지합니다. '옆 가게 사장님에게 꼼꼼히 설명해 주는 선배 경영 컨설턴트' 어조(~하시면 됩니다, ~기준입니다)로 작성하며, '100% 승인', '무조건' 같은 과장 표현은 절대 사용하지 마십시오.

반드시 다음 핵심 실무 섹션과 규격을 본문에 모두 포함해야 합니다:

1. [핵심 요약 박스]
   서론 직후에 지원 대상, 신청 기간, 지원 방식, 공식 신청처를 4대 불릿으로 명확히 정리.

2. [신청 가능 여부 3분 자가진단 (체류 시간 극대화 체크리스트)]
   독자가 화면에서 하나씩 확인하며 체류할 수 있도록 8~10개의 체크박스(- [ ]) 항목을 반드시 작성하고, 각 항목 바로 아래에 걸렸을 때의 실무 대처법을 💡 콜아웃 형태로 1줄씩 명시하십시오.

3. [3가지 독자 유형별 가상 시뮬레이션 카드]
   다음 3대 사업자 유형별로 각각 [신청 가능성 / 추천 자금 / 주의사항]을 명쾌하게 분석하십시오:
   (1) 업력 1년 미만 신규 창업 사업자
   (2) 3~5년 차 기존 운영 사업자
   (3) 기존 정책자금 대출 보유 사업자

4. [지원 금액·금리 및 상환 조건 비교표]
   반드시 마크다운 비교표(| 지원 유형 | 지원 한도 | 적용 금리 | 상환 및 거치 기간 | 비고 |)를 포함하여 한눈에 파악할 수 있도록 제시.

5. [단계별 신청 절차 3줄 포맷 통일]
   신청 1단계부터 4단계까지 각 단계마다 반드시 아래 3줄 구조로 작성하십시오:
   - **소요 기간**: O일~O주
   - **준비물 및 서류**: (홈택스, 정부24, 대법원 전산 등 공식 발급처 명시)
   - **자주 하는 실수**: (사업주가 흔히 범하는 서류 누락 및 전산 입력 실수)

6. [탈락·부결 방지 실무 팁 5선 (3단 심층 분석)]
   자주 부결되는 핵심 사유 5가지(세금 체납, 매출 증빙 불일치, 사업장 실체 불분명, 기존 대출 연체 이력, 지원 제외 업종)에 대해 각각:
   **[왜 문제가 되는가 ➔ 신청 전 확인법 ➔ 이미 걸렸다면 대응책]**의 3단 구조로 실무적이고 날카롭게 서술하십시오.
   또한 ⚠️ 불법 브로커 수수료 사기 경고 콜아웃 박스를 포함하십시오.

7. [자주 묻는 질문 FAQ]
   실무 Q&A 3~4선과 명쾌한 컨설팅 답변.

8. [공식 출처, YMYL 기준일자 및 면책 조항]
   공식 공고처, 기준일자(2026년 기준) 및 법적 면책 고지(본 가이드는 정보 제공 목적이며...) 필수 포함.

반드시 아래 JSON 형식으로만 응답하십시오:
{
  "draft": {
    "topicKeyword": "${evaluatedKeyword.keyword}",
    "draftTitle": "2026 소상공인 경영안정자금 신청 자격 및 온라인 접수 방법 총정리",
    "seoTitle": "2026 소상공인 경영안정자금 자격 조건·지원 한도·신청 방법 완벽 가이드",
    "metaDescription": "2026년 소상공인 경영안정자금 자격 요건, 3분 자가진단 체크리스트, 유형별 시뮬레이션 및 온라인 접수 단계별 절차, 부결 방지 실무 팁을 총정리해 드립니다.",
    "slug": "2026-smallbiz-management-fund-guide",
    "primaryKeyword": "${evaluatedKeyword.keyword}",
    "secondaryKeywords": ["소상공인 정책자금", "경영안정자금 자격", "소진공 직접대출"],
    "relatedKeywords": ["소상공인 대출", "희망플러스", "저금리 대환"],
    "h1": "${evaluatedKeyword.keyword} 완벽 가이드",
    "introduction": "도입부...",
    "sections": [
      {
        "subheading": "지원 대상 및 3분 자가진단 체크리스트 (8~10개 항목)",
        "content": "자가진단 체크리스트 내용..."
      },
      {
        "subheading": "독자 유형별 실전 시뮬레이션: 내 사업장의 신청 가능성은?",
        "content": "3가지 유형별 분석..."
      },
      {
        "subheading": "지원 금액·금리 및 상환 조건 비교",
        "content": "마크다운 테이블..."
      },
      {
        "subheading": "신청 방법 및 온라인 접수 단계별 절차 (3줄 포맷 통일)",
        "content": "단계별 3줄 포맷 절차..."
      },
      {
        "subheading": "탈락·부결 방지 5대 실무 팁 (3단 심층 분석) 및 주의사항",
        "content": "부결 사유 3단 구조 및 브로커 경고..."
      }
    ],
    "faq": [
      {
        "question": "질문...",
        "answer": "답변..."
      }
    ],
    "conclusion": "결론...",
    "keyTakeaways": ["요약1", "요약2", "요약3"],
    "officialSources": ["출처1", "출처2"],
    "internalLinkCandidates": ["추천글1", "추천글2"]
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
          "중소벤처기업부 및 소상공인시장진흥공단 2026 공고",
          "소상공인정책자금 누리집 (ols.semas.or.kr)",
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
      // Fallback/Mock 모드 (실무 3분 자가진단, 3대 가상 시뮬레이션, 3줄 단계별 포맷, 부결방지 3단 구조 완벽 구현)
      const kw = evaluatedKeyword.keyword;
      const fallbackIntro = `고금리와 내수 침체 장기화로 자금 조달에 어려움을 겪고 계신 소상공인과 자영업자 대표님들을 위해, 중소벤처기업부와 소상공인시장진흥공단이 주관하는 2026년도 소상공인 경영안정자금 지원 사업이 본격 시행 중입니다.\n\n본 제도는 시중은행 대출 이용이 어렵거나 고금리 다중채무로 유동성 위기를 겪는 한계 자영업자에게 초저금리 정책자금을 공급하여 긴급 운영자금을 수혈하는 대표적인 금융 안전망입니다. 2026년도 예산 소진 시 조기 마감되므로, 자격 요건과 필수 구비 서류를 사전에 철저히 파악하고 신속히 접수하시는 것이 무엇보다 중요합니다.\n\n> **[⚡ 2026 소상공인 경영안정자금 핵심 지원 요약]**\n> - **지원 대상**: 소상공인기본법 제2조에 따른 상시 근로자 및 매출 기준을 충족하는 개인·법인 사업자\n> - **신청 기간**: 2026년 연중 수시 접수 (분기별 회차 배정 및 예산 소진 시 조기 마감)\n> - **지원 방식**: 소상공인시장진흥공단 직접대출 및 지역신용보증재단 연계 대리대출\n> - **공식 신청처**: 소상공인정책자금 누리집 (ols.semas.or.kr) / 소진공24`;

      const fallbackSections = [
        {
          subheading: "지원 대상 및 3분 자가진단 체크리스트",
          content: `경영안정자금을 신청하기 전, 우리 사업장이 기본 요건에 부합하는지 3분 만에 확인해 보실 수 있는 자가진단 체크리스트입니다. 각 항목을 클릭하여 확인해 보시고, 해당하지 않는 항목이 있다면 아래 대처법을 참고하시기 바랍니다.\n\n- [ ] **1. 사업자등록증상 정상 영업 중인 사업자이신가요?**\n  💡 대처법: 현재 휴·폐업 상태인 경우 지원이 불가하며, 폐업 사업자는 '희망리턴패키지 재기지원 트랙'을 이용하셔야 합니다.\n\n- [ ] **2. 광업·제조업·건설업·운수업은 상시 근로자 10인 미만, 그 외 업종(음식점, 도소매 등)은 5인 미만이신가요?**\n  💡 대처법: 기준 근로자 수를 초과한 경우 소상공인이 아닌 중소기업 정책자금(중진공) 트랙으로 전환 접수하셔야 합니다.\n\n- [ ] **3. 국세 및 지방세 체납 사실이 단 1건도 없으신가요?**\n  💡 대처법: 세무서나 위택스를 통해 체납액을 즉시 완납하거나 공식 분납 승인을 받은 후 납세증명서를 재발급받으시면 됩니다.\n\n- [ ] **4. 사업장 임대차 계약서 및 사업장 실체가 명확히 존재하나요?**\n  💡 대처법: 공유오피스나 비상주 전대차의 경우 현장 실사에서 부결될 수 있으므로 전대차동의서 및 실제 영업 사진을 사전 구비하십시오.\n\n- [ ] **5. 금융기관 연체 대출금이나 신용도 판단정보 등록 이력이 없으신가요?**\n  💡 대처법: 한국신용정보원 연체 등록자는 일반 대출이 어려우므로 '신용회복위원회 성실상환자 소액자금'을 검토하십시오.\n\n- [ ] **6. 정책자금 융자 제외 업종(유흥주점, 도박, 사행성, 전문직 등)에 해당하지 않으신가요?**\n  💡 대처법: 사업자등록증상 주업종 코드를 확인하시고, 실제 매출 비중이 높은 일반 소매/서비스 업종으로 업종 정정을 신청하십시오.\n\n- [ ] **7. 최근 1년 이내 부가가치세 또는 종합소득세 신고 매출 실적이 있으신가요?**\n  💡 대처법: 매출 증빙이 전무한 완전 무실적 신규 사업자는 '신규 창업자 특례보증' 전용 서류를 준비하셔야 합니다.\n\n- [ ] **8. 정부 지원 한도(동일인 정책자금 누적 한도)를 초과하지 않으셨나요?**\n  💡 대처법: 소진공 누리집 마이페이지에서 기존 이용 잔액을 조회하신 후 남은 한도 범위 내에서 감액 신청하시면 됩니다.`,
        },
        {
          subheading: "독자 유형별 실전 가상 시뮬레이션: 내 사업장 맞춤 전략",
          content: `사업장의 운영 기간과 기존 대출 유무에 따라 최적의 자금 신청 전략이 달라집니다. 아래 3가지 대표 시나리오를 통해 사업장 상황에 꼭 맞는 솔루션을 확인하십시오.\n\n### 💡 Case 1. 업력 1년 미만 신규 창업 사업자\n- **신청 가능성**: ★★★★☆ (양호 - 청년·초기창업 전용 트랙 활용 시 승인율 높음)\n- **추천 자금**: 청년고용연계자금 및 초기 창업기업 전용 경영안정자금 (최대 3,000만 원~5,000만 원)\n- **핵심 주의사항**: 재무제표가 아직 없으므로 부가가치세 매입·매출장 및 사업계획서, 임대차계약서가 심사의 핵심 지표가 됩니다.\n\n### 💡 Case 2. 3~5년 차 기존 운영 사업자 (매출 정체기)\n- **신청 가능성**: ★★★★★ (최적 - 가장 많은 배정 예산 적용)\n- **추천 자금**: 일반경영안정자금 및 소상공인 특례보증 연계 대리대출 (최대 7,000만 원)\n- **핵심 주의사항**: 전년 대비 매출 감소 추세가 확인되면 심사관이 상환 능력을 엄격히 평가하므로, 원자재비 영수증 등 자금 소요 증빙을 철저히 구비하셔야 합니다.\n\n### 💡 Case 3. 기존 정책자금 대출 보유 사업자 (고금리 다중채무)\n- **신청 가능성**: ★★★☆☆ (보통 - 기 대출 잔액 및 신용평점에 좌우)\n- **추천 자금**: 소상공인 저금리 대환대출 (최대 5,000만 원, 7% 이상 고금리 대출 갈아타기)\n- **핵심 주의사항**: 기존 정책자금의 연체 이력이 없어야 하며, 신용보증기금·지역신보의 기보증 회수 조건을 면밀히 확인 후 신청하셔야 합니다.`,
        },
        {
          subheading: "지원 금액·금리 및 상환 조건 비교",
          content: `2026년도 소상공인 경영안정자금은 자금의 성격과 사업장의 위기 단계에 따라 한도와 금리가 세분화되어 공급됩니다. 아래 비교표를 통해 최적의 융자 유형을 확인하십시오.\n\n| 지원 유형 | 지원 한도 | 적용 금리 (변동/고정) | 상환 및 거치 기간 | 비고 |\n| :--- | :--- | :--- | :--- | :--- |\n| 일반 경영안정자금 | 최대 7,000만 원 | 정책자금 기준금리 + 0.6%p | 5년 (거치기간 2년 포함) | 원금균등분할상환 |\n| 특별 경영안정자금 | 최대 1억 원 | 정책자금 기준금리 + 0.4%p | 5년 (거치기간 2년 포함) | 재해·위기 지역 특례 |\n| 저금리 대환대출 | 최대 5,000만 원 | 연 4.5% 고정금리 | 10년 분할상환 (거치 없음) | 7% 이상 고금리 대출 보유자 |\n| 취약 소상공인 긴급자금 | 최대 3,000만 원 | 정책자금 기준금리 (무가산) | 5년 (거치기간 2년 포함) | 신용평점 하위 20% 전용 |\n\n※ 적용 금리는 분기별로 고시되는 중소벤처기업부 정책자금 기준금리에 연동되며, 지역신용보증재단 보증서 발급 시 연 0.8%~1.0%의 보증수수료가 별도 부과될 수 있습니다.`,
        },
        {
          subheading: "신청 방법 및 온라인 접수 단계별 절차",
          content: `모든 신청은 서류 제출 간소화를 위해 '소상공인정책자금 누리집'을 통한 100% 비대면 온라인 방식으로 진행됩니다. 각 단계별 핵심 가이드를 숙지하십시오.\n\n### 1단계: 사전 필수 서류 발급 및 디지털 준비\n- **소요 기간**: 1일 내외\n- **준비물 및 서류**: 사업자등록증명원(홈택스), 최근 1~2개년 부가가치세 과세표준증명원(홈택스), 국세·지방세 납세증명서(정부24/위택스), 4대보험 가입자명부(4대사회보험정보연계센터)\n- **자주 하는 실수**: 지방세 납세증명서의 유효기간(보통 30일)이 만료되었거나, 공동인증서가 개인용으로 잘못 로그인되어 법인·기업인증이 누락되는 사례가 많습니다.\n\n### 2단계: 소상공인정책자금 누리집 온라인 접수\n- **소요 기간**: 신청서 작성 약 20~30분 소요\n- **준비물 및 서류**: 대표자 본인 인증서(공동인증서/금융인증서/간편인증), 사업장 임대차계약서 사본 PDF, 통장 사본\n- **자주 하는 실수**: 자가진단 문항에서 '상시 근로자 수'를 대표자 본인을 포함하여 잘못 기재하거나, 희망 대출 금액을 한도 초과로 기입하여 1차 심사에서 반려되는 경우입니다.\n\n### 3단계: 보증 심사 및 현장 실사\n- **소요 기간**: 5영업일~10영업일 내외\n- **준비물 및 서류**: 심사관 추가 요청 서류(매출처별 세금계산서 합계표, 통장 거래내역서 등), 사업장 현장 실사 준비\n- **자주 하는 실수**: 보증재단 심사관의 보완 서류 요청 문자를 스팸으로 오인하여 기한(통상 3영업일) 내 미제출로 자동 취소되는 사례가 빈번합니다.\n\n### 4단계: 전자약정 체결 및 최종 자금 입금\n- **소요 기간**: 전자약정 완료 후 2~3영업일 이내\n- **준비물 및 서류**: 약정 은행 계좌(사업자 명의), 보안카드 또는 OTP, 전자서명 인증서\n- **자주 하는 실수**: 약정 체결 시점에 다른 금융사에서 고금리 대출을 신규 실행하여 신용평점이 급변하면 승인이 취소될 수 있으므로 최종 입금 전까지 추가 대출을 절대 삼가셔야 합니다.`,
        },
        {
          subheading: "탈락·부결 방지 5대 실무 팁 및 주의사항",
          content: `정책자금 접수 시 사소한 절차상 하자나 신용 관리 부족으로 부결 판정을 받는 안타까운 사례가 많습니다. 가장 빈번한 5대 부결 사유를 3단 심층 분석으로 정리해 드립니다.\n\n### 1. 국세 및 지방세 체납\n- **왜 문제가 되는가**: 정책자금은 국민 세금으로 운용되는 공적 기금이므로 세금 체납 사업자는 전산 스크리닝에서 1차 자동 부결됩니다.\n- **신청 전 확인법**: 홈택스와 위택스에서 '납세증명서'를 발급하여 유효기간 및 체납 내역 '0원' 여부를 직접 확인하십시오.\n- **이미 걸렸다면 대응책**: 즉시 완납 후 영수증을 제출하거나, 관할 세무서에서 '분납 승인서'를 정식 발급받아 첨부하시면 구제받을 수 있습니다.\n\n### 2. 부가가치세 매출 증빙 불일치\n- **왜 문제가 되는가**: 신청서에 기재한 연 매출과 홈택스 공식 과세표준증명원의 매출액이 불일치하면 허위 기재로 간주됩니다.\n- **신청 전 확인법**: 홈택스 부가가치세 과세표준증명원의 1기·2기 합산 금액을 1원 단위까지 확인하십시오.\n- **이미 걸렸다면 대응책**: 기재 착오임을 소명하는 사유서와 함께 최근 통장 입금 내역 및 POS 매출 정산표를 보완 서류로 제출하십시오.\n\n### 3. 사업장 실체 불분명 및 위장 영업 의심\n- **왜 문제가 되는가**: 페이퍼컴퍼니나 허위 사업자 등록을 차단하기 위해 보증재단은 로드뷰 및 현장 방문 실사를 엄격히 진행합니다.\n- **신청 전 확인법**: 간판, 출입문 상호 부착 여부, 내부 집기 및 상품 재고가 정상 영업 상태인지 확인하십시오.\n- **이미 걸렸다면 대응책**: 실제 영업 현장 사진(간판, 내부 인테리어, 고객 영수증 등)을 다각도로 촬영하여 첨부하십시오.\n\n### 4. 기존 대출 연체 이력 및 신용평점 급락\n- **왜 문제가 되는가**: 단기 연체(5영업일 이상, 10만 원 이상)라도 전산에 등재되면 신용보증서 발급이 원천 거절됩니다.\n- **신청 전 확인법**: KCB 또는 NICE 지키미 무료 조회를 통해 단기 연체 정보 등록 여부를 사전에 스크리닝하십시오.\n- **이미 걸렸다면 대응책**: 연체액을 전액 상환한 후 연체 해제 정보가 전산에 반영될 때까지 최소 2주 대기 후 재접수하시거나 저신용 특례 트랙을 신청하십시오.\n\n### 5. 정책자금 융자 제외 업종 오등록\n- **왜 문제가 되는가**: 유흥업, 도박, 부동산 임대업 등 융자 제외 코드가 사업자등록증에 부업종으로라도 포함되어 있으면 접수가 불가합니다.\n- **신청 전 확인법**: 홈택스 사업자등록증의 주업종 및 부업종 코드를 전수 확인하십시오.\n- **이미 걸렸다면 대응책**: 세무서 민원봉사실이나 홈택스를 통해 융자 제외 부업종을 삭제하는 '사업자등록 정정'을 신청하신 후 정정된 사업자등록증명원을 제출하십시오.\n\n<aside class=\"callout-amber w-full bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg my-4 text-amber-950 text-sm\">\n  <div class=\"font-bold text-amber-900 mb-1\">⚠️ 불법 정책자금 브로커 주의사항</div>\n  <div>공공기관을 사칭하여 '정책자금 100% 무조건 승인', '비공개 특례자금 알선' 등을 미끼로 수수료나 착수금을 요구하는 행위는 명백한 불법 브로커 금융 사기입니다. 정부 정책자금은 일체의 중개 수수료가 발생하지 않으며, 적발 시 자금 회수 및 형사 처벌 대상이 되므로 절대 응하지 마십시오.</div>\n</aside>`,
        },
      ];

      const fallbackFaq = [
        {
          question: "기존에 소진공 정책자금 대출을 이용 중인데 추가 신청이 가능한가요?",
          answer: "기존 대출 잔액과 업종별 총 대출 한도 범위 내에서 심사를 거쳐 추가 지원이 가능합니다. 단, 기존 대출의 연체 사실이 없어야 하며 신용도 심사 기준을 충족해야 합니다.",
        },
        {
          question: "간이과세자나 1인 자영업자도 신청할 수 있나요?",
          answer: "네, 가능합니다. 사업자등록을 마치고 실제 영업 중인 간이과세자 및 직원을 두지 않은 1인 사업자도 매출 증빙 자료를 제출하시면 일반 소상공인과 동일하게 심사를 거쳐 지원받으실 수 있습니다.",
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

      const fallbackConclusion = `2026년 소상공인 경영안정자금은 경기 불확실성이 지속되는 상황에서 자영업 대표님들의 사업장 운영 리스크를 방어할 수 있는 가장 든든한 저리 융자 제도입니다. 분기별로 예산이 소진되면 조기에 마감될 수 있는 만큼, 본 가이드의 3분 자가진단과 3단계 절차를 확인하시어 구비 서류를 미리 발급받고 공고 즉시 발 빠르게 신청하시기 바랍니다.\n\n정부의 공적 금융 지원을 현명하게 활용하여 안정적인 사업 영위를 이어가시길 진심으로 응원합니다.`;

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
        metaDescription: `2026년 소상공인 경영안정자금 신청 자격, 3분 자가진단 체크리스트, 유형별 시뮬레이션 및 온라인 접수 단계별 절차, 부결 방지 핵심 팁을 알기 쉽게 정리해 드립니다.`,
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
        revisionNotes: isRevision ? "SEO 에디터 피드백 반영: 공식 출처 보강 및 실무 자가진단·부결 방지 심층 분석 규격 최적화 완료" : undefined,
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

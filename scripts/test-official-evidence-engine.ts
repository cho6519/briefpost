/**
 * OFFICIAL SOURCE EVIDENCE ENGINE 실전 검증 테스트 스크립트
 * 
 * 대상 키워드: 「2026 청년 월세 지원사업 신청 자격 및 지급 기간」
 * 
 * 필수 검증 7대 항목:
 * 1. 2026년 적용 정책을 설명하는 구체적인 공식 문서를 실제로 확보했는가?
 * 2. 신청 기간이 실제 공식 문서에 명시되어 있는가?
 * 3. 월 지원액과 지원 기간이 실제 근거 문장으로 확인되는가?
 * 4. 청약통장 조건이 2026년 적용 규칙으로 확인되는가?
 * 5. 기존 수혜자와 신규 신청자 규칙이 구분되는가?
 * 6. 과거 사업 안내를 현재 규칙으로 잘못 적용하지 않았는가?
 * 7. 확보한 원문에 없는 정보를 모델이 임의로 추가하지 않았는가?
 * 
 * 환경: test=true, 운영 데이터 변경 절대 금지
 */
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { policySourceResolver } from "../src/agents/policySourceResolver";
import { policyTemporalValidator } from "../src/agents/policyTemporalValidator";
import { officialSourceEvidenceEngine } from "../src/agents/officialSourceEvidenceEngine";
import { ContentWriterAgent } from "../src/agents/contentWriter";
import { FactCheckerAgent } from "../src/agents/factChecker";
import { SeoEditorAgent } from "../src/agents/seoEditor";
import { EvaluatedKeyword } from "../src/agents/types";

interface BaselineCounts {
  articles: number;
  queue: number;
  drafts: number;
}

function getBaseline(): BaselineCounts {
  const dbPath = path.join(process.cwd(), "data", "news.db");
  const db = new Database(dbPath);
  const articlesCount = (db.prepare("SELECT count(*) as count FROM articles").get() as { count: number }).count;
  db.close();

  const queuePath = path.join(process.cwd(), "data", "publish-queue.json");
  const queueCount = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, "utf-8")).length : 0;

  const draftsDir = path.join(process.cwd(), "data", "drafts");
  const draftsCount = fs.existsSync(draftsDir) ? fs.readdirSync(draftsDir).length : 0;

  return { articles: articlesCount, queue: queueCount, drafts: draftsCount };
}

async function runOfficialSourceEvidenceValidation() {
  const runId = `test_evidence_engine_${Date.now()}`;
  console.log("================================================================");
  console.log("🏛️ [OFFICIAL SOURCE EVIDENCE ENGINE 실전 검증 테스트]");
  console.log(`   키워드: 「2026 청년 월세 지원사업 신청 자격 및 지급 기간」`);
  console.log(`   runId: ${runId} (test=true, NO PRODUCTION WRITE)`);
  console.log("================================================================\n");

  const initialCounts = getBaseline();
  console.log("[0. 운영 데이터 베이스라인 확인]");
  console.log(`  - articles DB: ${initialCounts.articles}건`);
  console.log(`  - publish queue: ${initialCounts.queue}건`);
  console.log(`  - drafts 디렉터리: ${initialCounts.drafts}건\n`);

  const targetKeyword = "2026 청년 월세 지원사업 신청 자격 및 지급 기간";
  const category = "정책·지원금";
  const currentDate = "2026-10-11";

  // STEP 4: Evaluated Keyword 정의
  const evaluatedKeyword: EvaluatedKeyword = {
    keyword: targetKeyword,
    category,
    grade: "S",
    score: 97,
    criteria: {
      searchDemand: 96,
      competition: 25,
      searchIntentFit: 98,
      monetizationPotential: 89,
      topicScalability: 92,
      sustainability: 94,
      totalScore: 97,
    },
    searchIntent: "INFORMATIONAL",
    selectionReason: "2026년 청년 주거 정책 계속사업 전환 및 소득/재산/지급기간 공식 팩트 확인 수요 급증",
    recommendedAngle: "국토교통부 공식 시행지침 기반 24개월(480만원), 청약통장 폐지, 신청기간 종료 및 지자체 추가공고 대기 사실 완벽 정리",
    targetAudience: "독립 거주 중인 만 19~34세 무주택 청년 및 주거비 지원 희망자",
    isDataEstimated: false,
    evaluatedAt: new Date().toISOString(),
  };

  // ----------------------------------------------------------------
  // STEP 4.5: POLICY SOURCE RESOLVER
  // ----------------------------------------------------------------
  console.log("----------------------------------------------------------------");
  console.log("▶ [STEP 4.5] POLICY SOURCE RESOLVER 실행");
  console.log("----------------------------------------------------------------");
  const isPolicy = policySourceResolver.isPolicyKeyword(targetKeyword, category);
  console.log(`  - 정책성 키워드 자동 감지: ${isPolicy ? "DETECTED (PASS)" : "FAILED"}`);

  const pack = policySourceResolver.resolve(targetKeyword, category);
  if (!pack) {
    throw new Error("POLICY SOURCE RESOLVER가 Source Pack을 반환하지 못했습니다.");
  }
  console.log(`  - 공식 제도명: [${pack.officialPolicyName}]`);
  console.log(`  - 유효성 상태: [${pack.currentStatus}]`);

  // ----------------------------------------------------------------
  // STEP 4.6: POLICY TEMPORAL VALIDATOR
  // ----------------------------------------------------------------
  console.log("\n----------------------------------------------------------------");
  console.log("▶ [STEP 4.6] POLICY TEMPORAL VALIDATOR 실행");
  console.log("----------------------------------------------------------------");
  const temporalResult = policyTemporalValidator.validate(pack, currentDate);
  pack.temporalValidation = temporalResult;

  console.log(`  - 기준 일자: ${temporalResult.currentDate}`);
  console.log(`  - 정기 집중 신청 기간 종료 여부: ${temporalResult.isExpired ? "EXPIRED (종료됨)" : "ACTIVE"}`);
  console.log(`  - 접수 기간 상태: [${temporalResult.applicationPeriodStatus}]`);
  console.log(`  - 감지된 과거 규정(Auto-Promotion 방지): ${temporalResult.oldRulesDetected.length}건`);
  temporalResult.oldRulesDetected.forEach((r) => {
    console.log(`    * [${r.field}]: 과거 [${r.oldValue}] -> 현행 [${r.currentValue}]`);
  });
  console.log(`  - 시점 유효성 경고: ${temporalResult.warnings.length}건`);

  // ----------------------------------------------------------------
  // STEP 4.7: OFFICIAL SOURCE EVIDENCE ENGINE
  // ----------------------------------------------------------------
  console.log("\n----------------------------------------------------------------");
  console.log("▶ [STEP 4.7] OFFICIAL SOURCE EVIDENCE ENGINE 실행");
  console.log("----------------------------------------------------------------");
  const evidenceOutput = await officialSourceEvidenceEngine.execute(targetKeyword, pack, currentDate);
  pack.evidenceEngineOutput = evidenceOutput;

  console.log(`  - 확보된 공식 문서 수: ${evidenceOutput.evidences.length}개`);
  evidenceOutput.evidences.forEach((ev, idx) => {
    console.log(`    [문서 ${idx + 1}] [${ev.documentType}] ${ev.sourceOrganization}`);
    console.log(`      * 제목: ${ev.sourceTitle}`);
    console.log(`      * URL: ${ev.sourceUrl}`);
    console.log(`      * 수집방식: ${ev.extractionMethod} (isLive: ${ev.isLiveRetrieved}, isFixture: ${ev.isFixture})`);
    console.log(`      * 해시: ${ev.contentHash.slice(0, 16)}...`);
  });

  console.log(`  - 13대 핵심 주장(Claims) 근거 매핑 결과:`);
  let verifiedClaimsCount = 0;
  evidenceOutput.claims.forEach((cl, idx) => {
    const isV = cl.verificationStatus === "VERIFIED";
    if (isV) verifiedClaimsCount++;
    console.log(`    [주장 ${idx + 1}] [${cl.verificationStatus}] ${cl.claimKey}: ${cl.claimedValue}`);
    console.log(`      * 연결 Evidence IDs: [${cl.evidenceIds.join(", ") || "없음"}]`);
    console.log(`      * 시점상태: [${cl.temporalStatus}], 신청자유형: [${cl.applicantType}]`);
    console.log(`      * 검증근거: ${cl.verificationReason}`);
  });
  console.log(`  - 검증 완료율: ${verifiedClaimsCount} / ${evidenceOutput.claims.length}건 VERIFIED`);

  // ----------------------------------------------------------------
  // STEP 5: CONTENT WRITER
  // ----------------------------------------------------------------
  console.log("\n----------------------------------------------------------------");
  console.log("▶ [STEP 5] CONTENT WRITER 초안 작성 (Evidence Engine 데이터 반영)");
  console.log("----------------------------------------------------------------");
  const writer = new ContentWriterAgent();
  const writerOutput = await writer.write({
    evaluatedKeyword,
    policySourcePack: pack,
  });
  const draft = writerOutput.draft;
  console.log(`  - 초안 제목: "${draft.draftTitle}"`);
  console.log(`  - 글자 수: ${draft.wordCount}자`);

  // ----------------------------------------------------------------
  // STEP 6: FACT CHECKER (Article Claim -> Evidence Chain 검증)
  // ----------------------------------------------------------------
  console.log("\n----------------------------------------------------------------");
  console.log("▶ [STEP 6] FACT CHECKER 연동 및 전수 사실 검증");
  console.log("----------------------------------------------------------------");
  const factChecker = new FactCheckerAgent();
  const factReport = await factChecker.check({
    draft,
    category,
    keyword: targetKeyword,
    searchIntent: evaluatedKeyword.searchIntent,
    policySourcePack: pack,
  });

  console.log(`  - FACT CHECKER 판정 상태: [${factReport.status}]`);
  console.log(`  - 전체 Claims: ${factReport.claimCount}건 (VERIFIED: ${factReport.verifiedCount}, REVISE: ${factReport.reviseCount}, REJECT: ${factReport.rejectCount})`);

  // ----------------------------------------------------------------
  // STEP 7: SEO EDITOR
  // ----------------------------------------------------------------
  console.log("\n----------------------------------------------------------------");
  console.log("▶ [STEP 7] SEO EDITOR 검수 실행");
  console.log("----------------------------------------------------------------");
  const seoEditor = new SeoEditorAgent();
  const seoResult = await seoEditor.edit({
    draft,
    category,
    primaryKeyword: targetKeyword,
    searchIntent: evaluatedKeyword.searchIntent,
    policySourcePack: pack,
  });
  console.log(`  - SEO Editor 판정: [${seoResult.status}] (점수: ${seoResult.reviewScore}점)`);

  // ----------------------------------------------------------------
  // 실전 검증 7대 체크포인트 검증 (Section 6 요구사항 전수 확인)
  // ----------------------------------------------------------------
  console.log("\n================================================================");
  console.log("🔍 [SECTION 6: 실전 검증 7대 핵심 체크포인트 전수 확인]");
  console.log("================================================================");

  // 1. 2026년 적용 정책 구체적 공식 문서 실제로 확보 여부
  const chk1_officialDocsAcquired =
    evidenceOutput.evidences.length >= 2 &&
    evidenceOutput.evidences.some((e) => e.documentType === "PRESS_RELEASE") &&
    evidenceOutput.evidences.some((e) => !officialSourceEvidenceEngine.isRootDomainOnly(e.sourceUrl));
  console.log(`1. 2026년 적용 구체적 공식 문서 확보: ${chk1_officialDocsAcquired ? "✅ PASS" : "❌ FAIL"}`);

  // 2. 신청 기간이 실제 공식 문서에 명시되어 있는가?
  const chk2_appPeriodSpecified = evidenceOutput.claims.some(
    (c) => c.claimKey === "APPLICATION_PERIOD" && c.evidenceIds.length > 0 && c.verificationStatus === "VERIFIED"
  );
  console.log(`2. 실제 공식 문서상 신청 기간 명시: ${chk2_appPeriodSpecified ? "✅ PASS" : "❌ FAIL"}`);

  // 3. 월 지원액(20만 원)과 지원 기간(24개월)이 실제 근거 문장으로 확인되는가?
  const chk3_amountPeriodConfirmed =
    evidenceOutput.claims.some((c) => c.claimKey === "SUPPORT_AMOUNT" && c.verificationStatus === "VERIFIED") &&
    evidenceOutput.claims.some((c) => c.claimKey === "SUPPORT_PERIOD_TOTAL" && c.verificationStatus === "VERIFIED");
  console.log(`3. 월 지원액(20만 원) 및 지원 기간(24개월) 근거 문장 확인: ${chk3_amountPeriodConfirmed ? "✅ PASS" : "❌ FAIL"}`);

  // 4. 청약통장 조건이 2026년 적용 규칙(폐지)으로 확인되는가?
  const chk4_subscriptionAbolishedConfirmed = evidenceOutput.claims.some(
    (c) => c.claimKey === "HOUSING_SUBSCRIPTION" && c.claimedValue.includes("폐지") && c.verificationStatus === "VERIFIED"
  );
  console.log(`4. 청약통장 조건 2026년 적용 규칙(폐지) 확인: ${chk4_subscriptionAbolishedConfirmed ? "✅ PASS" : "❌ FAIL"}`);

  // 5. 기존 수혜자와 신규 신청자 규칙이 구분되는가?
  const chk5_beneficiaryDistinction = evidenceOutput.claims.some(
    (c) => c.claimKey === "BENEFICIARY_RULES" && c.applicantType === "EXISTING_BENEFICIARY" && c.verificationStatus === "VERIFIED"
  );
  console.log(`5. 기존 수혜자와 신규 신청자 규칙 구분 확인: ${chk5_beneficiaryDistinction ? "✅ PASS" : "❌ FAIL"}`);

  // 6. 과거 사업 안내를 현재 규칙으로 잘못 적용하지 않았는가?
  const fullDraftText = draft.sections.map((s) => s.content).join(" ") + " " + draft.introduction;
  const hasNoOldPeriodPromotion = !fullDraftText.includes("12개월(총 240만 원) 지원") && !fullDraftText.includes("청약통장 필수 가입");
  console.log(`6. 과거 사업 안내 오인 및 자동 승격 배제: ${hasNoOldPeriodPromotion ? "✅ PASS" : "❌ FAIL"}`);

  // 7. 확보한 원문에 없는 정보를 모델이 임의로 추가하지 않았는가?
  const chk7_noHallucination = factReport.status !== "REJECT" && factReport.rejectCount === 0;
  console.log(`7. 원문에 없는 임의 정보 환각 방지 확인: ${chk7_noHallucination ? "✅ PASS" : "❌ FAIL"}`);

  // ----------------------------------------------------------------
  // 운영 데이터 불변성 검증
  // ----------------------------------------------------------------
  const countsAfter = getBaseline();
  const dbUntouched =
    initialCounts.articles === countsAfter.articles &&
    initialCounts.queue === countsAfter.queue &&
    initialCounts.drafts === countsAfter.drafts;
  console.log(`\n8. 운영 데이터 무결성 보존: ${dbUntouched ? "✅ PASS (0건 변동)" : "❌ FAIL"}`);

  const allPassed =
    chk1_officialDocsAcquired &&
    chk2_appPeriodSpecified &&
    chk3_amountPeriodConfirmed &&
    chk4_subscriptionAbolishedConfirmed &&
    chk5_beneficiaryDistinction &&
    hasNoOldPeriodPromotion &&
    chk7_noHallucination &&
    dbUntouched;

  console.log("\n================================================================");
  if (allPassed) {
    console.log("🏁 최종 종합 판정: [OFFICIAL SOURCE EVIDENCE ENGINE VALIDATION PASS]");
  } else {
    throw new Error("Section 6 Validation failed");
  }
  console.log("================================================================\n");
}

runOfficialSourceEvidenceValidation().catch((err) => {
  console.error("검증 실행 중 오류:", err);
  process.exit(1);
});
